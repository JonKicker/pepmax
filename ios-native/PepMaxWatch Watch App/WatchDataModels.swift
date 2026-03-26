/**
 * WatchDataModels
 *
 * Codable structs mirroring the payloads the phone sends via WatchConnectivity.
 * All types conform to Codable (JSON encode/decode) and Equatable (SwiftUI diffing).
 * Each type has a static `.empty` default so views never need to handle optionals.
 *
 * Field names match the keys sent by the phone-side push functions
 * (e.g. pushNutritionToWatch) so JSONDecoder works without CodingKeys.
 */
import Foundation

// MARK: - Nutrition

struct WatchNutritionState: Codable, Equatable {
  var calories: Int
  var calorieTarget: Int
  var protein: Int
  var proteinTarget: Int
  var carbs: Int
  var carbsTarget: Int
  var fat: Int
  var fatTarget: Int
  // Phase 8 additions — optional for backward compat with older phone builds
  var waterOz: Double?
  var waterGoalOz: Double?
  var hydrationIntervalHours: Int?

  static let empty = WatchNutritionState(
    calories: 0, calorieTarget: 2000,
    protein: 0, proteinTarget: 150,
    carbs: 0, carbsTarget: 200,
    fat: 0, fatTarget: 65
  )
}

// MARK: - Peptides

enum WatchInjectionSite: String, Codable, CaseIterable {
  case abdomenLeft, abdomenRight, leftQuad, rightQuad
  case leftGlute, rightGlute, leftDelt, rightDelt
  case other

  var displayName: String {
    switch self {
    case .abdomenLeft:  return "Abdomen L"
    case .abdomenRight: return "Abdomen R"
    case .leftQuad:     return "Left Quad"
    case .rightQuad:    return "Right Quad"
    case .leftGlute:    return "Left Glute"
    case .rightGlute:   return "Right Glute"
    case .leftDelt:     return "Left Delt"
    case .rightDelt:    return "Right Delt"
    case .other:        return "Other"
    }
  }

  /// Clockwise rotation order for auto-suggestion when no phone hint is present.
  static let rotationOrder: [WatchInjectionSite] = [
    .abdomenLeft, .abdomenRight, .leftQuad, .rightQuad,
    .leftGlute, .rightGlute, .leftDelt, .rightDelt
  ]
}

struct WatchPeptideState: Codable, Equatable {
  var nextDoseTime: Date?
  var compoundName: String
  var doseAmount: String
  var lastInjectionSite: String
  var daysUntilResupply: Int
  // NEW fields — optional so old phone versions don't break decode
  var unit: String?                    // "mg", "mcg", "IU"
  var peptideId: String?               // Firestore doc ID
  var suggestedNextSite: String?       // phone-computed suggestion
  var recentSites: [String]?           // last 8 sites for rotation display
  var scheduledDoseTimes: [Double]?    // up to 7 future dose times (ms since epoch)

  static let empty = WatchPeptideState(
    nextDoseTime: nil,
    compoundName: "",
    doseAmount: "",
    lastInjectionSite: "",
    daysUntilResupply: 0,
    unit: nil,
    peptideId: nil,
    suggestedNextSite: nil,
    recentSites: nil,
    scheduledDoseTimes: nil
  )
}

// MARK: - Gym

struct WatchGymExercise: Codable, Equatable {
  var name: String
  var sets: Int
  var reps: Int
  var weight: Double
}

struct WatchGymState: Codable, Equatable {
  var todayWorkoutName: String
  var exercises: [WatchGymExercise]
  var isRestDay: Bool
  var weeklyVolume: Int

  static let empty = WatchGymState(
    todayWorkoutName: "",
    exercises: [],
    isRestDay: false,
    weeklyVolume: 0
  )
}

// MARK: - Active Workout (watch-local state for live logging)

struct WatchLoggedSet: Codable, Equatable {
  var weight: Double
  var reps: Int
  var completedAt: Date
}

struct WatchWorkoutExercise: Codable, Equatable {
  var name: String
  var targetSets: Int
  var targetReps: Int
  var targetWeight: Double
  var restSeconds: Int
  var logged: [WatchLoggedSet]
}

struct WatchActiveWorkout: Codable, Equatable {
  var sessionId: String
  var exercises: [WatchWorkoutExercise]
  var startTime: Date

  static let empty = WatchActiveWorkout(sessionId: "", exercises: [], startTime: Date())
}

// MARK: - Cardio

struct WatchCardioState: Codable, Equatable {
  var weeklyDistanceMiles: Double
  var weeklyGoalMiles: Double
  var lastActivitySummary: String
  var maxHeartRate: Int?      // synced from phone profile; nil = use 220-age fallback
  var distanceUnit: String?   // "mi" or "km"; nil = "mi"
  var autoPauseEnabled: Bool? // nil = true

  static let empty = WatchCardioState(
    weeklyDistanceMiles: 0,
    weeklyGoalMiles: 0,
    lastActivitySummary: "",
    maxHeartRate: nil,
    distanceUnit: nil,
    autoPauseEnabled: nil
  )
}

// MARK: - Cardio Session Types (watch-local, not synced from phone)

enum WatchCardioActivityType: String, Codable, CaseIterable {
  case run, walk, cycle, hike, custom

  var displayName: String {
    switch self {
    case .run:    return "Run"
    case .walk:   return "Walk"
    case .cycle:  return "Cycle"
    case .hike:   return "Hike"
    case .custom: return "Other"
    }
  }

  var systemImage: String {
    switch self {
    case .run:    return "figure.run"
    case .walk:   return "figure.walk"
    case .cycle:  return "figure.outdoor.cycle"
    case .hike:   return "figure.hiking"
    case .custom: return "figure.mixed.cardio"
    }
  }

  /// Maps to HealthKit workout activity type for HKWorkoutSession
  var hkActivityType: Int {
    switch self {
    case .run:    return 37  // HKWorkoutActivityType.running
    case .walk:   return 52  // HKWorkoutActivityType.walking
    case .cycle:  return 13  // HKWorkoutActivityType.cycling
    case .hike:   return 22  // HKWorkoutActivityType.hiking
    case .custom: return 3000 // HKWorkoutActivityType.other
    }
  }
}

enum WatchCardioPhase: Equatable {
  case idle
  case setup
  case active
  case paused
  case summary
}

enum WatchCardioTarget: Equatable {
  case none
  case distance(meters: Double)
  case time(seconds: Int)
}

struct WatchCardioRoutePoint: Codable, Equatable {
  var latitude: Double
  var longitude: Double
  var altitude: Double?
  var timestamp: Double   // ms since epoch
  var speed: Double?      // m/s
  var accuracy: Double?   // meters
}

struct WatchCardioSplit: Codable, Equatable {
  var splitNumber: Int
  var distance: Double   // meters at split
  var time: Double       // elapsed active seconds at split
  var pace: Double       // sec/km for this split
  var elevationChange: Double
}

struct WatchCardioHRPoint: Codable, Equatable {
  var timestamp: Double  // ms since epoch
  var bpm: Int
}

struct WatchCardioTimeInZone: Codable, Equatable {
  var zone: Int          // 1-5
  var name: String
  var seconds: Double
  var color: String      // hex, e.g. "808080"
}

struct WatchCardioSessionResult: Codable {
  var activityType: String
  var startedAt: Double         // ms since epoch
  var endedAt: Double           // ms since epoch
  var distance: Double          // meters
  var duration: Double          // active seconds
  var totalPausedTime: Double   // seconds
  var averagePace: Double       // sec/km
  var splits: [WatchCardioSplit]
  var elevationGain: Double
  var elevationLoss: Double
  var indoorMode: Bool
  var route: [WatchCardioRoutePoint]
  var calories: Double
  var avgHeartRate: Int?
  var maxHeartRate: Int?
  var heartRateData: [WatchCardioHRPoint]?
  var timeInZones: [WatchCardioTimeInZone]?
}

// MARK: - Readiness

struct WatchReadinessState: Codable, Equatable {
  var score: Int           // 0-100
  var sleepHours: Double
  var restingHR: Int
  var hrvMs: Int
  var recommendation: String
  // Phase 8 additions — optional for backward compat with older phone builds
  var sleepQuality: Int?          // 1–5 subjective rating
  var hrTrend: String?            // "up" / "down" / "stable"
  var hrvTrend: String?           // "up" / "down" / "stable"
  var trainingLoadLabel: String?  // "light" / "moderate" / "heavy"

  static let empty = WatchReadinessState(
    score: 0,
    sleepHours: 0,
    restingHR: 0,
    hrvMs: 0,
    recommendation: ""
  )
}
