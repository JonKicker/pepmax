/**
 * ZenModeView
 *
 * The core active cardio screen. Intentionally minimal — four metrics, nothing else.
 *
 * Font sizes: 48pt for Elapsed Time + Distance, 36pt for Pace + Heart Rate.
 * HR zone tints background with 15% opacity. High contrast text (white on dark).
 * Always-on display shows only time + distance (reduced luminance check).
 *
 * Stop: press-and-hold 2 seconds to prevent accidental stops. Ring animates during hold.
 */
import SwiftUI
import WatchKit

struct ZenModeView: View {
  @EnvironmentObject var cardioManager: WatchCardioManager
  @Environment(\.isLuminanceReduced) var isLuminanceReduced

  @State private var showSummary = false
  @State private var stopHoldProgress: CGFloat = 0
  @State private var isHoldingStop = false
  @State private var stopTimer: Timer? = nil

  var body: some View {
    ZStack {
      // Zone background tint
      zoneColor.opacity(isLuminanceReduced ? 0 : 0.15)
        .ignoresSafeArea()

      if isLuminanceReduced {
        alwaysOnLayout
      } else {
        activeLayout
      }
    }
    .navigationBarBackButtonHidden(true)
    .navigationDestination(isPresented: $showSummary) {
      PostWorkoutView()
        .environmentObject(cardioManager)
    }
    .onChange(of: cardioManager.phase) { newPhase in
      if newPhase == .summary { showSummary = true }
    }
  }

  // MARK: - Active Layout (4 metrics + stop)

  private var activeLayout: some View {
    VStack(spacing: 0) {
      // Elapsed Time — 48pt
      Text(formatTime(cardioManager.elapsedSeconds))
        .font(.system(size: 48, weight: .bold, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.7)
        .lineLimit(1)

      // Distance — 48pt
      Text(formatDistance(cardioManager.distance))
        .font(.system(size: 48, weight: .bold, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.7)
        .lineLimit(1)

      // Pace + HR row — 36pt each
      HStack(alignment: .bottom, spacing: 0) {
        // Pace
        VStack(alignment: .leading, spacing: 0) {
          Text(formatPace(cardioManager.currentPace))
            .font(.system(size: 36, weight: .semibold, design: .rounded))
            .foregroundColor(.white)
            .minimumScaleFactor(0.7)
            .lineLimit(1)
          Text("pace")
            .font(.system(size: 10))
            .foregroundColor(.secondary)
        }

        Spacer()

        // Heart rate
        VStack(alignment: .trailing, spacing: 0) {
          Text(cardioManager.heartRate > 0 ? "\(cardioManager.heartRate)" : "--")
            .font(.system(size: 36, weight: .semibold, design: .rounded))
            .foregroundColor(heartRateColor)
            .minimumScaleFactor(0.7)
            .lineLimit(1)
          HStack(spacing: 2) {
            Image(systemName: "heart.fill")
              .font(.system(size: 10))
              .foregroundColor(heartRateColor)
            Text("bpm")
              .font(.system(size: 10))
              .foregroundColor(.secondary)
          }
        }
      }
      .padding(.horizontal, 4)

      Spacer(minLength: 6)

      // Auto-pause overlay
      if cardioManager.autoPauseActive {
        Text("PAUSED")
          .font(.system(size: 14, weight: .bold))
          .foregroundColor(.yellow)
      }

      // Press-and-hold stop button
      stopButton
        .padding(.bottom, 4)
    }
    .padding(.horizontal, 6)
    .padding(.top, 4)
  }

  // MARK: - Always-On Layout (reduced luminance)

  private var alwaysOnLayout: some View {
    VStack(spacing: 8) {
      Text(formatTime(cardioManager.elapsedSeconds))
        .font(.system(size: 48, weight: .bold, design: .rounded))
        .foregroundColor(.white.opacity(0.7))
        .minimumScaleFactor(0.7)
        .lineLimit(1)

      Text(formatDistance(cardioManager.distance))
        .font(.system(size: 36, weight: .semibold, design: .rounded))
        .foregroundColor(.white.opacity(0.6))
        .minimumScaleFactor(0.7)
        .lineLimit(1)
    }
  }

  // MARK: - Stop Button (press-and-hold 2 seconds)

  private var stopButton: some View {
    ZStack {
      // Background circle
      Circle()
        .fill(Color.red.opacity(0.25))
        .frame(width: 48, height: 48)

      // Progress ring fills as user holds
      Circle()
        .trim(from: 0, to: stopHoldProgress)
        .stroke(Color.red, style: StrokeStyle(lineWidth: 3, lineCap: .round))
        .rotationEffect(.degrees(-90))
        .frame(width: 48, height: 48)
        .animation(
          isHoldingStop ? .linear(duration: 2.0) : .none,
          value: stopHoldProgress
        )

      Image(systemName: "stop.fill")
        .font(.system(size: 18))
        .foregroundColor(.red)
    }
    .gesture(
      DragGesture(minimumDistance: 0)
        .onChanged { _ in
          if !isHoldingStop {
            isHoldingStop = true
            stopHoldProgress = 1.0
            stopTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { _ in
              DispatchQueue.main.async {
                WKInterfaceDevice.current().play(.success)
                cardioManager.endSession()
              }
            }
          }
        }
        .onEnded { _ in
          isHoldingStop = false
          stopHoldProgress = 0
          stopTimer?.invalidate()
          stopTimer = nil
        }
    )
  }

  // MARK: - Zone Colors

  private var zoneColor: Color {
    switch cardioManager.currentHRZone {
    case 1: return Color(hex: "808080")
    case 2: return Color(hex: "2980B9")
    case 3: return Color(hex: "27AE60")
    case 4: return Color(hex: "E67E22")
    case 5: return Color(hex: "E74C3C")
    default: return .black
    }
  }

  private var heartRateColor: Color {
    switch cardioManager.currentHRZone {
    case 1: return Color(hex: "808080")
    case 2: return Color(hex: "2980B9")
    case 3: return Color(hex: "27AE60")
    case 4: return Color(hex: "E67E22")
    case 5: return Color(hex: "E74C3C")
    default: return .white
    }
  }

  // MARK: - Formatters

  private func formatTime(_ seconds: Double) -> String {
    let s = Int(seconds)
    if s >= 3600 {
      return String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }
    return String(format: "%d:%02d", s / 60, s % 60)
  }

  private func formatDistance(_ meters: Double) -> String {
    let unit = cardioManager.distanceUnit
    if unit == "km" {
      let km = meters / 1000.0
      return km < 100 ? String(format: "%.2f km", km) : String(format: "%.1f km", km)
    } else {
      let miles = meters / 1609.34
      return miles < 100 ? String(format: "%.2f mi", miles) : String(format: "%.1f mi", miles)
    }
  }

  private func formatPace(_ secPerKm: Double) -> String {
    guard secPerKm > 0 && secPerKm < 3600 else { return "--'--\"" }
    let pace: Double
    if cardioManager.distanceUnit == "mi" {
      pace = secPerKm * 1.60934  // convert to sec/mi
    } else {
      pace = secPerKm
    }
    let mins = Int(pace) / 60
    let secs = Int(pace) % 60
    return String(format: "%d'%02d\"", mins, secs)
  }
}

#Preview {
  ZenModeView()
    .environmentObject(WatchCardioManager.shared)
}
