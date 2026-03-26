/**
 * WatchPeptideNotificationManager
 *
 * Handles UNNotificationCenter for peptide injection reminders.
 * Registers the PEPTIDE_DOSE_REMINDER category with two actions:
 *   LOG_NOW_ACTION  — foreground: opens QuickLogView and fires confirmDoseLog
 *   SNOOZE_ACTION   — background: reschedules 30 minutes later
 *
 * scheduledDoseTimes (ms since epoch) are sent from the phone in the PEPTIDE
 * context. Up to 7 notifications are scheduled to stay within watchOS limits.
 */
import Foundation
import UserNotifications

class WatchPeptideNotificationManager: NSObject {

  static let shared = WatchPeptideNotificationManager()

  private let categoryId = "PEPTIDE_DOSE_REMINDER"
  private let logNowActionId = "LOG_NOW_ACTION"
  private let snoozeActionId = "SNOOZE_ACTION"
  private let notificationIdPrefix = "pepmax_peptide_dose_"
  private let snoozeNotificationId = "pepmax_peptide_snooze"

  // Hydration
  private let hydrationCategoryId = "HYDRATION_REMINDER"
  private let logWaterActionId = "LOG_WATER_ACTION"
  private let hydrationNotificationIdPrefix = "pepmax_hydration_"

  private override init() {
    super.init()
  }

  // MARK: - Setup

  func requestAuthorization() {
    UNUserNotificationCenter.current().requestAuthorization(
      options: [.alert, .sound, .badge]
    ) { granted, error in
      if let error = error {
        NSLog("[WatchPeptideNotificationManager] Auth error: %@", error.localizedDescription)
      }
      NSLog("[WatchPeptideNotificationManager] Notifications authorized: %d", granted)
    }
  }

  func registerCategories() {
    let logNow = UNNotificationAction(
      identifier: logNowActionId,
      title: "Log Now",
      options: .foreground
    )
    let snooze = UNNotificationAction(
      identifier: snoozeActionId,
      title: "Snooze 30m",
      options: []
    )
    let peptideCategory = UNNotificationCategory(
      identifier: categoryId,
      actions: [logNow, snooze],
      intentIdentifiers: [],
      options: []
    )

    // Hydration category with a quick "Log 8 oz" foreground action
    let logWater = UNNotificationAction(
      identifier: logWaterActionId,
      title: "Log 8 oz",
      options: .foreground
    )
    let hydrationCategory = UNNotificationCategory(
      identifier: hydrationCategoryId,
      actions: [logWater],
      intentIdentifiers: [],
      options: []
    )

    UNUserNotificationCenter.current().setNotificationCategories([peptideCategory, hydrationCategory])
  }

  // MARK: - Hydration Reminders

  /// Remove old hydration notifications and schedule new ones at the specified interval.
  /// Caps at 7 notifications to respect watchOS limits.
  func scheduleHydrationReminders(intervalHours: Int, currentOz: Double, goalOz: Double) {
    let center = UNUserNotificationCenter.current()

    // Remove old hydration notifications
    center.getPendingNotificationRequests { [weak self] requests in
      guard let self = self else { return }
      let hydrationIds = requests
        .filter { $0.identifier.hasPrefix(self.hydrationNotificationIdPrefix) }
        .map(\.identifier)
      center.removePendingNotificationRequests(withIdentifiers: hydrationIds)

      guard intervalHours > 0 else { return }
      let maxReminders = 7

      for i in 0..<maxReminders {
        let intervalSeconds = Double(intervalHours * 3600 * (i + 1))

        let content = UNMutableNotificationContent()
        content.title = "Time to hydrate 💧"
        content.body = "Don't forget to stay hydrated!"
        content.sound = .default
        content.categoryIdentifier = self.hydrationCategoryId

        let trigger = UNTimeIntervalNotificationTrigger(
          timeInterval: intervalSeconds,
          repeats: false
        )
        let request = UNNotificationRequest(
          identifier: "\(self.hydrationNotificationIdPrefix)\(i)",
          content: content,
          trigger: trigger
        )
        center.add(request) { error in
          if let error = error {
            NSLog("[WatchPeptideNotificationManager] Hydration schedule error: %@", error.localizedDescription)
          }
        }
      }
    }
  }

  // MARK: - Hydration Action Handler

  private func handleLogWater() {
    DispatchQueue.main.async {
      let newTotal = (WatchStateManager.shared.nutrition.waterOz ?? 0) + 8
      WatchStateManager.shared.updateLocalWater(newTotalOz: newTotal)
      WatchSessionManager.shared.sendMessageToPhone([
        "type": "WATER_LOGGED",
        "ozLogged": 8.0,
        "totalOz": newTotal,
        "timestamp": Date().timeIntervalSince1970 * 1000
      ])
    }
  }

  // MARK: - Schedule

  /// Remove existing peptide dose notifications and schedule new ones from state.
  /// Caps at 7 notifications to respect watchOS limits.
  func scheduleReminders(from state: WatchPeptideState) {
    let center = UNUserNotificationCenter.current()

    // Remove all previously scheduled peptide notifications
    center.getPendingNotificationRequests { [weak self] requests in
      guard let self = self else { return }
      let peptideIds = requests
        .filter { $0.identifier.hasPrefix(self.notificationIdPrefix) }
        .map(\.identifier)
      center.removePendingNotificationRequests(withIdentifiers: peptideIds)

      // Schedule new ones
      guard let times = state.scheduledDoseTimes, !times.isEmpty else { return }
      let now = Date().timeIntervalSince1970 * 1000
      let futureTimes = times.filter { $0 > now }
      let capped = Array(futureTimes.prefix(7))

      let site = WatchPeptideManager.shared.suggestedSite(from: state)
      let compound = state.compoundName.isEmpty ? "Peptide" : state.compoundName
      let dose = state.doseAmount.isEmpty ? "" : "\(state.doseAmount) \(state.unit ?? "mcg")"

      for (i, ms) in capped.enumerated() {
        let fireDate = Date(timeIntervalSince1970: ms / 1000.0)
        let interval = fireDate.timeIntervalSinceNow
        guard interval > 0 else { continue }

        let content = UNMutableNotificationContent()
        content.title = "\(compound) dose due"
        content.body = dose.isEmpty
          ? "Suggested site: \(site.displayName)"
          : "\(dose) · Suggested site: \(site.displayName)"
        content.sound = .default
        content.categoryIdentifier = self.categoryId

        let trigger = UNTimeIntervalNotificationTrigger(
          timeInterval: interval,
          repeats: false
        )
        let request = UNNotificationRequest(
          identifier: "\(self.notificationIdPrefix)\(i)",
          content: content,
          trigger: trigger
        )
        center.add(request) { error in
          if let error = error {
            NSLog("[WatchPeptideNotificationManager] Schedule error: %@", error.localizedDescription)
          }
        }
      }
    }
  }

  // MARK: - Action Handlers

  /// Called when user taps "Log Now" in the notification — fires confirmDoseLog with current state.
  func handleLogNow(state: WatchPeptideState) {
    WatchPeptideManager.shared.prepareDoseLog(from: state)
    WatchPeptideManager.shared.confirmDoseLog(state: state)
  }

  /// Called when user taps "Snooze 30m" — schedules a new notification 30 minutes from now.
  func handleSnooze(state: WatchPeptideState) {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [snoozeNotificationId])

    let compound = state.compoundName.isEmpty ? "Peptide" : state.compoundName
    let dose = state.doseAmount.isEmpty ? "" : "\(state.doseAmount) \(state.unit ?? "mcg")"
    let site = WatchPeptideManager.shared.suggestedSite(from: state)

    let content = UNMutableNotificationContent()
    content.title = "\(compound) dose (snoozed)"
    content.body = dose.isEmpty
      ? "Suggested site: \(site.displayName)"
      : "\(dose) · Suggested site: \(site.displayName)"
    content.sound = .default
    content.categoryIdentifier = categoryId

    let trigger = UNTimeIntervalNotificationTrigger(
      timeInterval: 30 * 60,
      repeats: false
    )
    let request = UNNotificationRequest(
      identifier: snoozeNotificationId,
      content: content,
      trigger: trigger
    )
    center.add(request) { error in
      if let error = error {
        NSLog("[WatchPeptideNotificationManager] Snooze schedule error: %@", error.localizedDescription)
      }
    }
  }
}

// MARK: - UNUserNotificationCenterDelegate

extension WatchPeptideNotificationManager: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let categoryId = response.notification.request.content.categoryIdentifier

    if categoryId == hydrationCategoryId {
      switch response.actionIdentifier {
      case logWaterActionId:
        handleLogWater()
      default:
        break
      }
    } else {
      let state = WatchStateManager.shared.peptide
      switch response.actionIdentifier {
      case logNowActionId:
        handleLogNow(state: state)
      case snoozeActionId:
        handleSnooze(state: state)
      default:
        break
      }
    }

    completionHandler()
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound])
  }
}
