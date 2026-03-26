/**
 * PostWorkoutView
 *
 * Post-session summary screen. Shown after endSession() completes.
 * Displays: stats grid, HR zone bar chart, split times.
 * "Save" button sends session to phone and pops back to CardioTabView.
 *
 * isSaving flag prevents double-tap. (Pattern from WorkoutSummaryView.)
 */
import SwiftUI
import WatchKit

struct PostWorkoutView: View {
  @EnvironmentObject var cardioManager: WatchCardioManager
  @State private var isSaving = false

  private let accent = Color(hex: "2980B9")

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        // Header
        VStack(spacing: 4) {
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 28))
            .foregroundColor(.green)
          Text("Workout Complete")
            .font(.headline)
        }

        // Stats grid
        if let result = cardioManager.sessionResult {
          statsGrid(result: result)
          if let zones = result.timeInZones, zones.contains(where: { $0.seconds > 0 }) {
            zoneChart(zones: zones)
          }
          if !result.splits.isEmpty {
            splitsSection(splits: result.splits)
          }
        }

        // Save button — disabled until buildAndSendResult() has populated sessionResult.
        // This prevents reset() from firing before the HK callback captures session data.
        let resultReady = cardioManager.sessionResult != nil
        Button {
          guard !isSaving, resultReady else { return }
          isSaving = true
          WKInterfaceDevice.current().play(.success)
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            cardioManager.reset()
          }
        } label: {
          if isSaving {
            ProgressView()
              .frame(maxWidth: .infinity)
          } else if !resultReady {
            HStack {
              ProgressView().scaleEffect(0.7)
              Text("Saving...")
                .font(.system(size: 14))
            }
            .frame(maxWidth: .infinity)
          } else {
            Text("Save")
              .frame(maxWidth: .infinity)
              .font(.system(size: 14, weight: .semibold))
          }
        }
        .buttonStyle(.borderedProminent)
        .tint(accent)
        .disabled(isSaving || !resultReady)
      }
      .padding(.horizontal, 4)
    }
    .navigationBarBackButtonHidden(true)
  }

  // MARK: - Stats Grid

  private func statsGrid(result: WatchCardioSessionResult) -> some View {
    let distanceStr = formatDistance(result.distance)
    let durationStr = formatTime(result.duration)
    let paceStr = formatPace(result.averagePace)
    let hrStr = result.avgHeartRate.map { "\($0) bpm" } ?? "--"

    return VStack(spacing: 6) {
      HStack(spacing: 4) {
        statCell(label: "Distance", value: distanceStr)
        statCell(label: "Time", value: durationStr)
      }
      HStack(spacing: 4) {
        statCell(label: "Avg Pace", value: paceStr)
        statCell(label: "Avg HR", value: hrStr)
      }
    }
  }

  private func statCell(label: String, value: String) -> some View {
    VStack(spacing: 2) {
      Text(value)
        .font(.system(size: 16, weight: .bold, design: .rounded))
        .foregroundColor(.white)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
      Text(label)
        .font(.system(size: 9))
        .foregroundColor(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(6)
    .background(Color.white.opacity(0.08))
    .cornerRadius(8)
  }

  // MARK: - Zone Chart

  private func zoneChart(zones: [WatchCardioTimeInZone]) -> some View {
    let total = max(zones.reduce(0) { $0 + $1.seconds }, 1)
    return VStack(alignment: .leading, spacing: 4) {
      Text("Heart Rate Zones")
        .font(.caption2)
        .foregroundColor(.secondary)

      ForEach(zones.filter { $0.seconds > 0 }, id: \.zone) { zone in
        HStack(spacing: 6) {
          Text("Z\(zone.zone)")
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.white)
            .frame(width: 20)

          GeometryReader { geo in
            let width = CGFloat(zone.seconds / total) * geo.size.width
            ZStack(alignment: .leading) {
              RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.2))
              RoundedRectangle(cornerRadius: 3)
                .fill(Color(hex: zone.color))
                .frame(width: max(width, 4))
            }
          }
          .frame(height: 8)

          Text(formatShortTime(zone.seconds))
            .font(.system(size: 9))
            .foregroundColor(.secondary)
            .frame(width: 28, alignment: .trailing)
        }
      }
    }
    .padding(.vertical, 4)
  }

  // MARK: - Splits Section

  private func splitsSection(splits: [WatchCardioSplit]) -> some View {
    let fastestPace = splits.min(by: { $0.pace < $1.pace })?.pace

    return VStack(alignment: .leading, spacing: 4) {
      Text("Splits")
        .font(.caption2)
        .foregroundColor(.secondary)

      ForEach(splits, id: \.splitNumber) { split in
        HStack {
          Text("# \(split.splitNumber)")
            .font(.system(size: 11))
            .foregroundColor(.secondary)
            .frame(width: 24, alignment: .leading)

          Text(formatShortTime(split.time))
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.white)

          Spacer()

          Text(formatPace(split.pace))
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(split.pace == fastestPace ? .green : .white)
        }
        .padding(.vertical, 2)
      }
    }
    .padding(.vertical, 4)
  }

  // MARK: - Formatters

  private func formatTime(_ seconds: Double) -> String {
    let s = Int(seconds)
    if s >= 3600 {
      return String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    }
    return String(format: "%d:%02d", s / 60, s % 60)
  }

  private func formatShortTime(_ seconds: Double) -> String {
    let s = Int(seconds)
    return String(format: "%d:%02d", s / 60, s % 60)
  }

  private func formatDistance(_ meters: Double) -> String {
    let unit = cardioManager.distanceUnit
    if unit == "km" {
      return String(format: "%.2f km", meters / 1000.0)
    } else {
      return String(format: "%.2f mi", meters / 1609.34)
    }
  }

  private func formatPace(_ secPerKm: Double) -> String {
    guard secPerKm > 0 && secPerKm < 3600 else { return "--'--\"" }
    let pace: Double
    if cardioManager.distanceUnit == "mi" {
      pace = secPerKm * 1.60934
    } else {
      pace = secPerKm
    }
    let mins = Int(pace) / 60
    let secs = Int(pace) % 60
    return String(format: "%d'%02d\"", mins, secs)
  }
}

#Preview {
  PostWorkoutView()
    .environmentObject(WatchCardioManager.shared)
}
