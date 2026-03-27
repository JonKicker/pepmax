/**
 * Glp1ActiveBanner — persistent dashboard indicator shown when GLP-1 is active.
 *
 * Displays a compact, dismissible info card with the daily tip and a
 * protein floor summary. The user can tap it to expand/collapse the tip.
 * Not dismissible between sessions — it reappears on every load while the
 * cycle is active, keeping the guidance top-of-mind.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  proteinFloorG: number;
  tipOfDay: string;
  colors: Theme['colors'];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Glp1ActiveBanner({ proteinFloorG, tipOfDay, colors }: Props): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setExpanded((v) => !v)}
      style={[styles.container, { backgroundColor: GLP1_BG, borderColor: GLP1_BORDER }]}
      accessibilityRole="button"
      accessibilityLabel="GLP-1 active. Tap for nutrition tip."
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: GLP1_ACCENT }]} />
          <Text style={[styles.title, { color: GLP1_ACCENT }]}>GLP-1 Active</Text>
          <View style={[styles.badge, { backgroundColor: GLP1_ACCENT + '22' }]}>
            <Text style={[styles.badgeText, { color: GLP1_ACCENT }]}>
              {proteinFloorG}g protein floor
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </View>

      {/* Expanded tip */}
      {expanded && (
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={14} color={GLP1_ACCENT} style={styles.tipIcon} />
          <Text style={[styles.tipText, { color: colors.textPrimary }]}>{tipOfDay}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

// GLP-1 uses a teal accent distinct from the nutrition green to signal
// that this is a medication-context indicator, not a general progress metric.
const GLP1_ACCENT = Colors.teal;
const GLP1_BG = Colors.teal + '14';
const GLP1_BORDER = Colors.teal + '44';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 8,
  },
  tipIcon: {
    marginTop: 1,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
