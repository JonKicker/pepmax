/**
 * PeptideTabView
 *
 * Full peptide dashboard for the Apple Watch.
 * Shows next dose time, site rotation suggestion, resupply warning,
 * and a "Log Injection" button that navigates to QuickLogView.
 *
 * States:
 *   - Not synced yet      → "Awaiting sync…"
 *   - No compound set     → "Open PepMax on iPhone"
 *   - Normal              → Compound + dose, next dose time, site suggestion, resupply
 */
import SwiftUI

struct PeptideTabView: View {
  @EnvironmentObject var stateManager: WatchStateManager
  @EnvironmentObject var peptideManager: WatchPeptideManager

  @State private var showQuickLog = false

  private let accent = Color(hex: "7B2D8E")

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 10) {
          // Header
          HStack(spacing: 6) {
            Image(systemName: "syringe.fill")
              .font(.system(size: 16))
              .foregroundColor(accent)
            Text("Peptides")
              .font(.headline)
              .foregroundColor(.primary)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal)

          if !stateManager.hasSynced {
            // Not synced yet
            Spacer(minLength: 12)
            Text("Awaiting sync…")
              .font(.caption)
              .foregroundColor(.secondary)
              .multilineTextAlignment(.center)
              .padding(.horizontal)
            Spacer(minLength: 12)

          } else if stateManager.peptide.compoundName.isEmpty {
            // No compound
            Spacer(minLength: 12)
            Image(systemName: "iphone")
              .font(.system(size: 22))
              .foregroundColor(.secondary)
            Text("Open PepMax on iPhone")
              .font(.caption2)
              .foregroundColor(.secondary)
              .multilineTextAlignment(.center)
              .padding(.horizontal)
            Spacer(minLength: 12)

          } else {
            // Normal state
            let peptide = stateManager.peptide

            // Compound + dose row
            VStack(alignment: .leading, spacing: 2) {
              Text(peptide.compoundName)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)
              Text("\(peptide.doseAmount) \(peptide.unit ?? "mcg")")
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)

            Divider()
              .padding(.horizontal)

            // Next dose time
            NextDoseRow(nextDoseTime: peptide.nextDoseTime, accent: accent)

            // Site rotation suggestion
            SiteRotationRow(peptide: peptide, accent: accent)

            // Resupply warning (show only when ≤ 14 days)
            if peptide.daysUntilResupply <= 14 {
              ResupplyRow(days: peptide.daysUntilResupply)
            }

            // Log Injection button
            Button {
              showQuickLog = true
            } label: {
              Label("Log Injection", systemImage: "plus.circle.fill")
                .font(.system(size: 13, weight: .semibold))
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .padding(.horizontal)
            .padding(.top, 4)
          }
        }
        .padding(.vertical, 10)
      }
      .navigationDestination(isPresented: $showQuickLog) {
        QuickLogView()
          .environmentObject(stateManager)
          .environmentObject(peptideManager)
      }
    }
    .tint(accent)
  }
}

// MARK: - Next Dose Row

private struct NextDoseRow: View {
  let nextDoseTime: Date?
  let accent: Color

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "clock.fill")
        .font(.system(size: 12))
        .foregroundColor(isOverdue ? .red : accent)
      Text(nextDoseLabel)
        .font(.caption2)
        .foregroundColor(isOverdue ? .red : .primary)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal)
  }

  private var isOverdue: Bool {
    guard let t = nextDoseTime else { return false }
    return t < Date()
  }

  private var nextDoseLabel: String {
    guard let t = nextDoseTime else { return "No dose scheduled" }
    if t < Date() { return "Overdue" }
    let diff = t.timeIntervalSinceNow
    let hours = Int(diff / 3600)
    let mins  = Int((diff.truncatingRemainder(dividingBy: 3600)) / 60)
    if hours > 0 {
      return "Next in \(hours)h \(mins)m"
    }
    return "Next in \(mins)m"
  }
}

// MARK: - Site Rotation Row

private struct SiteRotationRow: View {
  let peptide: WatchPeptideState
  let accent: Color

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: "arrow.triangle.2.circlepath")
        .font(.system(size: 11))
        .foregroundColor(accent)
      Group {
        if !peptide.lastInjectionSite.isEmpty,
           let last = WatchInjectionSite(rawValue: peptide.lastInjectionSite) {
          Text("Last: \(last.displayName)")
            .foregroundColor(.secondary)
          Text("→")
            .foregroundColor(.secondary)
        }
        if let suggested = peptide.suggestedNextSite,
           !suggested.isEmpty,
           let site = WatchInjectionSite(rawValue: suggested) {
          Text(site.displayName)
            .foregroundColor(accent)
            .fontWeight(.medium)
        }
      }
      .font(.caption2)
      .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal)
  }
}

// MARK: - Resupply Row

private struct ResupplyRow: View {
  let days: Int

  var body: some View {
    HStack(spacing: 6) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.system(size: 12))
        .foregroundColor(days < 3 ? .red : .yellow)
      Text(days <= 0 ? "Resupply needed" : "\(days)d until resupply")
        .font(.caption2)
        .foregroundColor(days < 3 ? .red : .yellow)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal)
  }
}

// MARK: - Preview

#Preview {
  PeptideTabView()
    .environmentObject(WatchStateManager.shared)
    .environmentObject(WatchPeptideManager.shared)
}
