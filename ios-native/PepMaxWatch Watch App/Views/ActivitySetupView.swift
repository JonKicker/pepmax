import SwiftUI

struct ActivitySetupView: View {
  @EnvironmentObject var cardioManager: WatchCardioManager
  @EnvironmentObject var stateManager: WatchStateManager

  @State private var selectedType: WatchCardioActivityType = .run
  @State private var isIndoor: Bool = false
  @State private var targetMode: TargetMode = .none
  @State private var targetDistance: Double = 5.0   // miles or km depending on unit
  @State private var targetMinutes: Int = 30

  private let accent = Color(hex: "2980B9")
  private var distanceUnit: String { stateManager.cardio.distanceUnit ?? "mi" }

  enum TargetMode: String, CaseIterable {
    case none = "None"
    case distance = "Distance"
    case time = "Time"
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 12) {
        // Activity type picker
        activityTypePicker

        // Indoor/Outdoor toggle (not for custom)
        Toggle("Indoor", isOn: $isIndoor)
          .font(.system(size: 14))
          .tint(accent)

        // Target picker
        targetSection

        // Go button
        Button {
          launchSession()
        } label: {
          Text("Go")
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(.green)
      }
      .padding(.horizontal, 4)
    }
    .navigationTitle("Setup")
    .navigationBarTitleDisplayMode(.inline)
  }

  // MARK: - Activity Type Picker

  private var activityTypePicker: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Activity")
        .font(.caption2)
        .foregroundColor(.secondary)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(WatchCardioActivityType.allCases, id: \.self) { type in
            Button {
              selectedType = type
            } label: {
              VStack(spacing: 3) {
                Image(systemName: type.systemImage)
                  .font(.system(size: 20))
                Text(type.displayName)
                  .font(.system(size: 10))
              }
              .frame(width: 52, height: 52)
              .background(selectedType == type ? accent : Color.gray.opacity(0.3))
              .cornerRadius(10)
              .foregroundColor(.white)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.vertical, 2)
      }
    }
  }

  // MARK: - Target Section

  private var targetSection: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Target")
        .font(.caption2)
        .foregroundColor(.secondary)

      Picker("Target", selection: $targetMode) {
        ForEach(TargetMode.allCases, id: \.self) { mode in
          Text(mode.rawValue).tag(mode)
        }
      }
      .pickerStyle(.wheel)
      .frame(height: 60)

      switch targetMode {
      case .none:
        EmptyView()

      case .distance:
        HStack {
          Text(String(format: "%.1f %@", targetDistance, distanceUnit))
            .font(.system(size: 18, weight: .semibold, design: .rounded))
            .focusable(true)
            .digitalCrownRotation(
              $targetDistance,
              from: 0.5,
              through: 50.0,
              by: 0.5,
              sensitivity: .medium,
              isContinuous: false,
              isHapticFeedbackEnabled: true
            )
          Spacer()
          Image(systemName: "arrow.up.arrow.down.circle")
            .foregroundColor(.secondary)
            .font(.caption)
        }

      case .time:
        HStack {
          Text("\(targetMinutes) min")
            .font(.system(size: 18, weight: .semibold, design: .rounded))
            .focusable(true)
            .digitalCrownRotation(
              Binding(
                get: { Double(targetMinutes) },
                set: { targetMinutes = max(1, Int($0)) }
              ),
              from: 5,
              through: 300,
              by: 5,
              sensitivity: .medium,
              isContinuous: false,
              isHapticFeedbackEnabled: true
            )
          Spacer()
          Image(systemName: "arrow.up.arrow.down.circle")
            .foregroundColor(.secondary)
            .font(.caption)
        }
      }
    }
  }

  // MARK: - Launch

  private func launchSession() {
    let target: WatchCardioTarget
    switch targetMode {
    case .none:
      target = .none
    case .distance:
      let meters = distanceUnit == "mi" ? targetDistance * 1609.34 : targetDistance * 1000.0
      target = .distance(meters: meters)
    case .time:
      target = .time(seconds: targetMinutes * 60)
    }

    cardioManager.configure(
      activityType: selectedType,
      indoor: isIndoor,
      target: target
    )
    // CardioTabView's onChange(of: cardioManager.phase) detects .active
    // and sets showZenMode = true — no need to navigate from here.
    cardioManager.startSession()
  }
}

#Preview {
  ActivitySetupView()
    .environmentObject(WatchCardioManager.shared)
    .environmentObject(WatchStateManager.shared)
}
