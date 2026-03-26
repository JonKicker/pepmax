/**
 * WatchPeptideManager
 *
 * Singleton ObservableObject state machine for logging a peptide dose on the watch.
 * Pattern mirrors WatchWorkoutManager (published state, double-tap guard, haptic,
 * sendMessageToPhone with transferUserInfoToPhone fallback) and
 * WatchCardioManager (UserDefaults crash-recovery, reachability retry).
 *
 * Phone → Watch:  PEPTIDE context via updateApplicationContext
 * Watch → Phone:  PEPTIDE_DOSE_LOGGED payload via sendMessageToPhone,
 *                 falls back to transferUserInfoToPhone when phone unreachable.
 */
import Foundation
import WatchKit
import WatchConnectivity

class WatchPeptideManager: ObservableObject {

  static let shared = WatchPeptideManager()

  // MARK: - Published State

  /// Whether the dose-log form is open
  @Published var isLogging: Bool = false
  /// Dose amount, bound to Digital Crown (0.05 increments)
  @Published var adjustedDose: Double = 0
  /// Selected injection site for the pending dose
  @Published var selectedSite: WatchInjectionSite = .abdomenLeft
  /// Timestamp for the dose (default: now, adjustable ±15 min)
  @Published var logTimestamp: Date = Date()
  /// Double-tap guard — true while the confirm network call is in-flight
  @Published var isConfirming: Bool = false
  /// Set to true after successful send; drives success overlay in QuickLogView
  @Published var logSuccess: Bool = false

  // MARK: - Private

  private let defaults = UserDefaults(suiteName: "group.com.pepmax.watchapp") ?? .standard
  private let pendingDoseKey = "peptide_pending_dose"

  private init() {
    // Retry any pending dose logged while phone was unreachable
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onReachabilityChanged),
      name: NSNotification.Name("WatchSessionManagerReachabilityChanged"),
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Public API

  /// Populate form defaults from the current phone-pushed state.
  /// Called by QuickLogView.onAppear.
  func prepareDoseLog(from state: WatchPeptideState) {
    adjustedDose = Double(state.doseAmount) ?? 0
    selectedSite = suggestedSite(from: state)
    logTimestamp = Date()
    isConfirming = false
    logSuccess = false
  }

  /// Build the payload and send to phone.
  /// Double-tap guard: returns immediately if isConfirming is already true.
  func confirmDoseLog(state: WatchPeptideState) {
    guard !isConfirming else { return }
    isConfirming = true

    let payload: [String: Any] = [
      "type": "PEPTIDE_DOSE_LOGGED",
      "peptideId": state.peptideId ?? "",
      "peptideName": state.compoundName,
      "amount": adjustedDose,
      "unit": state.unit ?? "mcg",
      "site": selectedSite.rawValue,
      "timestamp": logTimestamp.timeIntervalSince1970 * 1000,
      "mood": 3,
      "notes": ""
    ]

    persistPendingDose(payload)
    sendPayloadToPhone(payload)
  }

  /// Returns the best suggested injection site from state.
  /// Prefers `suggestedNextSite` from phone; falls back to clockwise rotation from lastInjectionSite.
  func suggestedSite(from state: WatchPeptideState) -> WatchInjectionSite {
    // Phone-computed suggestion takes priority
    if let suggestion = state.suggestedNextSite,
       !suggestion.isEmpty,
       let site = WatchInjectionSite(rawValue: suggestion) {
      return site
    }

    // Clockwise rotation from lastInjectionSite
    if let lastSite = WatchInjectionSite(rawValue: state.lastInjectionSite),
       let currentIndex = WatchInjectionSite.rotationOrder.firstIndex(of: lastSite) {
      let nextIndex = (currentIndex + 1) % WatchInjectionSite.rotationOrder.count
      return WatchInjectionSite.rotationOrder[nextIndex]
    }

    // Default: first in rotation
    return WatchInjectionSite.rotationOrder[0]
  }

  /// Reset all state (called from QuickLogView after dismiss)
  func reset() {
    isLogging = false
    adjustedDose = 0
    selectedSite = .abdomenLeft
    logTimestamp = Date()
    isConfirming = false
    logSuccess = false
  }

  // MARK: - Private Send

  private func sendPayloadToPhone(_ payload: [String: Any]) {
    if WCSession.default.isReachable {
      // Only mark success and clear pending dose after the phone confirms receipt.
      WatchSessionManager.shared.sendMessageToPhone(payload) { [weak self] in
        guard let self = self else { return }
        DispatchQueue.main.async {
          WKInterfaceDevice.current().play(.success)
          self.isConfirming = false
          self.logSuccess = true
          self.clearPendingDose()
        }
      }
    } else {
      // transferUserInfoToPhone guarantees delivery by WCSession — safe to clear immediately.
      WatchSessionManager.shared.transferUserInfoToPhone(payload)
      DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }
        WKInterfaceDevice.current().play(.success)
        self.isConfirming = false
        self.logSuccess = true
        self.clearPendingDose()
      }
    }
  }

  // MARK: - UserDefaults Crash Recovery

  private func persistPendingDose(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
    defaults.set(data, forKey: pendingDoseKey)
  }

  private func clearPendingDose() {
    defaults.removeObject(forKey: pendingDoseKey)
  }

  @objc private func onReachabilityChanged() {
    guard WCSession.default.isReachable else { return }
    retryPendingDose()
  }

  private func retryPendingDose() {
    guard let data = defaults.data(forKey: pendingDoseKey),
          let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return
    }
    if WCSession.default.isReachable {
      WatchSessionManager.shared.sendMessageToPhone(payload)
      clearPendingDose()
    }
  }
}
