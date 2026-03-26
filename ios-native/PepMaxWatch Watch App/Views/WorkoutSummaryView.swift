import SwiftUI

struct WorkoutSummaryView: View {
  @EnvironmentObject var workoutManager: WatchWorkoutManager

  @State private var isSaving = false

  private let accent = Color(hex: "E67E22")
  private let green = Color(hex: "27AE60")

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        // Header
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 32))
          .foregroundColor(green)

        Text("Done!")
          .font(.headline)

        // Stats
        VStack(spacing: 6) {
          statRow(label: "Duration", value: durationString(workoutManager.summaryDurationSeconds))
          statRow(label: "Volume", value: "\(workoutManager.summaryTotalVolume) lbs")
          statRow(
            label: "Sets",
            value: "\(workoutManager.summarySetsCompleted)/\(workoutManager.summaryTotalSets)"
          )
        }

        // Save button — sends GYM_WORKOUT_COMPLETE to phone, then resets.
        // isSaving guards against double-tap sending duplicate messages.
        Button {
          guard !isSaving else { return }
          isSaving = true
          workoutManager.finishWorkout()
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            workoutManager.reset()
          }
        } label: {
          Text(isSaving ? "Saving..." : "Save Workout")
            .font(.system(size: 14, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(isSaving ? Color.gray : green)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
      }
      .padding(.horizontal, 4)
    }
    .navigationBarBackButtonHidden(true)
  }

  @ViewBuilder
  private func statRow(label: String, value: String) -> some View {
    HStack {
      Text(label)
        .font(.caption)
        .foregroundColor(.secondary)
      Spacer()
      Text(value)
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(.white)
    }
  }

  private func durationString(_ seconds: Int) -> String {
    let m = seconds / 60
    let s = seconds % 60
    return String(format: "%d:%02d", m, s)
  }
}

#Preview {
  WorkoutSummaryView()
    .environmentObject(WatchWorkoutManager.shared)
}
