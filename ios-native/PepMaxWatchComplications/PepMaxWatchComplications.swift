import SwiftUI
import WidgetKit

@main
struct PepMaxWatchComplications: WidgetBundle {
    var body: some Widget {
        NextDoseComplication()
        TodayWorkoutComplication()
        DailyMacrosComplication()
        WeeklyDistanceComplication()
        ReadinessScoreComplication()
    }
}
