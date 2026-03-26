import SwiftUI
import UserNotifications

@main
struct PepMaxWatchApp: App {

  @StateObject private var sessionManager = WatchSessionManager.shared
  @StateObject private var stateManager = WatchStateManager.shared
  @StateObject private var workoutManager = WatchWorkoutManager.shared
  @StateObject private var cardioManager = WatchCardioManager.shared
  @StateObject private var peptideManager = WatchPeptideManager.shared

  init() {
    WatchSessionManager.shared.activate()

    // Wire peptide notification manager
    let notifCenter = UNUserNotificationCenter.current()
    notifCenter.delegate = WatchPeptideNotificationManager.shared
    WatchPeptideNotificationManager.shared.requestAuthorization()
    WatchPeptideNotificationManager.shared.registerCategories()

    // Wire WatchSessionManager → WatchStateManager forwarding.
    // All parseContext calls are already dispatched to main; forward stays on main.
    WatchSessionManager.shared.onContextParsed = { type, context in
      WatchStateManager.shared.handleParsedContext(type: type, context: context)

      // When phone sends an active workout payload, start the workout on the watch.
      if type == "ACTIVE_WORKOUT" {
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .millisecondsSince1970
        guard let data = try? JSONSerialization.data(withJSONObject: context),
              let decoded = try? dec.decode(WatchActiveWorkout.self, from: data),
              WatchWorkoutManager.shared.phase == .idle else { return }
        WatchWorkoutManager.shared.startWorkout(decoded)
      }

      // Sync cardio settings (maxHR, distanceUnit, autoPause) from phone profile.
      if type == "CARDIO" {
        let maxHR = context["maxHeartRate"] as? Int ?? 0
        let unit = context["distanceUnit"] as? String ?? "mi"
        let autoPause = context["autoPauseEnabled"] as? Bool ?? true
        WatchCardioManager.shared.syncedMaxHR = maxHR
        WatchCardioManager.shared.distanceUnit = unit
        WatchCardioManager.shared.autoPauseEnabled = autoPause
      }

    }
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(sessionManager)
        .environmentObject(stateManager)
        .environmentObject(workoutManager)
        .environmentObject(cardioManager)
        .environmentObject(peptideManager)
    }
  }
}
