/**
 * MuscleHeatMapControls — toggle strip + stat chips for the Body Hub heat map mode.
 * Rendered between the layer tabs and the SVG when the muscles layer is active.
 *
 * Note: Colors are hardcoded white/alpha because this component renders inside
 * BodyHubHeroCard's dark gradient overlay, regardless of the app's light/dark theme setting.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { HeatMapMode, VolumeSummary } from '../../types/bodyHub';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  mode: HeatMapMode;
  onToggleMode: () => void;
  volumeSummary: VolumeSummary;
  imbalanceCount: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'k';
  }
  return String(Math.round(volume));
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MuscleHeatMapControls({
  mode,
  onToggleMode,
  volumeSummary,
  imbalanceCount,
}: Props) {
  const { colors } = useTheme();

  const isVolume = mode === 'volume';

  return (
    <View style={styles.container}>
      {/* Toggle pill */}
      <View style={[styles.togglePill, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            isVolume && styles.toggleOptionActive,
          ]}
          onPress={() => { if (!isVolume) onToggleMode(); }}
          accessibilityRole="button"
          accessibilityState={{ selected: isVolume }}
          accessibilityLabel="Volume heat map mode"
        >
          <Text
            style={[
              styles.toggleLabel,
              { color: isVolume ? '#E8E8E8' : colors.textSecondary },
            ]}
          >
            Volume
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleOption,
            !isVolume && styles.toggleOptionActive,
          ]}
          onPress={() => { if (isVolume) onToggleMode(); }}
          accessibilityRole="button"
          accessibilityState={{ selected: !isVolume }}
          accessibilityLabel="Recency heat map mode"
        >
          <Text
            style={[
              styles.toggleLabel,
              { color: !isVolume ? '#E8E8E8' : colors.textSecondary },
            ]}
          >
            Recency
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stat chips row */}
      <View style={styles.chipsRow}>
        {/* Total sets chip */}
        <View style={styles.chip}>
          <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.chipValue}>{volumeSummary.totalSets}</Text>
          <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>sets</Text>
        </View>

        {/* Total volume chip */}
        <View style={styles.chip}>
          <Ionicons name="barbell-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.chipValue}>{formatVolume(volumeSummary.totalVolume)}</Text>
          <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>vol</Text>
        </View>

        {/* Imbalance warning chip — only shown when imbalances exist */}
        {imbalanceCount > 0 && (
          <View style={[styles.chip, styles.chipWarning]}>
            <Ionicons name="warning-outline" size={12} color={Colors.warning} />
            <Text style={[styles.chipValue, { color: Colors.warning }]}>{imbalanceCount}</Text>
            <Text style={[styles.chipLabel, { color: Colors.warning, opacity: 0.7 }]}>
              {imbalanceCount === 1 ? 'imbalance' : 'imbalances'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  // ── Toggle pill ─────────────────────────────────────────────────────────────
  togglePill: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
    gap: 2,
  },
  toggleOption: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  toggleOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ── Stat chips ───────────────────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipWarning: {
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  chipValue: {
    color: '#E8E8E8', // approved dark-mode text per playbook
    fontSize: 11,
    fontWeight: '600',
  },
  chipLabel: {
    // textSecondary applied via inline style using useTheme — see component render
    fontSize: 10,
  },
});
