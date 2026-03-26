import SwiftUI

struct CardioTabView: View {
  @EnvironmentObject var stateManager: WatchStateManager
  @EnvironmentObject var cardioManager: WatchCardioManager

  @State private var showSetup = false
  @State private var showZenMode = false

  private let accent = Color(hex: "2980B9")

  var body: some View {
    NavigationStack {
      mainContent
        .navigationDestination(isPresented: $showSetup) {
          ActivitySetupView()
            .environmentObject(cardioManager)
            .environmentObject(stateManager)
        }
        .navigationDestination(isPresented: $showZenMode) {
          ZenModeView()
            .environmentObject(cardioManager)
        }
    }
    .tint(accent)
    .onChange(of: cardioManager.phase) { newPhase in
      // When session ends, pop all the way back here
      if newPhase == .idle {
        showSetup = false
        showZenMode = false
      }
      // If an active session exists and we're back on the tab, surface ZenMode
      if newPhase == .active || newPhase == .paused {
        showZenMode = true
      }
    }
  }

  @ViewBuilder
  private var mainContent: some View {
    switch cardioManager.phase {
    case .active, .paused:
      // Active session — show Resume button
      resumeView

    default:
      // Idle — show weekly summary and Start button
      idleView
    }
  }

  private var idleView: some View {
    ScrollView {
      VStack(spacing: 10) {
        Image(systemName: "figure.run")
          .font(.system(size: 32))
          .foregroundColor(accent)

        Text("Cardio")
          .font(.headline)

        if stateManager.hasSynced && stateManager.cardio.weeklyGoalMiles > 0 {
          // Weekly distance progress
          VStack(spacing: 4) {
            ProgressView(
              value: min(stateManager.cardio.weeklyDistanceMiles,
                         stateManager.cardio.weeklyGoalMiles),
              total: stateManager.cardio.weeklyGoalMiles
            )
            .tint(accent)
            .progressViewStyle(.linear)

            Text(String(format: "%.1f / %.1f mi",
                        stateManager.cardio.weeklyDistanceMiles,
                        stateManager.cardio.weeklyGoalMiles))
              .font(.caption2)
              .foregroundColor(.secondary)
          }

          if !stateManager.cardio.lastActivitySummary.isEmpty {
            Text(stateManager.cardio.lastActivitySummary)
              .font(.caption2)
              .foregroundColor(.secondary)
              .multilineTextAlignment(.center)
              .lineLimit(2)
          }
        } else {
          Text("Awaiting sync...")
            .font(.caption2)
            .foregroundColor(.secondary)
        }

        Button {
          showSetup = true
        } label: {
          Label("Start Activity", systemImage: "play.fill")
            .font(.system(size: 14, weight: .semibold))
        }
        .buttonStyle(.borderedProminent)
        .tint(accent)
      }
      .padding(.horizontal, 4)
    }
  }

  private var resumeView: some View {
    VStack(spacing: 10) {
      Image(systemName: "figure.run")
        .font(.system(size: 28))
        .foregroundColor(accent)

      Text("Session Active")
        .font(.headline)

      Text(formatElapsed(cardioManager.elapsedSeconds))
        .font(.system(size: 24, weight: .bold, design: .rounded))
        .foregroundColor(.white)

      Button {
        showZenMode = true
      } label: {
        Label("Resume", systemImage: "arrow.forward.circle.fill")
          .font(.system(size: 14, weight: .semibold))
      }
      .buttonStyle(.borderedProminent)
      .tint(accent)
    }
  }

  private func formatElapsed(_ seconds: Double) -> String {
    let s = Int(seconds)
    if s >= 3600 {
      return String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }
    return String(format: "%d:%02d", s / 60, s % 60)
  }
}

#Preview {
  CardioTabView()
    .environmentObject(WatchStateManager.shared)
    .environmentObject(WatchCardioManager.shared)
}
