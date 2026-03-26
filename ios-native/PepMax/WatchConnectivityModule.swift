/**
 * WatchConnectivityModule (React Native bridge)
 *
 * Extends RCTEventEmitter so it can emit "onWatchMessage" events to JavaScript.
 * WCSession is activated lazily when JS first requires this module (via init()).
 *
 * hasListeners is managed by startObserving/stopObserving (called by RCTEventEmitter
 * on the JS thread when listeners are added/removed). Events are gated behind this
 * flag to avoid "no listeners registered" warnings and spurious delivery at cold launch.
 */
import Foundation
import React

@objc(WatchConnectivityModule)
class WatchConnectivityModule: RCTEventEmitter {

  // Tracks whether any JS listener is currently registered.
  // Written on the JS thread via startObserving/stopObserving.
  // Read on callbackQueue (inside onMessageReceived closure).
  // This is a benign theoretical race: worst case is a dropped or extra event,
  // never a crash. Bool reads are load-atomic on arm64. Acceptable at this layer;
  // harden with os_unfair_lock before production if needed.
  private var hasListeners = false

  override init() {
    super.init()
    // Activate WCSession here — avoids any AppDelegate modifications
    WatchSessionManager.shared.activate()

    // Forward watch→phone messages to JS as NativeEventEmitter events.
    // Guarded by hasListeners to prevent delivery before any JS listener attaches.
    WatchSessionManager.shared.onMessageReceived = { [weak self] message in
      guard let self, self.hasListeners else { return }
      self.sendEvent(withName: "onWatchMessage", body: message)
    }
  }

  // MARK: - RCTEventEmitter

  override func supportedEvents() -> [String] {
    return ["onWatchMessage"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Called by RCTEventEmitter when the first JS listener is added.
  override func startObserving() {
    hasListeners = true
  }

  /// Called by RCTEventEmitter when the last JS listener is removed.
  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - JS-Exposed Methods

  @objc func sendMessageToWatch(
    _ data: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let dict = data as? [String: Any] else {
      rejecter("INVALID_DATA", "data must be a dictionary", nil)
      return
    }
    WatchSessionManager.shared.sendMessage(dict, reply: { reply in
      resolver(reply)
    }, errorHandler: { error in
      rejecter("SEND_FAILED", error.localizedDescription, error)
    })
  }

  @objc func updateWatchContext(
    _ data: NSDictionary,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let dict = data as? [String: Any] else {
      rejecter("INVALID_DATA", "data must be a dictionary", nil)
      return
    }
    do {
      try WatchSessionManager.shared.updateApplicationContext(dict)
      resolver(true)
    } catch {
      rejecter("CONTEXT_FAILED", error.localizedDescription, error)
    }
  }

  @objc func isWatchPaired(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard WCSession.isSupported() else {
      resolver(false)
      return
    }
    resolver(WCSession.default.isPaired)
  }

  @objc func isWatchReachable(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard WCSession.isSupported() else {
      resolver(false)
      return
    }
    resolver(WCSession.default.isReachable)
  }
}
