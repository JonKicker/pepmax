import SwiftUI
import WatchKit

struct ActiveWorkoutView: View {
  @EnvironmentObject var workoutManager: WatchWorkoutManager

  @State private var showRestTimer = false
  @State private var showSummary = false
  @State private var crownValue: Double = 0

  private let accent = Color(hex: "E67E22")
  private let green = Color(hex: "27AE60")

  var body: some View {
    exerciseView
      // Rest timer as a sheet — naturally overlays, dismisses on skipRest or timer end
      .sheet(isPresented: $showRestTimer) {
        RestTimerView()
          .environmentObject(workoutManager)
      }
      // Summary navigation (full-screen, no back button)
      .navigationDestination(isPresented: $showSummary) {
        WorkoutSummaryView()
          .environmentObject(workoutManager)
      }
      .onAppear {
        crownValue = workoutManager.adjustedWeight
      }
      .focusable()
      .digitalCrownRotation(
        $crownValue,
        from: 0,
        through: 2000,
        by: 5,
        sensitivity: .medium,
        isContinuous: false,
        isHapticFeedbackEnabled: true
      )
      .onChange(of: crownValue) { newVal in
        workoutManager.adjustedWeight = max(0, newVal)
      }
      .onChange(of: workoutManager.phase) { newPhase in
        switch newPhase {
        case .resting:
          showRestTimer = true
        case .exercising:
          showRestTimer = false
          crownValue = workoutManager.adjustedWeight
        case .summary:
          showRestTimer = false
          showSummary = true
        case .idle:
          showRestTimer = false
          showSummary = false
        }
      }
  }

  @ViewBuilder
  private var exerciseView: some View {
    if let ex = workoutManager.currentExercise {
      VStack(spacing: 4) {
        // Exercise name
        Text(ex.name)
          .font(.system(size: 15, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(2)
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity)

        // Set counter
        Text("Set \(workoutManager.currentSetIndex + 1) of \(ex.targetSets)")
          .font(.caption2)
          .foregroundColor(.secondary)

        // Weight display (Digital Crown)
        HStack(spacing: 4) {
          Text(weightString(workoutManager.adjustedWeight))
            .font(.system(size: 26, weight: .bold, design: .rounded))
            .foregroundColor(accent)
          Text("lbs")
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.top, 6)
        }

        // Reps row
        HStack(spacing: 12) {
          Button {
            workoutManager.adjustedReps = max(1, workoutManager.adjustedReps - 1)
          } label: {
            Image(systemName: "minus")
              .font(.system(size: 16, weight: .bold))
              .frame(width: 44, height: 44)
              .background(Color.white.opacity(0.15))
              .cornerRadius(10)
          }
          .buttonStyle(.plain)

          VStack(spacing: 0) {
            Text("\(workoutManager.adjustedReps)")
              .font(.system(size: 26, weight: .bold, design: .rounded))
              .foregroundColor(.white)
            Text("reps")
              .font(.caption2)
              .foregroundColor(.secondary)
          }

          Button {
            workoutManager.adjustedReps += 1
          } label: {
            Image(systemName: "plus")
              .font(.system(size: 16, weight: .bold))
              .frame(width: 44, height: 44)
              .background(Color.white.opacity(0.15))
              .cornerRadius(10)
          }
          .buttonStyle(.plain)
        }

        // Log Set
        Button {
          workoutManager.logSet()
        } label: {
          Text("Log Set")
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(green)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)

        // Skip Exercise
        Button {
          workoutManager.skipExercise()
          crownValue = workoutManager.adjustedWeight
        } label: {
          Text("Skip")
            .font(.system(size: 12))
            .foregroundColor(.secondary)
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 4)
    } else {
      VStack(spacing: 8) {
        Text("No exercises")
          .foregroundColor(.secondary)
        Button("Finish") { workoutManager.finishWorkout() }
      }
    }
  }

  private func weightString(_ val: Double) -> String {
    val == val.rounded() ? String(Int(val)) : String(format: "%.1f", val)
  }
}

#Preview {
  ActiveWorkoutView()
    .environmentObject(WatchWorkoutManager.shared)
}
