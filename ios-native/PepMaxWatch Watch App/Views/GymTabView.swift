import SwiftUI

struct GymTabView: View {
  @EnvironmentObject var stateManager: WatchStateManager
  @EnvironmentObject var workoutManager: WatchWorkoutManager

  @State private var showActiveWorkout = false

  private let accent = Color(hex: "E67E22")

  var body: some View {
    NavigationStack {
      content
        .navigationDestination(isPresented: $showActiveWorkout) {
          ActiveWorkoutView()
            .environmentObject(workoutManager)
        }
    }
    .tint(accent)
    // When workout resets to idle, pop the active workout view
    .onChange(of: workoutManager.phase) { newPhase in
      if newPhase == .idle {
        showActiveWorkout = false
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    if !stateManager.hasSynced {
      VStack(spacing: 8) {
        Image(systemName: "dumbbell.fill")
          .font(.system(size: 36))
          .foregroundColor(accent)
        Text("Gym")
          .font(.headline)
        Text("Awaiting sync...")
          .font(.caption)
          .foregroundColor(.secondary)
      }
    } else if stateManager.gym.isRestDay {
      VStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 36))
          .foregroundColor(.green)
        Text("Rest Day")
          .font(.headline)
        if stateManager.gym.weeklyVolume > 0 {
          Text("\(stateManager.gym.weeklyVolume) lbs this week")
            .font(.caption)
            .foregroundColor(.secondary)
        }
      }
    } else if workoutManager.phase != .idle {
      // Active workout in progress — resume
      let name = stateManager.gym.todayWorkoutName
      VStack(spacing: 12) {
        Image(systemName: "dumbbell.fill")
          .font(.system(size: 28))
          .foregroundColor(accent)
        Text(name.isEmpty ? "Workout" : name)
          .font(.headline)
          .lineLimit(2)
          .multilineTextAlignment(.center)
        Button {
          showActiveWorkout = true
        } label: {
          Text("Resume")
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(accent)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 4)
    } else {
      // Scheduled workout — ready to start
      let name = stateManager.gym.todayWorkoutName
      let exCount = stateManager.gym.exercises.count
      VStack(spacing: 12) {
        Image(systemName: "dumbbell.fill")
          .font(.system(size: 28))
          .foregroundColor(accent)
        VStack(spacing: 2) {
          Text(name.isEmpty ? "Workout" : name)
            .font(.system(size: 15, weight: .bold))
            .lineLimit(2)
            .multilineTextAlignment(.center)
          if exCount > 0 {
            Text("\(exCount) exercises")
              .font(.caption2)
              .foregroundColor(.secondary)
          }
        }
        Button {
          startLocalWorkout()
          showActiveWorkout = true
        } label: {
          Text("Start Workout")
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(accent)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
      }
      .padding(.horizontal, 4)
    }
  }

  /// Build a WatchActiveWorkout from the synced gym glance data and start it locally.
  /// This is a fallback when the phone hasn't sent an ACTIVE_WORKOUT payload yet.
  private func startLocalWorkout() {
    guard workoutManager.phase == .idle else { return }
    let exercises = stateManager.gym.exercises.map { ex in
      WatchWorkoutExercise(
        name: ex.name,
        targetSets: ex.sets,
        targetReps: ex.reps,
        targetWeight: ex.weight,
        restSeconds: 90,
        logged: []
      )
    }
    let fallbackExercises = exercises.isEmpty ? [
      WatchWorkoutExercise(
        name: stateManager.gym.todayWorkoutName.isEmpty ? "Workout" : stateManager.gym.todayWorkoutName,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0,
        restSeconds: 90,
        logged: []
      )
    ] : exercises
    workoutManager.startWorkout(
      WatchActiveWorkout(sessionId: "local", exercises: fallbackExercises, startTime: Date())
    )
  }
}

#Preview {
  GymTabView()
    .environmentObject(WatchStateManager.shared)
    .environmentObject(WatchWorkoutManager.shared)
}
