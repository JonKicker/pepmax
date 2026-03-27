/**
 * TopTipCard — displays the weekly top tip with a lightbulb icon.
 * Used in the enhanced WeeklyCheckInModal comparison section.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  tip: string;
  backgroundColor: string;
  textPrimary: string;
  textSecondary: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TopTipCard({ tip, backgroundColor, textPrimary, textSecondary }: Props) {
  const { colors } = useTheme();
  return (
    <GlassCard intensity="subtle" style={styles.card} padding={12}>
      <View style={styles.inner}>
      <View style={styles.iconContainer}>
        <Ionicons name="bulb-outline" size={20} color={colors.warning} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: textSecondary }]}>Top Tip</Text>
        <Text style={[styles.tip, { color: textPrimary }]}>{tip}</Text>
      </View>
      </View>
    </GlassCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    marginTop: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tip: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
