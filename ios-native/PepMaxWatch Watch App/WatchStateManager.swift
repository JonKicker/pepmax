/**
 * WatchStateManager
 *
 * Central ObservableObject that owns all 5 module states on the watch.
 * Receives typed context dicts forwarded by WatchSessionManager.onContextParsed,
 * decodes them into Codable models, publishes for SwiftUI, and persists to
 * UserDefaults (shared app group) so future WidgetKit complications can read them.
 *
 * Data flow:
 *   WatchSessionManager.parseContext()
 *     → onContextParsed?(type, context)
 *       → handleParsedContext(type:context:)  ← this class
 *         → decode [String:Any] → Codable struct
 *         → @Published update → SwiftUI re-render
 *         → UserDefaults persist
 */
import Foundation
import Combine
import WidgetKit

class WatchStateManager: ObservableObject {

  static let shared = WatchStateManager()

  // MARK: - Published Module States

  @Published var nutrition: WatchNutritionState = .empty
  @Published var peptide: WatchPeptideState = .empty
  @Published var gym: WatchGymState = .empty
  @Published var cardio: WatchCardioState = .empty
  @Published var readiness: WatchReadinessState = .empty
  @Published var lastSyncTime: Date? = nil
  @Published var hasSynced: Bool = false
  @Published var isPremium: Bool = false

  // MARK: - Persistence

  /// Shared app group suite — also readable by WidgetKit complications.
  /// Falls back to .standard if entitlement not yet configured.
  private let defaults = UserDefaults(suiteName: "group.com.pepmax.watchapp") ?? .standard
  private let encoder = JSONEncoder()
  private let decoder: JSONDecoder = {
    let d = JSONDecoder()
    // Phone sends Date values as Unix milliseconds (JS Date.now())
    d.dateDecodingStrategy = .millisecondsSince1970
    return d
  }()

  private init() {
    loadPersistedState()
  }

  // MARK: - Receive from WatchSessionManager

  /// Called by WatchSessionManager.onContextParsed (already dispatched to main queue).
  func handleParsedContext(type: String, context: [String: Any]) {
    switch type {
    case "NUTRITION":
      if let decoded: WatchNutritionState = decodeFromDict(context) {
        nutrition = decoded
        // Schedule hydration reminders if interval is set
        if let interval = decoded.hydrationIntervalHours, interval > 0 {
          WatchPeptideNotificationManager.shared.scheduleHydrationReminders(
            intervalHours: interval,
            currentOz: decoded.waterOz ?? 0,
            goalOz: decoded.waterGoalOz ?? 64
          )
        }
      }
    case "PEPTIDE":
      if let decoded: WatchPeptideState = decodeFromDict(context) {
        peptide = decoded
        WatchPeptideNotificationManager.shared.scheduleReminders(from: decoded)
      }
    case "GYM":
      if let decoded: WatchGymState = decodeFromDict(context) {
        gym = decoded
      }
    case "CARDIO":
      if let decoded: WatchCardioState = decodeFromDict(context) {
        cardio = decoded
      }
    case "READINESS":
      if let decoded: WatchReadinessState = decodeFromDict(context) {
        readiness = decoded
      }
    default:
      return
    }

    // Sync premium flag from any context update
    if let premium = context["isPremium"] as? Bool {
      isPremium = premium
    }

    if let ts = context["updatedAt"] as? Double {
      lastSyncTime = Date(timeIntervalSince1970: ts / 1000.0)
    } else {
      lastSyncTime = Date()
    }
    hasSynced = true
    persistState()
    WidgetCenter.shared.reloadAllTimelines()
  }

  // MARK: - Local Water Update (called by WaterTrackingView after quick-tap)

  func updateLocalWater(newTotalOz: Double) {
    nutrition.waterOz = newTotalOz
    persistState()
    WidgetCenter.shared.reloadAllTimelines()
  }

  // MARK: - Codable Bridge

  /// Converts [String: Any] → JSON Data → Codable struct.
  /// Returns nil and logs if serialization or decoding fails — caller keeps existing state.
  private func decodeFromDict<T: Decodable>(_ dict: [String: Any]) -> T? {
    guard let data = try? JSONSerialization.data(withJSONObject: dict) else {
      NSLog("[WatchStateManager] JSON serialization failed for type: %@", String(describing: T.self))
      return nil
    }
    do {
      return try decoder.decode(T.self, from: data)
    } catch {
      NSLog("[WatchStateManager] Decode failed for type %@: %@", String(describing: T.self), error.localizedDescription)
      return nil
    }
  }

  // MARK: - UserDefaults Persistence

  private func persistState() {
    save(nutrition, key: "watch_nutrition")
    save(peptide, key: "watch_peptide")
    save(gym, key: "watch_gym")
    save(cardio, key: "watch_cardio")
    save(readiness, key: "watch_readiness")
    defaults.set(lastSyncTime?.timeIntervalSince1970, forKey: "watch_lastSyncTime")
    defaults.set(hasSynced, forKey: "watch_hasSynced")
    defaults.set(isPremium, forKey: "watch_isPremium")
  }

  private func loadPersistedState() {
    nutrition = load(key: "watch_nutrition") ?? .empty
    peptide = load(key: "watch_peptide") ?? .empty
    gym = load(key: "watch_gym") ?? .empty
    cardio = load(key: "watch_cardio") ?? .empty
    readiness = load(key: "watch_readiness") ?? .empty
    if let ts = defaults.object(forKey: "watch_lastSyncTime") as? Double {
      lastSyncTime = Date(timeIntervalSince1970: ts)
    }
    hasSynced = defaults.bool(forKey: "watch_hasSynced")
    isPremium = defaults.bool(forKey: "watch_isPremium")
  }

  private func save<T: Encodable>(_ value: T, key: String) {
    defaults.set(try? encoder.encode(value), forKey: key)
  }

  private func load<T: Decodable>(key: String) -> T? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? decoder.decode(T.self, from: data)
  }
}
