/**
 * WatchCardioManager
 *
 * Central state machine for an independent watch cardio session.
 * Uses HKWorkoutSession + HKLiveWorkoutBuilder for real-time HR/calorie data
 * and LocationManager for GPS breadcrumbs (outdoor sessions only).
 *
 * State machine: idle → setup → active ↔ paused → summary → idle
 *
 * Watch → Phone: CARDIO_SESSION_COMPLETE payload via sendMessageToPhone (real-time)
 *                Falls back to transferUserInfoToPhone (guaranteed delivery when unreachable)
 *                Also persists to UserDefaults for crash recovery.
 *
 * HR Zone colors: 1=gray #808080, 2=blue #2980B9, 3=green #27AE60,
 *                 4=orange #E67E22, 5=red #E74C3C
 */
import Foundation
import HealthKit
import WatchKit
import Combine
import AVFoundation
import CoreLocation

// MARK: - HR Zone Definitions

private struct HRZone {
  let zone: Int
  let name: String
  let color: String
  let minPct: Double
  let maxPct: Double
}

private let hrZones: [HRZone] = [
  HRZone(zone: 1, name: "Easy",      color: "808080", minPct: 0.00, maxPct: 0.60),
  HRZone(zone: 2, name: "Aerobic",   color: "2980B9", minPct: 0.60, maxPct: 0.70),
  HRZone(zone: 3, name: "Cardio",    color: "27AE60", minPct: 0.70, maxPct: 0.80),
  HRZone(zone: 4, name: "Threshold", color: "E67E22", minPct: 0.80, maxPct: 0.90),
  HRZone(zone: 5, name: "Max",       color: "E74C3C", minPct: 0.90, maxPct: 1.00),
]

// MARK: - Haversine Distance

private func haversineDistanceMeters(
  _ lat1: Double, _ lon1: Double,
  _ lat2: Double, _ lon2: Double
) -> Double {
  let R = 6371000.0
  let φ1 = lat1 * .pi / 180
  let φ2 = lat2 * .pi / 180
  let Δφ = (lat2 - lat1) * .pi / 180
  let Δλ = (lon2 - lon1) * .pi / 180
  let a = sin(Δφ / 2) * sin(Δφ / 2)
    + cos(φ1) * cos(φ2) * sin(Δλ / 2) * sin(Δλ / 2)
  let c = 2 * atan2(sqrt(a), sqrt(1 - a))
  return R * c
}

// MARK: - WatchCardioManager

class WatchCardioManager: ObservableObject {

  static let shared = WatchCardioManager()
  private init() {
    subscribeToLocation()
    // Retry any sessions queued while phone was unreachable
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onReachabilityChanged),
      name: NSNotification.Name("WatchSessionManagerReachabilityChanged"),
      object: nil
    )
  }

  // MARK: - Published State

  @Published var phase: WatchCardioPhase = .idle
  @Published var activityType: WatchCardioActivityType = .run
  @Published var isIndoor: Bool = false
  @Published var target: WatchCardioTarget = .none

  // Live metrics
  @Published var elapsedSeconds: Double = 0
  @Published var distance: Double = 0         // meters
  @Published var currentPace: Double = 0      // sec/km, 0 = no pace yet
  @Published var averagePace: Double = 0      // sec/km
  @Published var heartRate: Int = 0
  @Published var currentHRZone: Int = 0       // 1-5, 0 = no HR
  @Published var calories: Double = 0
  @Published var elevationGain: Double = 0
  @Published var elevationLoss: Double = 0
  @Published var splits: [WatchCardioSplit] = []
  @Published var autoPauseActive: Bool = false

  // Summary
  @Published var sessionResult: WatchCardioSessionResult?

  // MARK: - Configuration

  /// maxHR synced from phone profile (set by PepMaxWatchApp); 0 = use default
  var syncedMaxHR: Int = 0
  /// Distance unit: "mi" or "km"
  var distanceUnit: String = "mi"
  /// Auto-pause enabled
  var autoPauseEnabled: Bool = true
  /// Audio split announcements enabled (user-configurable via settings)
  var audioSplitsEnabled: Bool = true

  // MARK: - Private

  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?
  private var workoutBuilder: HKLiveWorkoutBuilder?

  private var elapsedTimer: Timer?
  private var startDate: Date?
  private var pauseDate: Date?
  private var totalPausedSeconds: Double = 0

  // GPS
  private var locationCancellable: AnyCancellable?
  private var lastRouteLocation: CLLocation?
  // Rolling speed buffer for auto-pause detection
  private var recentSpeeds: [Double] = []
  private var autoPauseCheckCount: Int = 0

  // Splits
  private var splitDistanceAccumulator: Double = 0  // meters since last split
  private var splitElapsedAtLastSplit: Double = 0

  // HR
  private var hrSamples: [WatchCardioHRPoint] = []
  private var lastHRSampleTime: Date = .distantPast
  private var lastHRZone: Int = 0
  private var zoneAccumulators: [Int: Double] = [1: 0, 2: 0, 3: 0, 4: 0, 5: 0]
  private var lastZoneUpdateTime: Date = .distantPast

  // Pace rolling window (last 5 location points)
  private var pacePoints: [(time: Double, distance: Double)] = []

  // Audio
  private let synthesizer = AVSpeechSynthesizer()

  // Pending session queue (offline sync)
  private let defaults = UserDefaults(suiteName: "group.com.pepmax.watchapp") ?? .standard
  private let pendingQueueKey = "cardio_pending_sessions"

  // Snapshot captured at endSession() — used by buildAndSendResult so reset() can't corrupt it
  private struct SessionSnapshot {
    let startDate: Date
    let distance: Double
    let elapsedSeconds: Double
    let totalPausedSeconds: Double
    let averagePace: Double
    let splits: [WatchCardioSplit]
    let elevationGain: Double
    let elevationLoss: Double
    let isIndoor: Bool
    let activityType: WatchCardioActivityType
    let hrSamples: [WatchCardioHRPoint]
    let zoneAccumulators: [Int: Double]
    let calories: Double
  }
  private var sessionSnapshot: SessionSnapshot?

  // MARK: - Setup

  func configure(
    activityType: WatchCardioActivityType,
    indoor: Bool,
    target: WatchCardioTarget
  ) {
    self.activityType = activityType
    self.isIndoor = indoor
    self.target = target
  }

  // MARK: - Session Lifecycle

  func startSession() {
    guard phase == .idle || phase == .setup else { return }
    phase = .setup

    // Reset all metrics
    elapsedSeconds = 0
    distance = 0
    currentPace = 0
    averagePace = 0
    heartRate = 0
    currentHRZone = 0
    calories = 0
    elevationGain = 0
    elevationLoss = 0
    splits = []
    autoPauseActive = false
    hrSamples = []
    pacePoints = []
    recentSpeeds = []
    autoPauseCheckCount = 0
    splitDistanceAccumulator = 0
    splitElapsedAtLastSplit = 0
    totalPausedSeconds = 0
    sessionResult = nil
    zoneAccumulators = [1: 0, 2: 0, 3: 0, 4: 0, 5: 0]
    startDate = Date()
    lastZoneUpdateTime = Date()

    startHKWorkoutSession()
  }

  func pauseSession() {
    guard phase == .active else { return }
    pauseDate = Date()
    workoutSession?.pause()
    stopElapsedTimer()
    if !isIndoor { LocationManager.shared.stopTracking() }
    // Flush zone time before pause
    flushZoneTime()
    phase = .paused
    autoPauseActive = false
  }

  func resumeSession() {
    guard phase == .paused else { return }
    if let pd = pauseDate {
      totalPausedSeconds += Date().timeIntervalSince(pd)
      pauseDate = nil
    }
    workoutSession?.resume()
    startElapsedTimer()
    // resumeTracking (not startTracking) — preserves breadcrumbs collected before the pause
    if !isIndoor { LocationManager.shared.resumeTracking() }
    lastZoneUpdateTime = Date()
    phase = .active
  }

  func endSession() {
    guard phase == .active || phase == .paused else { return }

    // Resume first if paused so HK builder can collect final data
    if phase == .paused, let pd = pauseDate {
      totalPausedSeconds += Date().timeIntervalSince(pd)
      pauseDate = nil
    }
    flushZoneTime()
    stopElapsedTimer()
    if !isIndoor { LocationManager.shared.stopTracking() }

    // Snapshot all session state NOW — before reset() or HK callbacks can race against us.
    // buildAndSendResult reads from this snapshot, not from self.
    sessionSnapshot = SessionSnapshot(
      startDate: startDate ?? Date(),
      distance: distance,
      elapsedSeconds: elapsedSeconds,
      totalPausedSeconds: totalPausedSeconds,
      averagePace: averagePace,
      splits: splits,
      elevationGain: elevationGain,
      elevationLoss: elevationLoss,
      isIndoor: isIndoor,
      activityType: activityType,
      hrSamples: hrSamples,
      zoneAccumulators: zoneAccumulators,
      calories: calories
    )

    phase = .summary
    endHKWorkoutSession()
  }

  func reset() {
    workoutSession = nil
    workoutBuilder = nil
    startDate = nil
    pauseDate = nil
    elapsedSeconds = 0
    distance = 0
    currentPace = 0
    averagePace = 0
    heartRate = 0
    currentHRZone = 0
    calories = 0
    elevationGain = 0
    elevationLoss = 0
    splits = []
    autoPauseActive = false
    sessionResult = nil
    hrSamples = []
    pacePoints = []
    recentSpeeds = []
    zoneAccumulators = [1: 0, 2: 0, 3: 0, 4: 0, 5: 0]
    LocationManager.shared.clearRoute()
    sessionSnapshot = nil
    phase = .idle
  }

  // MARK: - HealthKit

  private func startHKWorkoutSession() {
    let config = HKWorkoutConfiguration()
    config.activityType = hkActivityType(for: activityType)
    config.locationType = isIndoor ? .indoor : .outdoor

    let typesToShare: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKQuantityType(.activeEnergyBurned),
    ]
    let typesToRead: Set<HKObjectType> = [
      HKObjectType.workoutType(),
      HKQuantityType(.heartRate),
      HKQuantityType(.activeEnergyBurned),
      HKQuantityType(.distanceWalkingRunning),
      HKQuantityType(.distanceCycling),
    ]

    healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { [weak self] granted, _ in
      guard let self = self, granted else {
        DispatchQueue.main.async { self?.phase = .idle }
        return
      }

      DispatchQueue.main.async {
        do {
          let session = try HKWorkoutSession(healthStore: self.healthStore, configuration: config)
          let builder = session.associatedWorkoutBuilder()
          builder.dataSource = HKLiveWorkoutDataSource(
            healthStore: self.healthStore,
            workoutConfiguration: config
          )
          session.delegate = self
          builder.delegate = self
          self.workoutSession = session
          self.workoutBuilder = builder
          session.startActivity(with: self.startDate ?? Date())
          builder.beginCollection(withStart: self.startDate ?? Date()) { _, _ in }
        } catch {
          NSLog("[WatchCardioManager] Failed to start HK session: %@", error.localizedDescription)
          self.phase = .idle
          return
        }

        if !self.isIndoor {
          LocationManager.shared.requestAuthorization()
          LocationManager.shared.startTracking()
        }
        self.startElapsedTimer()
        self.phase = .active
      }
    }
  }

  private func endHKWorkoutSession() {
    let end = Date()
    workoutBuilder?.endCollection(withEnd: end) { [weak self] _, _ in
      self?.workoutBuilder?.finishWorkout { [weak self] _, _ in
        DispatchQueue.main.async {
          self?.buildAndSendResult()
        }
      }
    }
    workoutSession?.end()
  }

  private func hkActivityType(for type: WatchCardioActivityType) -> HKWorkoutActivityType {
    switch type {
    case .run:    return .running
    case .walk:   return .walking
    case .cycle:  return .cycling
    case .hike:   return .hiking
    case .custom: return .other
    }
  }

  // MARK: - GPS Processing

  private func subscribeToLocation() {
    locationCancellable = LocationManager.shared.$currentLocation
      .compactMap { $0 }
      .receive(on: DispatchQueue.main)
      .sink { [weak self] location in
        self?.processLocationUpdate(location)
      }
  }

  private func processLocationUpdate(_ location: CLLocation) {
    guard phase == .active, !isIndoor else { return }

    // Update elevation from LocationManager's accumulators
    elevationGain = LocationManager.shared.elevationGainAccum
    elevationLoss = LocationManager.shared.elevationLossAccum

    // Distance and pace
    if let last = lastRouteLocation {
      let delta = haversineDistanceMeters(
        last.coordinate.latitude, last.coordinate.longitude,
        location.coordinate.latitude, location.coordinate.longitude
      )
      // Sanity check: ignore teleports (> 100m in one update)
      if delta < 100 {
        distance += delta
        splitDistanceAccumulator += delta
        checkSplitThreshold()
      }

      // Rolling pace (last 5 points)
      let now = elapsedSeconds
      pacePoints.append((time: now, distance: distance))
      if pacePoints.count > 5 { pacePoints.removeFirst() }
      if pacePoints.count >= 2 {
        let timeDelta = pacePoints.last!.time - pacePoints.first!.time
        let distDelta = pacePoints.last!.distance - pacePoints.first!.distance
        if timeDelta > 0 && distDelta > 0 {
          currentPace = timeDelta / (distDelta / 1000.0)  // sec/km
        }
      }
      // Average pace
      if distance > 0 {
        averagePace = elapsedSeconds / (distance / 1000.0)
      }
    }
    lastRouteLocation = location

    // Auto-pause check
    if autoPauseEnabled {
      let speed = location.speed >= 0 ? location.speed : 0
      recentSpeeds.append(speed)
      if recentSpeeds.count > 8 { recentSpeeds.removeFirst() }
      checkAutoPause()
    }
  }

  // MARK: - Splits

  private func checkSplitThreshold() {
    let threshold: Double
    if distanceUnit == "mi" {
      threshold = 1609.34
    } else {
      threshold = 1000.0
    }

    while splitDistanceAccumulator >= threshold {
      splitDistanceAccumulator -= threshold
      let splitNum = splits.count + 1
      let splitElapsed = elapsedSeconds - splitElapsedAtLastSplit
      let splitPace = splitElapsed / (threshold / 1000.0)  // sec/km equivalent
      let split = WatchCardioSplit(
        splitNumber: splitNum,
        distance: threshold,
        time: splitElapsed,
        pace: splitPace,
        elevationChange: elevationGain - elevationLoss
      )
      splits.append(split)
      splitElapsedAtLastSplit = elapsedSeconds

      WKInterfaceDevice.current().play(.notification)
      if audioSplitsEnabled {
        speakSplit(split)
      }
    }
  }

  private func speakSplit(_ split: WatchCardioSplit) {
    let unitLabel = distanceUnit == "mi" ? "Mile" : "Kilometer"
    let mins = Int(split.time) / 60
    let secs = Int(split.time) % 60
    let timeStr = secs > 0 ? "\(mins) minutes \(secs) seconds" : "\(mins) minutes"
    let text = "\(unitLabel) \(split.splitNumber), \(timeStr)"

    let utterance = AVSpeechUtterance(string: text)
    utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
    utterance.rate = 0.5

    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
      try AVAudioSession.sharedInstance().setActive(true)
    } catch {
      NSLog("[WatchCardioManager] AVAudioSession error: %@", error.localizedDescription)
    }

    synthesizer.speak(utterance)
  }

  // MARK: - Auto-pause

  private func checkAutoPause() {
    guard autoPauseEnabled, phase == .active || phase == .paused else { return }
    let avgSpeed = recentSpeeds.isEmpty ? 0 : recentSpeeds.reduce(0, +) / Double(recentSpeeds.count)

    if phase == .active && avgSpeed < 0.3 && recentSpeeds.count >= 8 {
      autoPauseActive = true
      WKInterfaceDevice.current().play(.stop)
      pauseSession()
    } else if phase == .paused && autoPauseActive && avgSpeed > 0.5 {
      autoPauseActive = false
      WKInterfaceDevice.current().play(.start)
      resumeSession()
    }
  }

  // MARK: - HR Zone

  private func computeHRZone(bpm: Int) -> Int {
    let max = syncedMaxHR > 0 ? Double(syncedMaxHR) : 180.0
    let pct = Double(bpm) / max
    for zone in hrZones.reversed() {
      if pct >= zone.minPct { return zone.zone }
    }
    return 1
  }

  private func playZoneChangeHaptic(newZone: Int) {
    switch newZone {
    case 5:
      // Three rapid taps for max zone
      WKInterfaceDevice.current().play(.notification)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
        WKInterfaceDevice.current().play(.notification)
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
        WKInterfaceDevice.current().play(.notification)
      }
    case 4:
      // Two taps for threshold zone
      WKInterfaceDevice.current().play(.notification)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
        WKInterfaceDevice.current().play(.notification)
      }
    default:
      WKInterfaceDevice.current().play(.click)
    }
  }

  private func flushZoneTime() {
    guard currentHRZone > 0 else { return }
    let now = Date()
    let elapsed = now.timeIntervalSince(lastZoneUpdateTime)
    zoneAccumulators[currentHRZone, default: 0] += elapsed
    lastZoneUpdateTime = now
  }

  private func computeTimeInZones() -> [WatchCardioTimeInZone] {
    flushZoneTime()
    return hrZones.map { z in
      WatchCardioTimeInZone(
        zone: z.zone,
        name: z.name,
        seconds: zoneAccumulators[z.zone] ?? 0,
        color: z.color
      )
    }
  }

  // MARK: - Build & Send Result

  private func buildAndSendResult() {
    // Read from snapshot — never from self — so reset() cannot race and corrupt the result.
    guard let snap = sessionSnapshot else { return }
    let end = Date()

    var route = LocationManager.shared.getRoute()
    // Downsample if > 1000 points to stay under WCSession ~65KB limit
    if route.count > 1000 {
      let stride = max(1, route.count / 600)
      route = stride > 1 ? route.enumerated().compactMap { $0.offset % stride == 0 ? $0.element : nil } : route
    }

    let avgHR = snap.hrSamples.isEmpty ? nil : snap.hrSamples.map(\.bpm).reduce(0, +) / snap.hrSamples.count
    let maxHR = snap.hrSamples.isEmpty ? nil : snap.hrSamples.map(\.bpm).max()
    let zones: [WatchCardioTimeInZone] = hrZones.map { z in
      WatchCardioTimeInZone(
        zone: z.zone,
        name: z.name,
        seconds: snap.zoneAccumulators[z.zone] ?? 0,
        color: z.color
      )
    }

    let result = WatchCardioSessionResult(
      activityType: snap.activityType.rawValue,
      startedAt: snap.startDate.timeIntervalSince1970 * 1000,
      endedAt: end.timeIntervalSince1970 * 1000,
      distance: snap.distance,
      duration: snap.elapsedSeconds,
      totalPausedTime: snap.totalPausedSeconds,
      averagePace: snap.averagePace,
      splits: snap.splits,
      elevationGain: snap.elevationGain,
      elevationLoss: snap.elevationLoss,
      indoorMode: snap.isIndoor,
      route: route,
      calories: snap.calories,
      avgHeartRate: avgHR,
      maxHeartRate: maxHR,
      heartRateData: snap.hrSamples.isEmpty ? nil : snap.hrSamples,
      timeInZones: snap.hrSamples.isEmpty ? nil : zones
    )

    sessionResult = result
    sendSessionToPhone(result)
  }

  // MARK: - Sync to Phone

  private func sendSessionToPhone(_ result: WatchCardioSessionResult) {
    guard let payload = encodeResult(result) else { return }
    persistPendingSession(result)  // Always persist for crash safety

    // sendMessage has a practical limit (~65 KB). If the serialized payload
    // exceeds 60 KB, fall back to transferUserInfo (guaranteed delivery,
    // no hard size ceiling for typical session data).
    let payloadTooLarge: Bool = {
      let serialized = (try? JSONSerialization.data(withJSONObject: payload)) ?? Data()
      return serialized.count > 60_000
    }()

    if WCSession.default.isReachable && !payloadTooLarge {
      WatchSessionManager.shared.sendMessageToPhone(payload)
    } else {
      WatchSessionManager.shared.transferUserInfoToPhone(payload)
    }
  }

  private func encodeResult(_ result: WatchCardioSessionResult) -> [String: Any]? {
    guard let data = try? JSONEncoder().encode(result),
          var dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return nil
    }
    dict["type"] = "CARDIO_SESSION_COMPLETE"
    return dict
  }

  private func persistPendingSession(_ result: WatchCardioSessionResult) {
    guard let data = try? JSONEncoder().encode(result) else { return }
    var queue = defaults.array(forKey: pendingQueueKey) as? [Data] ?? []
    queue.append(data)
    // Keep at most 10 pending sessions
    if queue.count > 10 { queue = Array(queue.suffix(10)) }
    defaults.set(queue, forKey: pendingQueueKey)
  }

  @objc private func onReachabilityChanged() {
    guard WCSession.default.isReachable else { return }
    retryPendingSessions()
  }

  private func retryPendingSessions() {
    var queue = defaults.array(forKey: pendingQueueKey) as? [Data] ?? []
    guard !queue.isEmpty else { return }

    // Process each entry individually. Only remove an entry from the queue
    // after it has been successfully dispatched. Entries that cannot be sent
    // (phone unreachable) are collected in `remaining` and re-persisted so
    // they survive process termination mid-loop.
    var remaining: [Data] = []
    for data in queue {
      guard let result = try? JSONDecoder().decode(WatchCardioSessionResult.self, from: data),
            let payload = encodeResult(result) else { continue }
      if WCSession.default.isReachable {
        WatchSessionManager.shared.sendMessageToPhone(payload)
      } else {
        remaining.append(data)
      }
    }
    defaults.set(remaining, forKey: pendingQueueKey)
  }

  // MARK: - Elapsed Timer

  private func startElapsedTimer() {
    stopElapsedTimer()
    let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in
      guard let self = self, let start = self.startDate else { return }
      self.elapsedSeconds = Date().timeIntervalSince(start) - self.totalPausedSeconds
    }
    RunLoop.main.add(timer, forMode: .common)
    elapsedTimer = timer
  }

  private func stopElapsedTimer() {
    elapsedTimer?.invalidate()
    elapsedTimer = nil
  }
}

// MARK: - HKWorkoutSessionDelegate

extension WatchCardioManager: HKWorkoutSessionDelegate {
  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {
    NSLog("[WatchCardioManager] Session state: %ld → %ld", fromState.rawValue, toState.rawValue)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    NSLog("[WatchCardioManager] Session error: %@", error.localizedDescription)
    DispatchQueue.main.async { [weak self] in self?.phase = .idle }
  }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WatchCardioManager: HKLiveWorkoutBuilderDelegate {
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder,
    didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    for type in collectedTypes {
      guard let quantityType = type as? HKQuantityType else { continue }

      let stats = workoutBuilder.statistics(for: quantityType)

      DispatchQueue.main.async {
        switch quantityType.identifier {

        case HKQuantityTypeIdentifier.heartRate.rawValue:
          let hkBPM = stats?.mostRecentQuantity()?.doubleValue(for: .init(from: "count/min")) ?? 0
          let bpm = Int(hkBPM)
          guard bpm > 0 else { return }
          self.heartRate = bpm

          // Downsample: one HR point per 5 seconds
          let now = Date()
          if now.timeIntervalSince(self.lastHRSampleTime) >= 5 {
            self.hrSamples.append(WatchCardioHRPoint(
              timestamp: now.timeIntervalSince1970 * 1000,
              bpm: bpm
            ))
            self.lastHRSampleTime = now
          }

          // Zone update
          let newZone = self.computeHRZone(bpm: bpm)
          if newZone != self.lastHRZone {
            self.flushZoneTime()
            self.lastHRZone = newZone
            self.currentHRZone = newZone
            self.lastZoneUpdateTime = now
            if self.lastHRZone != 0 {
              self.playZoneChangeHaptic(newZone: newZone)
            }
          }

        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
          let kcal = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
          self.calories = kcal

        default:
          break
        }
      }
    }
  }
}
