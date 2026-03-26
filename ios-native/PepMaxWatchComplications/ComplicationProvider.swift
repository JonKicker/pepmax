import WidgetKit
import Foundation

// MARK: - Shared UserDefaults suite

private let suiteName = "group.com.pepmax.watchapp"
private let defaults = UserDefaults(suiteName: suiteName) ?? .standard
private let decoder: JSONDecoder = {
    let d = JSONDecoder()
    d.dateDecodingStrategy = .millisecondsSince1970
    return d
}()

private func loadState<T: Decodable>(key: String) -> T? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? decoder.decode(T.self, from: data)
}

private func loadIsPremium() -> Bool {
    // Stored as part of any state struct — fall back to a dedicated key
    return defaults.bool(forKey: "watch_isPremium")
}

// MARK: - NextDose Provider

struct NextDoseProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextDoseEntry {
        NextDoseEntry(date: .now, compoundName: "Semaglutide", nextDoseTime: Date().addingTimeInterval(7200), isPremium: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (NextDoseEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextDoseEntry>) -> Void) {
        let peptide: WatchPeptideState? = loadState(key: "watch_peptide")
        let entry = NextDoseEntry(
            date: .now,
            compoundName: peptide?.compoundName ?? "",
            nextDoseTime: peptide?.nextDoseTime,
            isPremium: loadIsPremium()
        )
        let refresh = Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// MARK: - TodayWorkout Provider

struct TodayWorkoutProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayWorkoutEntry {
        TodayWorkoutEntry(date: .now, workoutName: "Pull Day", isRestDay: false, isPremium: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayWorkoutEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayWorkoutEntry>) -> Void) {
        let gym: WatchGymState? = loadState(key: "watch_gym")
        let entry = TodayWorkoutEntry(
            date: .now,
            workoutName: gym?.todayWorkoutName ?? "",
            isRestDay: gym?.isRestDay ?? false,
            isPremium: loadIsPremium()
        )
        let refresh = Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// MARK: - DailyMacros Provider

struct DailyMacrosProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyMacrosEntry {
        DailyMacrosEntry(date: .now, calories: 1450, calorieTarget: 2000, protein: 120, proteinTarget: 150, isPremium: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyMacrosEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyMacrosEntry>) -> Void) {
        let nutrition: WatchNutritionState? = loadState(key: "watch_nutrition")
        let entry = DailyMacrosEntry(
            date: .now,
            calories: nutrition?.calories ?? 0,
            calorieTarget: nutrition?.calorieTarget ?? 2000,
            protein: nutrition?.protein ?? 0,
            proteinTarget: nutrition?.proteinTarget ?? 150,
            isPremium: loadIsPremium()
        )
        let refresh = Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// MARK: - WeeklyDistance Provider

struct WeeklyDistanceProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeeklyDistanceEntry {
        WeeklyDistanceEntry(date: .now, distanceMiles: 12.3, goalMiles: 20, unit: "mi", isPremium: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (WeeklyDistanceEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeeklyDistanceEntry>) -> Void) {
        let cardio: WatchCardioState? = loadState(key: "watch_cardio")
        let entry = WeeklyDistanceEntry(
            date: .now,
            distanceMiles: cardio?.weeklyDistanceMiles ?? 0,
            goalMiles: cardio?.weeklyGoalMiles ?? 0,
            unit: cardio?.distanceUnit ?? "mi",
            isPremium: loadIsPremium()
        )
        let refresh = Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// MARK: - ReadinessScore Provider

struct ReadinessScoreProvider: TimelineProvider {
    func placeholder(in context: Context) -> ReadinessScoreEntry {
        ReadinessScoreEntry(date: .now, score: 82, isPremium: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (ReadinessScoreEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReadinessScoreEntry>) -> Void) {
        let readiness: WatchReadinessState? = loadState(key: "watch_readiness")
        let entry = ReadinessScoreEntry(
            date: .now,
            score: readiness?.score ?? 0,
            isPremium: loadIsPremium()
        )
        let refresh = Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}
