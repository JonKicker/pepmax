/**
 * WatchSessionManager (Phone-side)
 *
 * Singleton that owns the WCSession for the phone app.
 * Activated by WatchConnectivityModule on first JS require — no AppDelegate changes needed.
 *
 * Thread safety: onMessageReceived is protected by a private serial queue.
 * WCSessionDelegate callbacks arrive on an unspecified queue; reads/writes of the
 * closure property are synchronized to avoid data races.
 *
 * Channels:
 *  - sendMessage: real-time, requires watch to be reachable
 *  - updateApplicationContext: latest-state only, background delivery
 */
import WatchConnectivity

@objc(WatchSessionManager)
class WatchSessionManager: NSObject, WCSessionDelegate {

  @objc static let shared = WatchSessionManager()

  // Serial queue protecting onMessageReceived closure reads/writes
  private let callbackQueue = DispatchQueue(label: "com.pepmax.app.watch.callback")
  private var _onMessageReceived: (([String: Any]) -> Void)?

  /// Set by WatchConnectivityModule to forward watch→phone messages to JS.
  /// Thread-safe: reads and writes are serialized through callbackQueue.
  var onMessageReceived: (([String: Any]) -> Void)? {
    get { callbackQueue.sync { _onMessageReceived } }
    set { callbackQueue.async { self._onMessageReceived = newValue } }
  }

  private override init() {
    super.init()
  }

  // MARK: - Activation

  @objc func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  // MARK: - Send to Watch

  @objc func sendMessage(
    _ data: [String: Any],
    reply: @escaping ([String: Any]) -> Void,
    errorHandler: @escaping (Error) -> Void
  ) {
    guard WCSession.default.activationState == .activated,
          WCSession.default.isReachable else {
      errorHandler(
        NSError(domain: "WatchConnectivity", code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Watch is not reachable"])
      )
      return
    }
    WCSession.default.sendMessage(data, replyHandler: reply, errorHandler: errorHandler)
  }

  @objc func updateApplicationContext(_ context: [String: Any]) throws {
    guard WCSession.default.activationState == .activated else { return }
    try WCSession.default.updateApplicationContext(context)
  }

  @objc func transferUserInfo(_ info: [String: Any]) {
    guard WCSession.default.activationState == .activated else { return }
    WCSession.default.transferUserInfo(info)
  }

  // MARK: - WCSessionDelegate (required on iOS)

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if let error = error {
      NSLog("[WatchSessionManager] Activation error: %@", error.localizedDescription)
    } else {
      NSLog("[WatchSessionManager] Activated with state: %ld", activationState.rawValue)
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    NSLog("[WatchSessionManager] Session became inactive")
  }

  func sessionDidDeactivate(_ session: WCSession) {
    NSLog("[WatchSessionManager] Session deactivated — reactivating")
    WCSession.default.activate()
  }

  // MARK: - Receive messages from watch

  private func dispatch(_ message: [String: Any]) {
    callbackQueue.async { self._onMessageReceived?(message) }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    dispatch(message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    dispatch(message)
    replyHandler([:]) // acknowledge
  }

  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    dispatch(context)
  }

  /// Receives queued messages from the watch (transferUserInfo — guaranteed delivery).
  /// Used for offline cardio session sync when the phone was out of range.
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    dispatch(userInfo)
  }
}
