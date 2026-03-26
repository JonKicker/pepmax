import SwiftUI

struct ContentView: View {
  @EnvironmentObject var stateManager: WatchStateManager
  @EnvironmentObject var workoutManager: WatchWorkoutManager
  @EnvironmentObject var cardioManager: WatchCardioManager
  @EnvironmentObject var peptideManager: WatchPeptideManager

  @State private var selectedTab: Int = 0

  var body: some View {
    TabView(selection: $selectedTab) {
      ReadinessTabView()
        .environmentObject(stateManager)
        .tag(0)

      PeptideTabView()
        .environmentObject(stateManager)
        .environmentObject(peptideManager)
        .tag(1)

      GymTabView()
        .environmentObject(stateManager)
        .environmentObject(workoutManager)
        .tag(2)

      NutritionTabView()
        .environmentObject(stateManager)
        .tag(3)

      CardioTabView()
        .environmentObject(stateManager)
        .environmentObject(cardioManager)
        .tag(4)
    }
    .tabViewStyle(.verticalPage)
    .onOpenURL { url in
      guard url.scheme == "pepmax",
            url.host == "tab",
            let tabName = url.pathComponents.dropFirst().first
      else { return }

      switch tabName {
      case "readiness":  selectedTab = 0
      case "peptides":   selectedTab = 1
      case "gym":        selectedTab = 2
      case "nutrition":  selectedTab = 3
      case "cardio":     selectedTab = 4
      default:           break
      }
    }
  }
}

// MARK: - PremiumLockedView

struct PremiumLockedView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "lock.fill")
                .font(.system(size: 32))
                .foregroundColor(.gray)
            Text("Pro Feature")
                .font(.headline)
            Text("Upgrade to Pro\non your iPhone")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - Preview

#Preview {
  ContentView()
    .environmentObject(WatchStateManager.shared)
    .environmentObject(WatchWorkoutManager.shared)
    .environmentObject(WatchCardioManager.shared)
    .environmentObject(WatchPeptideManager.shared)
}
