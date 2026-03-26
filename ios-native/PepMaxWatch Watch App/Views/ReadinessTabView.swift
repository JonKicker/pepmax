import SwiftUI

// MARK: - ReadinessTabView

struct ReadinessTabView: View {
  @EnvironmentObject var stateManager: WatchStateManager

  private var r: WatchReadinessState { stateManager.readiness }

  private var scoreColor: Color {
    switch r.score {
    case 75...100: return Color(hex: "27AE60")
    case 40..<75:  return Color(hex: "F39C12")
    default:       return Color(hex: "E74C3C")
    }
  }

  var body: some View {
    if !stateManager.hasSynced || r.score == 0 {
      VStack(spacing: 10) {
        Image(systemName: "heart.circle.fill")
          .font(.system(size: 36))
          .foregroundColor(.gray)
        Text("Awaiting sync...")
          .font(.caption)
          .foregroundColor(.secondary)
      }
      .tint(.red)
    } else {
      ScrollView {
        VStack(spacing: 10) {

          // ─── Score Circle ───────────────────────────────────────────────
          ZStack {
            Circle()
              .fill(scoreColor.opacity(0.2))
              .frame(width: 120, height: 120)
            Circle()
              .stroke(scoreColor, lineWidth: 4)
              .frame(width: 120, height: 120)
            VStack(spacing: 2) {
              Text("\(r.score)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundColor(scoreColor)
              Text("/ 100")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
            }
          }
          .padding(.top, 4)

          // ─── Recommendation ─────────────────────────────────────────────
          if !r.recommendation.isEmpty {
            Text(r.recommendation)
              .font(.system(size: 12))
              .foregroundColor(.secondary)
              .multilineTextAlignment(.center)
              .lineLimit(3)
              .padding(.horizontal, 4)
          }

          // ─── Factor Rows ─────────────────────────────────────────────────
          VStack(spacing: 6) {
            FactorRowView(
              icon: "bed.double.fill",
              iconColor: Color(hex: "2980B9"),
              label: "Sleep",
              value: String(format: "%.1f hrs", r.sleepHours),
              trendSymbol: nil,
              trendColor: nil
            )

            FactorRowView(
              icon: "heart.fill",
              iconColor: Color(hex: "E74C3C"),
              label: "Resting HR",
              value: r.restingHR > 0 ? "\(r.restingHR) bpm" : "--",
              trendSymbol: hrTrendSymbol,
              trendColor: hrTrendColor
            )

            FactorRowView(
              icon: "waveform.path.ecg",
              iconColor: Color(hex: "27AE60"),
              label: "HRV",
              value: r.hrvMs > 0 ? "\(r.hrvMs) ms" : "--",
              trendSymbol: hrvTrendSymbol,
              trendColor: hrvTrendColor
            )

            FactorRowView(
              icon: "figure.strengthtraining.traditional",
              iconColor: Color(hex: "F39C12"),
              label: "Training",
              value: r.trainingLoadLabel?.capitalized ?? "Unknown",
              trendSymbol: nil,
              trendColor: nil
            )
          }

          // ─── Sync Time ───────────────────────────────────────────────────
          if let syncTime = stateManager.lastSyncTime {
            Text(syncTimeLabel(syncTime))
              .font(.system(size: 10))
              .foregroundColor(.secondary)
              .padding(.top, 4)
          }
        }
        .padding(.horizontal, 4)
      }
      .tint(.red)
    }
  }

  // MARK: - Trend helpers (RHR: down = good = green; HRV: up = good = green)

  private var hrTrendSymbol: String? {
    switch r.hrTrend {
    case "up":   return "arrow.up"
    case "down": return "arrow.down"
    default:     return nil
    }
  }

  private var hrTrendColor: Color? {
    switch r.hrTrend {
    case "up":   return Color(hex: "E74C3C")   // RHR up = bad = red
    case "down": return Color(hex: "27AE60")   // RHR down = good = green
    default:     return nil
    }
  }

  private var hrvTrendSymbol: String? {
    switch r.hrvTrend {
    case "up":   return "arrow.up"
    case "down": return "arrow.down"
    default:     return nil
    }
  }

  private var hrvTrendColor: Color? {
    switch r.hrvTrend {
    case "up":   return Color(hex: "27AE60")   // HRV up = good = green
    case "down": return Color(hex: "E74C3C")   // HRV down = bad = red
    default:     return nil
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

// MARK: - FactorRowView

struct FactorRowView: View {
  let icon: String
  let iconColor: Color
  let label: String
  let value: String
  let trendSymbol: String?
  let trendColor: Color?

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: icon)
        .font(.system(size: 13))
        .foregroundColor(iconColor)
        .frame(width: 18)

      Text(label)
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.secondary)

      Spacer()

      Text(value)
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .foregroundColor(.white)

      if let symbol = trendSymbol, let color = trendColor {
        Image(systemName: symbol)
          .font(.system(size: 10, weight: .bold))
          .foregroundColor(color)
      }
    }
    .padding(.horizontal, 4)
  }
}

// MARK: - Preview

#Preview {
  ReadinessTabView()
    .environmentObject(WatchStateManager.shared)
}
