/**
 * WatchSessionManager (Watch-side)
 *
 * Separate singleton from the phone-side manager.
 * Owns WCSession on the watch, publishes received context for SwiftUI binding.
 *
 * Typed @Published properties are parsed from the raw application context dict
 * so SwiftUI views can bind directly (e.g. sessionManager.calories).
 *
 * Note: watchOS WCSessionDelegate does NOT require sessionDidBecomeInactive /
 * sessionDidDeactivate — those callbacks are phone-only.
 */
import WatchConnectivity
import Combine

class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {

  static let shared = WatchSessionManager()

  // Raw context (kept for debugging / future use)
  @Published var receivedContext: [String: Any] = [:]
  @Published var isReachable: Bool = false

  // ─── Nutrition state (pushed via updateApplicationContext) ───────────────

  @Published var calories: Int = 0
  @Published var calorieTarget: Int = 2000
  @Published var protein: Int = 0
  @Published var proteinTarget: Int = 150
  @Published var carbs: Int = 0
  @Published var carbsTarget: Int = 200
  @Published var fat: Int = 0
  @Published var fatTarget: Int = 65
  @Published var lastSyncTime: Date? = nil
  @Published var hasSynced: Bool = false

  /// Forwarding callback — set by PepMaxWatchApp to route typed contexts to WatchStateManager.
  var onContextParsed: ((String, [String: Any]) -> Void)?

  private override init() {
    super.init()
  }

  // MARK: - Activation

  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  // MARK: - Send to Phone

  func sendMessageToPhone(_ data: [String: Any]) {
    guard WCSession.default.activationState == .activated,
          WCSession.default.isReachable else { return }
    WCSession.default.sendMessage(data, replyHandler: nil) { error in
      NSLog("[WatchSessionManager] sendMessage error: %@", error.localizedDescription)
    }
  }

  /// Overload with a delivery confirmation callback.
  /// `onDelivered` is called from the WCSession replyHandler on successful send.
  func sendMessageToPhone(_ data: [String: Any], onDelivered: @escaping () -> Void) {
    guard WCSession.default.activationState == .activated,
          WCSession.default.isReachable else { return }
    WCSession.default.sendMessage(data, replyHandler: { _ in
      onDelivered()
    }) { error in
      NSLog("[WatchSessionManager] sendMessage error: %@", error.localizedDescription)
    }
  }

  /// Queued delivery via transferUserInfo — guaranteed even when phone is unreachable.
  /// Used as fallback by WatchCardioManager when sendMessageToPhone would fail.
  func transferUserInfoToPhone(_ data: [String: Any]) {
    guard WCSession.default.activationState == .activated else { return }
    WCSession.default.transferUserInfo(data)
  }

  // MARK: - Context Parsing

  private func parseContext(_ context: [String: Any]) {
    guard let type = context["type"] as? String else { return }

    switch type {
    case "NUTRITION":
      calories = context["calories"] as? Int ?? 0
      calorieTarget = context["calorieTarget"] as? Int ?? 2000
      protein = context["protein"] as? Int ?? 0
      proteinTarget = context["proteinTarget"] as? Int ?? 150
      carbs = context["carbs"] as? Int ?? 0
      carbsTarget = context["carbsTarget"] as? Int ?? 200
      fat = context["fat"] as? Int ?? 0
      fatTarget = context["fatTarget"] as? Int ?? 65

      if let ts = context["updatedAt"] as? Double {
        lastSyncTime = Date(timeIntervalSince1970: ts / 1000.0)
      }
      hasSynced = true

    case "PEPTIDE", "GYM", "CARDIO", "READINESS", "ACTIVE_WORKOUT":
      break  // No legacy @Published props — WatchStateManager handles these via onContextParsed

    default:
      break
    }

    // Forward all typed contexts to WatchStateManager for decoding + persistence
    onContextParsed?(type, context)
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async {
      self.isReachable = session.isReachable
    }
    if let error = error {
      NSLog("[WatchSessionManager] Activation error: %@", error.localizedDescription)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    DispatchQueue.main.async {
      self.receivedContext = context
      self.parseContext(context)
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async {
      self.receivedContext = message
      self.parseContext(message)
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async {
      self.isReachable = session.isReachable
      if session.isReachable {
        NotificationCenter.default.post(
          name: NSNotification.Name("WatchSessionManagerReachabilityChanged"),
          object: nil
        )
      }
    }
  }
}
