import SwiftUI

struct NutritionTabView: View {
  @EnvironmentObject var stateManager: WatchStateManager

  private let accent = Color(hex: "27AE60")

  var body: some View {
    NavigationStack {
      if stateManager.hasSynced {
        NutritionGlanceView()
          .environmentObject(stateManager)
          .tint(accent)
      } else {
        NutritionEmptyView()
          .tint(accent)
      }
    }
  }
}

// MARK: - Nutrition Glance

struct NutritionGlanceView: View {
  @EnvironmentObject var stateManager: WatchStateManager

  private var n: WatchNutritionState { stateManager.nutrition }

  private var calorieProgress: Double {
    guard n.calorieTarget > 0 else { return 0 }
    return min(Double(n.calories) / Double(n.calorieTarget), 1.0)
  }

  private var proteinProgress: Double {
    guard n.proteinTarget > 0 else { return 0 }
    return min(Double(n.protein) / Double(n.proteinTarget), 1.0)
  }

  private var carbsProgress: Double {
    guard n.carbsTarget > 0 else { return 0 }
    return min(Double(n.carbs) / Double(n.carbsTarget), 1.0)
  }

  private var fatProgress: Double {
    guard n.fatTarget > 0 else { return 0 }
    return min(Double(n.fat) / Double(n.fatTarget), 1.0)
  }

  private var remainingCalories: Int {
    max(0, n.calorieTarget - n.calories)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {

        // ─── Concentric Ring Stack ──────────────────────────────────────
        ZStack {
          // Track rings (background)
          Circle()
            .stroke(Color.gray.opacity(0.25), lineWidth: 8)
            .frame(width: 110, height: 110)
          Circle()
            .stroke(Color.gray.opacity(0.2), lineWidth: 4)
            .frame(width: 86, height: 86)
          Circle()
            .stroke(Color.gray.opacity(0.2), lineWidth: 4)
            .frame(width: 70, height: 70)
          Circle()
            .stroke(Color.gray.opacity(0.2), lineWidth: 4)
            .frame(width: 54, height: 54)

          // Outer: calorie ring (green, lineWidth 8, radius ~55)
          Circle()
            .trim(from: 0, to: calorieProgress)
            .stroke(Color(hex: "27AE60"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
            .frame(width: 110, height: 110)
            .rotationEffect(.degrees(-90))
            .animation(.easeOut(duration: 0.4), value: calorieProgress)

          // Protein ring (red, lineWidth 4, radius ~43)
          Circle()
            .trim(from: 0, to: proteinProgress)
            .stroke(Color(hex: "E74C3C"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .frame(width: 86, height: 86)
            .rotationEffect(.degrees(-90))
            .animation(.easeOut(duration: 0.4), value: proteinProgress)

          // Carbs ring (yellow, lineWidth 4, radius ~35)
          Circle()
            .trim(from: 0, to: carbsProgress)
            .stroke(Color(hex: "F39C12"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .frame(width: 70, height: 70)
            .rotationEffect(.degrees(-90))
            .animation(.easeOut(duration: 0.4), value: carbsProgress)

          // Fat ring (blue, lineWidth 4, radius ~27)
          Circle()
            .trim(from: 0, to: fatProgress)
            .stroke(Color(hex: "2980B9"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
            .frame(width: 54, height: 54)
            .rotationEffect(.degrees(-90))
            .animation(.easeOut(duration: 0.4), value: fatProgress)

          // Center: remaining calories
          VStack(spacing: 2) {
            Text("\(remainingCalories)")
              .font(.system(size: 22, weight: .bold, design: .rounded))
              .foregroundColor(.white)
            Text("remaining")
              .font(.system(size: 9))
              .foregroundColor(.secondary)
          }
        }
        .frame(width: 120, height: 120)
        .padding(.top, 4)

        // ─── Macro Bars (kept for reference / detail) ───────────────────
        MacroBarView(label: "Protein", value: n.protein, target: n.proteinTarget, color: Color(hex: "E74C3C"))
        MacroBarView(label: "Carbs",   value: n.carbs,   target: n.carbsTarget,   color: Color(hex: "F39C12"))
        MacroBarView(label: "Fat",     value: n.fat,     target: n.fatTarget,     color: Color(hex: "2980B9"))

        // ─── Water Progress ─────────────────────────────────────────────
        if let goal = n.waterGoalOz, goal > 0 {
          let current = n.waterOz ?? 0
          HStack(spacing: 6) {
            Image(systemName: "drop.fill")
              .font(.system(size: 11))
              .foregroundColor(Color(hex: "2980B9"))
            Text(String(format: "%.0f / %.0f oz", current, goal))
              .font(.system(size: 12, weight: .medium, design: .rounded))
              .foregroundColor(.white)
          }
        }

        // ─── Log Water Navigation Link ──────────────────────────────────
        NavigationLink(destination: WaterTrackingView().environmentObject(stateManager)) {
          Label("Log Water", systemImage: "drop.fill")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(Color(hex: "2980B9"))
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .background(Color(hex: "2980B9").opacity(0.15))
            .cornerRadius(20)
        }
        .buttonStyle(.plain)

        // ─── Sync Time ──────────────────────────────────────────────────
        if let syncTime = stateManager.lastSyncTime {
          Text(syncTimeLabel(syncTime))
            .font(.system(size: 10))
            .foregroundColor(.secondary)
            .padding(.top, 4)
        }
      }
      .padding(.horizontal, 4)
    }
  }

  private func syncTimeLabel(_ date: Date) -> String {
    let minutes = Int(-date.timeIntervalSinceNow / 60)
    if minutes < 1 { return "Just updated" }
    if minutes == 1 { return "Updated 1 min ago" }
    if minutes < 60 { return "Updated \(minutes) min ago" }
    let hours = minutes / 60
    if hours == 1 { return "Updated 1 hr ago" }
    return "Updated \(hours) hrs ago"
  }
}

// MARK: - Macro Bar

struct MacroBarView: View {
  let label: String
  let value: Int
  let target: Int
  let color: Color

  private var progress: Double {
    guard target > 0 else { return 0 }
    return min(Double(value) / Double(target), 1.0)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack {
        Text(label)
          .font(.system(size: 11, weight: .medium))
          .foregroundColor(.secondary)
        Spacer()
        Text("\(value)/\(target)g")
          .font(.system(size: 11, weight: .medium, design: .rounded))
          .foregroundColor(.white)
      }
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          RoundedRectangle(cornerRadius: 3)
            .fill(Color.gray.opacity(0.3))
          RoundedRectangle(cornerRadius: 3)
            .fill(color)
            .frame(width: geo.size.width * progress)
            .animation(.easeOut(duration: 0.3), value: progress)
        }
      }
      .frame(height: 6)
    }
  }
}

// MARK: - Empty State

struct NutritionEmptyView: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "fork.knife")
        .font(.system(size: 28))
        .foregroundColor(Color(hex: "27AE60"))
      Text("Nutrition")
        .font(.headline)
      Text("Awaiting sync...")
        .font(.caption)
        .foregroundColor(.secondary)
    }
  }
}

#Preview {
  NutritionTabView()
    .environmentObject(WatchStateManager.shared)
}
