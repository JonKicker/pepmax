import SwiftUI
import WidgetKit

// MARK: - Shared locked view

private struct LockedView: View {
    var body: some View {
        ZStack {
            Image(systemName: "lock.fill")
                .font(.system(size: 14))
                .foregroundColor(.gray)
        }
    }
}

// MARK: - 1. NextDose Complication

struct NextDoseCircularView: View {
    let entry: NextDoseEntry

    private var countdownText: String {
        guard let next = entry.nextDoseTime else { return "No dose" }
        let hours = max(0, Int(next.timeIntervalSinceNow / 3600))
        if hours == 0 {
            let mins = max(0, Int(next.timeIntervalSinceNow / 60))
            return "\(mins)m"
        }
        return "\(hours)h"
    }

    var body: some View {
        if !entry.isPremium {
            LockedView()
        } else {
            VStack(spacing: 2) {
                Image(systemName: "pill.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.purple)
                Text(countdownText)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            .widgetURL(URL(string: "pepmax://tab/peptides"))
        }
    }
}

struct NextDoseInlineView: View {
    let entry: NextDoseEntry

    private var label: String {
        guard let next = entry.nextDoseTime else { return "No dose scheduled" }
        let hours = max(0, Int(next.timeIntervalSinceNow / 3600))
        let name = entry.compoundName.prefix(6)
        return "\(name) \(hours)h"
    }

    var body: some View {
        if !entry.isPremium {
            Text("Pro feature")
        } else {
            Text(label)
                .widgetURL(URL(string: "pepmax://tab/peptides"))
        }
    }
}

// MARK: - 2. TodayWorkout Complication

struct TodayWorkoutCircularView: View {
    let entry: TodayWorkoutEntry

    var body: some View {
        if !entry.isPremium {
            LockedView()
        } else {
            VStack(spacing: 2) {
                Image(systemName: entry.isRestDay ? "moon.zzz.fill" : "dumbbell.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.orange)
                Text(entry.isRestDay ? "Rest" : String(entry.workoutName.prefix(6)))
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }
            .widgetURL(URL(string: "pepmax://tab/gym"))
        }
    }
}

struct TodayWorkoutInlineView: View {
    let entry: TodayWorkoutEntry

    var body: some View {
        if !entry.isPremium {
            Text("Pro feature")
        } else {
            Text(entry.isRestDay ? "Rest Day" : entry.workoutName)
                .widgetURL(URL(string: "pepmax://tab/gym"))
        }
    }
}

// MARK: - 3. DailyMacros Complication

struct DailyMacrosCircularView: View {
    let entry: DailyMacrosEntry

    private var progress: Double {
        guard entry.calorieTarget > 0 else { return 0 }
        return min(Double(entry.calories) / Double(entry.calorieTarget), 1.0)
    }

    var body: some View {
        if !entry.isPremium {
            LockedView()
        } else {
            Gauge(value: progress) {
                Image(systemName: "fork.knife")
                    .foregroundColor(.green)
            } currentValueLabel: {
                Text("\(entry.calories)")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
            }
            .gaugeStyle(.accessoryCircular)
            .tint(.green)
            .widgetURL(URL(string: "pepmax://tab/nutrition"))
        }
    }
}

struct DailyMacrosInlineView: View {
    let entry: DailyMacrosEntry

    var body: some View {
        if !entry.isPremium {
            Text("Pro feature")
        } else {
            Text("\(entry.calories)/\(entry.calorieTarget) kcal")
                .widgetURL(URL(string: "pepmax://tab/nutrition"))
        }
    }
}

// MARK: - 4. WeeklyDistance Complication

struct WeeklyDistanceCircularView: View {
    let entry: WeeklyDistanceEntry

    private var progress: Double {
        guard entry.goalMiles > 0 else { return 0 }
        return min(entry.distanceMiles / entry.goalMiles, 1.0)
    }

    var body: some View {
        if !entry.isPremium {
            LockedView()
        } else {
            Gauge(value: progress) {
                Image(systemName: "figure.run")
                    .foregroundColor(.blue)
            } currentValueLabel: {
                Text(String(format: "%.1f", entry.distanceMiles))
                    .font(.system(size: 9, weight: .bold, design: .rounded))
            }
            .gaugeStyle(.accessoryCircular)
            .tint(.blue)
            .widgetURL(URL(string: "pepmax://tab/cardio"))
        }
    }
}

struct WeeklyDistanceInlineView: View {
    let entry: WeeklyDistanceEntry

    var body: some View {
        if !entry.isPremium {
            Text("Pro feature")
        } else {
            Text(String(format: "%.1f/%.0f %@", entry.distanceMiles, entry.goalMiles, entry.unit))
                .widgetURL(URL(string: "pepmax://tab/cardio"))
        }
    }
}

// MARK: - 5. ReadinessScore Complication

struct ReadinessScoreCircularView: View {
    let entry: ReadinessScoreEntry

    private var scoreColor: Color {
        switch entry.score {
        case 75...100: return .green
        case 40..<75:  return .yellow
        default:       return .red
        }
    }

    var body: some View {
        if !entry.isPremium {
            LockedView()
        } else {
            VStack(spacing: 2) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 12))
                    .foregroundColor(scoreColor)
                Text("\(entry.score)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(scoreColor)
            }
            .widgetURL(URL(string: "pepmax://tab/readiness"))
        }
    }
}

struct ReadinessScoreInlineView: View {
    let entry: ReadinessScoreEntry

    var body: some View {
        if !entry.isPremium {
            Text("Pro feature")
        } else {
            Text("Readiness: \(entry.score)")
                .widgetURL(URL(string: "pepmax://tab/readiness"))
        }
    }
}

// MARK: - Family-dispatching wrapper views

struct NextDoseComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: NextDoseEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            NextDoseInlineView(entry: entry)
        default:
            NextDoseCircularView(entry: entry)
        }
    }
}

struct TodayWorkoutComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: TodayWorkoutEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            TodayWorkoutInlineView(entry: entry)
        default:
            TodayWorkoutCircularView(entry: entry)
        }
    }
}

struct DailyMacrosComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: DailyMacrosEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            DailyMacrosInlineView(entry: entry)
        default:
            DailyMacrosCircularView(entry: entry)
        }
    }
}

struct WeeklyDistanceComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: WeeklyDistanceEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            WeeklyDistanceInlineView(entry: entry)
        default:
            WeeklyDistanceCircularView(entry: entry)
        }
    }
}

struct ReadinessScoreComplicationView: View {
    @Environment(\.widgetFamily) var family
    var entry: ReadinessScoreEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            ReadinessScoreInlineView(entry: entry)
        default:
            ReadinessScoreCircularView(entry: entry)
        }
    }
}

// MARK: - Widget definitions

struct NextDoseComplication: Widget {
    let kind = "NextDoseComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NextDoseProvider()) { entry in
            NextDoseComplicationView(entry: entry)
        }
        .configurationDisplayName("Next Dose")
        .description("Shows your next peptide dose countdown.")
        .supportedFamilies([.accessoryCircular, .accessoryInline])
    }
}

struct TodayWorkoutComplication: Widget {
    let kind = "TodayWorkoutComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayWorkoutProvider()) { entry in
            TodayWorkoutComplicationView(entry: entry)
        }
        .configurationDisplayName("Today's Workout")
        .description("Shows today's workout name or rest day.")
        .supportedFamilies([.accessoryCircular, .accessoryInline])
    }
}

struct DailyMacrosComplication: Widget {
    let kind = "DailyMacrosComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyMacrosProvider()) { entry in
            DailyMacrosComplicationView(entry: entry)
        }
        .configurationDisplayName("Daily Macros")
        .description("Shows today's calorie progress ring.")
        .supportedFamilies([.accessoryCircular, .accessoryInline])
    }
}

struct WeeklyDistanceComplication: Widget {
    let kind = "WeeklyDistanceComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeeklyDistanceProvider()) { entry in
            WeeklyDistanceComplicationView(entry: entry)
        }
        .configurationDisplayName("Weekly Distance")
        .description("Shows weekly cardio distance progress.")
        .supportedFamilies([.accessoryCircular, .accessoryInline])
    }
}

struct ReadinessScoreComplication: Widget {
    let kind = "ReadinessScoreComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ReadinessScoreProvider()) { entry in
            ReadinessScoreComplicationView(entry: entry)
        }
        .configurationDisplayName("Readiness Score")
        .description("Shows today's recovery readiness score.")
        .supportedFamilies([.accessoryCircular, .accessoryInline])
    }
}
