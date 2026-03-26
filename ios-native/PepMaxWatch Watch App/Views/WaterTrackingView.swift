import SwiftUI
import WatchKit

struct WaterTrackingView: View {
  @EnvironmentObject var stateManager: WatchStateManager

  @State private var todayWaterOz: Double
  @State private var customAmount: Double = 8.0

  private var waterGoalOz: Double {
    stateManager.nutrition.waterGoalOz ?? 64
  }

  init() {
    // todayWaterOz initialized in .onAppear since EnvironmentObject not available at init
    _todayWaterOz = State(initialValue: 0)
  }

  private var ringProgress: Double {
    guard waterGoalOz > 0 else { return 0 }
    return min(todayWaterOz / waterGoalOz, 1.0)
  }

  var body: some View {
    if !stateManager.isPremium {
      PremiumLockedView()
    } else {
      ScrollView {
        VStack(spacing: 12) {

          // ─── Progress Ring ────────────────────────────────────────────
          ZStack {
            Circle()
              .stroke(Color.gray.opacity(0.3), lineWidth: 8)
            Circle()
              .trim(from: 0, to: ringProgress)
              .stroke(Color(hex: "2980B9"), style: StrokeStyle(lineWidth: 8, lineCap: .round))
              .rotationEffect(.degrees(-90))
              .animation(.easeOut(duration: 0.3), value: ringProgress)
            VStack(spacing: 2) {
              Text(String(format: "%.0f", todayWaterOz))
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundColor(.white)
              Text("/ \(Int(waterGoalOz)) oz")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            }
          }
          .frame(width: 90, height: 90)
          .padding(.top, 4)

          // ─── Quick Tap Buttons ────────────────────────────────────────
          HStack(spacing: 8) {
            QuickWaterButton(label: "8 oz",  systemImage: "drop.fill",    oz: 8)  { logWater(oz: 8)  }
            QuickWaterButton(label: "16 oz", systemImage: "drop.fill",    oz: 16) { logWater(oz: 16) }
            QuickWaterButton(label: "32 oz", systemImage: "waterbottle",  oz: 32) { logWater(oz: 32) }
          }

          Divider()

          // ─── Digital Crown Custom Amount ──────────────────────────────
          VStack(spacing: 6) {
            Text("Custom Amount")
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(.secondary)

            Text(String(format: "%.0f oz", customAmount))
              .font(.system(size: 18, weight: .bold, design: .rounded))
              .foregroundColor(.white)
              .focusable(true)
              .digitalCrownRotation(
                $customAmount,
                from: 1,
                through: 128,
                by: 1,
                sensitivity: .low,
                isContinuous: false,
                isHapticFeedbackEnabled: true
              )

            Button(action: { logWater(oz: customAmount) }) {
              Label("Log", systemImage: "plus.circle.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(hex: "2980B9"))
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, 4)
      }
      .navigationTitle("Water")
      .onAppear {
        todayWaterOz = stateManager.nutrition.waterOz ?? 0
      }
    }
  }

  // MARK: - Logging

  private func logWater(oz: Double) {
    todayWaterOz += oz
    WKInterfaceDevice.current().play(.click)
    stateManager.updateLocalWater(newTotalOz: todayWaterOz)

    WatchSessionManager.shared.sendMessageToPhone([
      "type": "WATER_LOGGED",
      "ozLogged": oz,
      "totalOz": todayWaterOz,
      "timestamp": Date().timeIntervalSince1970 * 1000
    ])
  }
}

// MARK: - QuickWaterButton

private struct QuickWaterButton: View {
  let label: String
  let systemImage: String
  let oz: Double
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 3) {
        Image(systemName: systemImage)
          .font(.system(size: 16))
          .foregroundColor(Color(hex: "2980B9"))
        Text(label)
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(.white)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 8)
      .background(Color(hex: "2980B9").opacity(0.2))
      .cornerRadius(10)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Preview

#Preview {
  WaterTrackingView()
    .environmentObject(WatchStateManager.shared)
}
