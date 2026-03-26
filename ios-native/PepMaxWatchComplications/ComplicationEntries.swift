import WidgetKit

struct NextDoseEntry: TimelineEntry {
    let date: Date
    let compoundName: String
    let nextDoseTime: Date?
    let isPremium: Bool
}

struct TodayWorkoutEntry: TimelineEntry {
    let date: Date
    let workoutName: String
    let isRestDay: Bool
    let isPremium: Bool
}

struct DailyMacrosEntry: TimelineEntry {
    let date: Date
    let calories: Int
    let calorieTarget: Int
    let protein: Int
    let proteinTarget: Int
    let isPremium: Bool
}

struct WeeklyDistanceEntry: TimelineEntry {
    let date: Date
    let distanceMiles: Double
    let goalMiles: Double
    let unit: String
    let isPremium: Bool
}

struct ReadinessScoreEntry: TimelineEntry {
    let date: Date
    let score: Int
    let isPremium: Bool
}
