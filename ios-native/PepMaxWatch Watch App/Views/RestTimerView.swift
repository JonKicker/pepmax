import SwiftUI

struct RestTimerView: View {
  @EnvironmentObject var workoutManager: WatchWorkoutManager
  @Environment(\.dismiss) private var dismiss

  private let accent = Color(hex: "E67E22")

  var progress: Double {
    guard workoutManager.restTimeTotal > 0 else { return 0 }
    return Double(workoutManager.restTimeTotal - workoutManager.restTimeRemaining) / Double(workoutManager.restTimeTotal)
  }

  var body: some View {
    VStack(spacing: 8) {
      // Circular progress ring
      ZStack {
        // Background ring
        Circle()
          .stroke(Color.white.opacity(0.15), lineWidth: 6)
          .frame(width: 80, height: 80)

        // Depleting foreground ring
        Circle()
          .trim(from: 0, to: CGFloat(1 - progress))
          .stroke(accent, style: StrokeStyle(lineWidth: 6, lineCap: .round))
          .frame(width: 80, height: 80)
          .rotationEffect(.degrees(-90))
          .animation(.linear(duration: 1), value: progress)

        // Remaining seconds
        VStack(spacing: 0) {
          Text("\(workoutManager.restTimeRemaining)")
            .font(.system(size: 28, weight: .bold, design: .rounded))
            .foregroundColor(.white)
          Text("sec")
            .font(.caption2)
            .foregroundColor(.secondary)
        }
      }

      // Next up preview — check isLastSet first to avoid showing next exercise
      // name during between-set rest on the same exercise.
      if workoutManager.isLastSet, let nextName = workoutManager.nextExerciseName {
        Text("Next: \(nextName)")
          .font(.caption2)
          .foregroundColor(.secondary)
          .lineLimit(1)
      } else if !workoutManager.isLastSet {
        Text("Next: Set \(workoutManager.currentSetIndex + 2)")
          .font(.caption2)
          .foregroundColor(.secondary)
      } else {
        Text("Last set!")
          .font(.caption2)
          .foregroundColor(.green)
      }

      // Skip Rest button
      Button {
        workoutManager.skipRest()
      } label: {
        Text("Skip Rest")
          .font(.system(size: 14, weight: .medium))
          .frame(maxWidth: .infinity)
          .frame(height: 44)
          .background(Color.white.opacity(0.15))
          .foregroundColor(.white)
          .cornerRadius(10)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 4)
    // Parent (ActiveWorkoutView) observes phase changes and dismisses this sheet
  }
}

#Preview {
  RestTimerView()
    .environmentObject(WatchWorkoutManager.shared)
}
