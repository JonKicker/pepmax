/**
 * QuickLogView
 *
 * Dose logging form on the Apple Watch.
 *
 * Controls:
 *   - Digital Crown: adjusts dose in 0.05 increments
 *   - Site picker: 8 injection sites, suggested pre-selected
 *   - Timestamp: "Now" with -15m / +15m retroactive adjustments
 *   - Confirm button: sends payload, shows checkmark overlay, auto-dismisses
 *
 * Double-tap guard: peptideManager.isConfirming prevents double-send.
 */
import SwiftUI

struct QuickLogView: View {
  @EnvironmentObject var stateManager: WatchStateManager
  @EnvironmentObject var peptideManager: WatchPeptideManager
  @Environment(\.dismiss) private var dismiss

  @State private var crownValue: Double = 0
  @State private var timestampOffset: Int = 0   // minutes offset from "now" (-15, 0, +15)

  private let accent = Color(hex: "7B2D8E")

  var body: some View {
    ZStack {
      ScrollView {
        VStack(spacing: 10) {
          let peptide = stateManager.peptide

          // Compound name (read-only)
          Text(peptide.compoundName.isEmpty ? "Peptide" : peptide.compoundName)
            .font(.headline)
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity, alignment: .center)

          Divider()

          // Dose display (driven by Digital Crown)
          VStack(spacing: 2) {
            Text(String(format: "%.2f", peptideManager.adjustedDose))
              .font(.system(size: 28, weight: .bold, design: .rounded))
              .foregroundColor(accent)
              .focusable(true)
              .digitalCrownRotation(
                $crownValue,
                from: 0,
                through: 1000,
                by: 0.05,
                sensitivity: .medium,
                isContinuous: false,
                isHapticFeedbackEnabled: true
              )
            Text(peptide.unit ?? "mcg")
              .font(.caption)
              .foregroundColor(.secondary)
          }

          Divider()

          // Site picker
          Text("Injection Site")
            .font(.caption2)
            .foregroundColor(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)

          ForEach(WatchInjectionSite.allCases, id: \.self) { site in
            Button {
              peptideManager.selectedSite = site
            } label: {
              HStack {
                Text(site.displayName)
                  .font(.caption)
                  .foregroundColor(peptideManager.selectedSite == site ? .white : .primary)
                Spacer()
                if peptideManager.selectedSite == site {
                  Image(systemName: "checkmark")
                    .font(.caption2)
                    .foregroundColor(.white)
                }
              }
              .padding(.horizontal, 10)
              .padding(.vertical, 6)
              .background(
                peptideManager.selectedSite == site ? accent : Color.secondary.opacity(0.15)
              )
              .cornerRadius(8)
            }
            .buttonStyle(.plain)
          }

          Divider()

          // Timestamp: ±15 min
          VStack(spacing: 4) {
            Text("Time")
              .font(.caption2)
              .foregroundColor(.secondary)
            HStack(spacing: 12) {
              Button {
                if timestampOffset > -60 {
                  timestampOffset -= 15
                  updateTimestamp()
                }
              } label: {
                Image(systemName: "minus.circle")
                  .font(.system(size: 18))
                  .foregroundColor(timestampOffset <= -60 ? .secondary : accent)
              }
              .buttonStyle(.plain)
              .disabled(timestampOffset <= -60)

              Text(timestampLabel)
                .font(.caption2)
                .foregroundColor(.primary)
                .frame(minWidth: 60)

              Button {
                if timestampOffset < 0 {
                  timestampOffset += 15
                  updateTimestamp()
                }
              } label: {
                Image(systemName: "plus.circle")
                  .font(.system(size: 18))
                  .foregroundColor(timestampOffset >= 0 ? .secondary : accent)
              }
              .buttonStyle(.plain)
              .disabled(timestampOffset >= 0)
            }
          }

          // Confirm button
          Button {
            peptideManager.confirmDoseLog(state: stateManager.peptide)
          } label: {
            Label("Confirm", systemImage: "checkmark.circle.fill")
              .font(.system(size: 13, weight: .semibold))
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(.borderedProminent)
          .tint(accent)
          .disabled(peptideManager.isConfirming || peptideManager.adjustedDose <= 0)
          .padding(.top, 4)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 4)
      }

      // Success overlay
      if peptideManager.logSuccess {
        ZStack {
          Color.black.opacity(0.85).ignoresSafeArea()
          VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
              .font(.system(size: 48))
              .foregroundColor(.green)
            Text("Logged!")
              .font(.headline)
              .foregroundColor(.white)
          }
        }
        .transition(.opacity)
      }
    }
    .animation(.easeInOut(duration: 0.2), value: peptideManager.logSuccess)
    .onAppear {
      peptideManager.prepareDoseLog(from: stateManager.peptide)
      crownValue = peptideManager.adjustedDose
    }
    .onChange(of: crownValue) { newValue in
      // Round to nearest 0.05 (crown does this, but enforce on our side too)
      let rounded = (newValue * 20).rounded() / 20
      peptideManager.adjustedDose = max(0, rounded)
    }
    .onChange(of: peptideManager.logSuccess) { success in
      if success {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
          peptideManager.reset()
          dismiss()
        }
      }
    }
  }

  // MARK: - Helpers

  private var timestampLabel: String {
    if timestampOffset == 0 { return "Now" }
    let absMin = abs(timestampOffset)
    return "\(absMin)m ago"
  }

  private func updateTimestamp() {
    let adjusted = Calendar.current.date(
      byAdding: .minute,
      value: timestampOffset,
      to: Date()
    ) ?? Date()
    peptideManager.logTimestamp = adjusted
  }
}

// MARK: - Preview

#Preview {
  QuickLogView()
    .environmentObject(WatchStateManager.shared)
    .environmentObject(WatchPeptideManager.shared)
}
