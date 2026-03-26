/**
 * WatchWorkoutManager
 *
 * Central state machine for an active gym workout on the watch.
 * Distinct from WatchStateManager (read-only sync data) — this manages
 * mutable workout state: current exercise, current set, rest timer,
 * logged sets, and sends results back to the phone.
 *
 * Phone → Watch:  sends ACTIVE_WORKOUT payload via sendToWatch
 * Watch → Phone:  GYM_SET_LOGGED (per set) and GYM_WORKOUT_COMPLETE (finish)
 *                 via WatchSessionManager.sendMessageToPhone()
 */
import Foundation
import WatchKit
import WatchConnectivity
import Combine

enum WorkoutPhase {
  case idle
  case exercising
  case resting
  case summary
}

class WatchWorkoutManager: ObservableObject {

  static let shared = WatchWorkoutManager()

  // MARK: - Private Constants

  private let defaults = UserDefaults(suiteName: "group.com.pepmax.watchapp") ?? .standard
  private let pendingWorkoutKey = "workout_pending_session"

  private init() {
    // Retry any workout that was pending while the phone was unreachable
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onReachabilityChanged),
      name: NSNotification.Name("WatchSessionManagerReachabilityChanged"),
      object: nil
    )
    retryPendingWorkout()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Published State

  @Published var phase: WorkoutPhase = .idle
  @Published var workout: WatchActiveWorkout?
  @Published var currentExerciseIndex: Int = 0
  @Published var currentSetIndex: Int = 0

  /// Weight value bound to the Digital Crown (5 lb increments)
  @Published var adjustedWeight: Double = 0
  /// Reps value adjusted via +/- buttons
  @Published var adjustedReps: Int = 0

  /// Rest timer countdown
  @Published var restTimeRemaining: Int = 0
  @Published var restTimeTotal: Int = 90

  /// Elapsed workout seconds (for summary)
  @Published var elapsedSeconds: Int = 0

  // MARK: - Summary Data (populated on finish)

  @Published var summaryTotalVolume: Int = 0
  @Published var summaryDurationSeconds: Int = 0
  @Published var summarySetsCompleted: Int = 0
  @Published var summaryTotalSets: Int = 0

  // MARK: - Private

  private var restTimer: Timer?
  private var elapsedTimer: Timer?

  // MARK: - Computed Helpers

  var currentExercise: WatchWorkoutExercise? {
    guard let w = workout, currentExerciseIndex < w.exercises.count else { return nil }
    return w.exercises[currentExerciseIndex]
  }

  var nextExerciseName: String? {
    guard let w = workout else { return nil }
    let nextIdx = currentExerciseIndex + 1
    if nextIdx < w.exercises.count { return w.exercises[nextIdx].name }
    return nil
  }

  var isLastExercise: Bool {
    guard let w = workout else { return true }
    return currentExerciseIndex >= w.exercises.count - 1
  }

  var isLastSet: Bool {
    guard let ex = currentExercise else { return true }
    return currentSetIndex >= ex.targetSets - 1
  }

  // MARK: - Start

  func startWorkout(_ newWorkout: WatchActiveWorkout) {
    guard phase == .idle else { return }
    workout = newWorkout
    currentExerciseIndex = 0
    currentSetIndex = 0
    elapsedSeconds = 0
    prefillFromCurrentExercise()
    phase = .exercising
    startElapsedTimer()
  }

  // MARK: - Log Set

  func logSet() {
    guard var w = workout, phase == .exercising else { return }

    let loggedSet = WatchLoggedSet(
      weight: adjustedWeight,
      reps: adjustedReps,
      completedAt: Date()
    )

    w.exercises[currentExerciseIndex].logged.append(loggedSet)
    workout = w

    // Send to phone
    let payload: [String: Any] = [
      "type": "GYM_SET_LOGGED",
      "sessionId": w.sessionId,
      "exerciseIndex": currentExerciseIndex,
      "setIndex": currentSetIndex,
      "weight": adjustedWeight,
      "reps": adjustedReps,
      "completedAt": Date().timeIntervalSince1970 * 1000
    ]
    WatchSessionManager.shared.sendMessageToPhone(payload)

    // Check if all exercises complete
    if isLastSet && isLastExercise {
      stopElapsedTimer()
      buildSummary()
      phase = .summary
      return
    }

    // Start rest timer
    let restSecs = currentExercise?.restSeconds ?? 90
    startRestTimer(seconds: restSecs)
    phase = .resting
  }

  // MARK: - Skip Rest

  func skipRest() {
    stopRestTimer()
    advanceToNextSet()
    phase = .exercising
  }

  // MARK: - Skip Exercise

  func skipExercise() {
    guard let w = workout else { return }
    stopRestTimer()
    if currentExerciseIndex < w.exercises.count - 1 {
      currentExerciseIndex += 1
      currentSetIndex = 0
      prefillFromCurrentExercise()
      phase = .exercising
    } else {
      stopElapsedTimer()
      buildSummary()
      phase = .summary
    }
  }

  // MARK: - Finish Workout

  func finishWorkout() {
    stopRestTimer()
    stopElapsedTimer()
    buildSummary()

    guard let w = workout else {
      reset()
      return
    }

    let exercisesPayload: [[String: Any]] = w.exercises.map { ex in
      let loggedSets: [[String: Any]] = ex.logged.map { s in
        [
          "weight": s.weight,
          "reps": s.reps,
          "completedAt": s.completedAt.timeIntervalSince1970 * 1000
        ]
      }
      return ["name": ex.name, "logged": loggedSets]
    }

    let payload: [String: Any] = [
      "type": "GYM_WORKOUT_COMPLETE",
      "sessionId": w.sessionId,
      "exercises": exercisesPayload,
      "durationSeconds": summaryDurationSeconds,
      "totalVolume": summaryTotalVolume
    ]

    persistPendingWorkout(payload)

    if WCSession.default.isReachable {
      WatchSessionManager.shared.sendMessageToPhone(payload) { [weak self] in
        DispatchQueue.main.async { self?.clearPendingWorkout() }
      }
    } else {
      // transferUserInfoToPhone guarantees delivery — safe to clear immediately.
      WatchSessionManager.shared.transferUserInfoToPhone(payload)
      clearPendingWorkout()
    }

    phase = .summary
  }

  // MARK: - UserDefaults Crash Recovery

  private func persistPendingWorkout(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
    defaults.set(data, forKey: pendingWorkoutKey)
  }

  private func clearPendingWorkout() {
    defaults.removeObject(forKey: pendingWorkoutKey)
  }

  @objc private func onReachabilityChanged() {
    guard WCSession.default.isReachable else { return }
    retryPendingWorkout()
  }

  private func retryPendingWorkout() {
    guard let data = defaults.data(forKey: pendingWorkoutKey),
          let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return
    }
    if WCSession.default.isReachable {
      WatchSessionManager.shared.sendMessageToPhone(payload) { [weak self] in
        DispatchQueue.main.async { self?.clearPendingWorkout() }
      }
    }
  }

  // MARK: - Reset

  func reset() {
    stopRestTimer()
    stopElapsedTimer()
    workout = nil
    currentExerciseIndex = 0
    currentSetIndex = 0
    adjustedWeight = 0
    adjustedReps = 0
    restTimeRemaining = 0
    restTimeTotal = 90
    elapsedSeconds = 0
    summaryTotalVolume = 0
    summaryDurationSeconds = 0
    summarySetsCompleted = 0
    summaryTotalSets = 0
    phase = .idle
  }

  // MARK: - Private Helpers

  private func prefillFromCurrentExercise() {
    guard let ex = currentExercise else { return }
    adjustedWeight = ex.targetWeight
    adjustedReps = ex.targetReps
  }

  private func advanceToNextSet() {
    guard let w = workout else { return }
    if isLastSet {
      // Advance to next exercise
      if currentExerciseIndex < w.exercises.count - 1 {
        currentExerciseIndex += 1
        currentSetIndex = 0
        prefillFromCurrentExercise()
      }
    } else {
      currentSetIndex += 1
      // Keep weight from last set, keep target reps
      adjustedReps = currentExercise?.targetReps ?? adjustedReps
    }
  }

  private func buildSummary() {
    guard let w = workout else { return }
    summaryDurationSeconds = elapsedSeconds
    summaryTotalVolume = w.exercises.reduce(0) { total, ex in
      total + ex.logged.reduce(0) { $0 + Int($1.weight) * $1.reps }
    }
    summarySetsCompleted = w.exercises.reduce(0) { $0 + $1.logged.count }
    summaryTotalSets = w.exercises.reduce(0) { $0 + $1.targetSets }
  }

  // MARK: - Timers

  private func startRestTimer(seconds: Int) {
    stopRestTimer()
    restTimeTotal = seconds
    restTimeRemaining = seconds
    let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
      guard let self = self else { return }
      if self.restTimeRemaining > 0 {
        self.restTimeRemaining -= 1
      } else {
        self.stopRestTimer()
        WKInterfaceDevice.current().play(.notification)
        self.advanceToNextSet()
        self.phase = .exercising
      }
    }
    RunLoop.main.add(timer, forMode: .common)
    restTimer = timer
  }

  private func stopRestTimer() {
    restTimer?.invalidate()
    restTimer = nil
  }

  private func startElapsedTimer() {
    stopElapsedTimer()
    let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
      self?.elapsedSeconds += 1
    }
    RunLoop.main.add(timer, forMode: .common)
    elapsedTimer = timer
  }

  private func stopElapsedTimer() {
    elapsedTimer?.invalidate()
    elapsedTimer = nil
  }
}
