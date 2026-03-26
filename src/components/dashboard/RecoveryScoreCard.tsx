/**
 * RecoveryScoreCard — dashboard card showing the 0–100 recovery readiness score.
 * Replaces the old RecoveryCard (which showed a 0.5–1.5× multiplier).
 *
 * States:
 *  - Has new-style score: circular gauge + zone label + recommendation
 *  - Has legacy multiplier only: old-style multiplier display (backward compat)
 *  - No score: CTA button to start morning check-in
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DashboardCard } from './DashboardCard';
import { ScoreGauge } from '../recovery/ScoreGauge';
import { Colors } from '../../constants/theme';
import { multiplierColor, multiplierLabel } from '../../utils/recovery';
import type { Theme } from '../../constants/theme';
import type { RecoveryScoreDoc } from '../../types/recoveryScore';

type Props = {
  recovery: RecoveryScoreDoc | null;
  colors: Theme['colors'];
  onCheckIn: () => void;
  onDetail: () => void;
};

export function RecoveryScoreCard({ recovery, colors, onCheckIn, onDetail }: Props) {
  // New-style score available
  if (recovery?.recoveryScore != null) {
    const rec = recovery.recommendations?.[0] ?? '';
    return (
      <DashboardCard
        title="Recovery"
        icon="fitness-outline"
        iconColor={Colors.accent}
        colors={colors}
        onPress={onDetail}
      >
        <View style={styles.scoreRow}>
          <ScoreGauge
            score={recovery.recoveryScore}
            size={80}
            strokeWidth={8}
            colors={colors}
            showLabel={false}
          />
          <View style={styles.scoreInfo}>
            <Text style={[styles.zoneLabel, { color: colors.textPrimary }]}>
              {recovery.label ?? 'Recovery'}
            </Text>
            {rec ? (
              <Text
                style={[styles.recommendation, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {rec}
              </Text>
            ) : null}
          </View>
        </View>
      </DashboardCard>
    );
  }

  // Legacy: has multiplier but no new score (old check-in data)
  if (recovery?.recoveryMultiplier != null) {
    return (
      <DashboardCard
        title="Recovery"
        icon="fitness-outline"
        iconColor={Colors.accent}
        colors={colors}
      >
        <View style={styles.legacy}>
          <Text
            style={[
              styles.legacyScore,
              { color: multiplierColor(recovery.recoveryMultiplier) },
            ]}
          >
            {`${recovery.recoveryMultiplier}\u00D7`}
          </Text>
          <Text style={[styles.legacyLabel, { color: colors.textSecondary }]}>
            {multiplierLabel(recovery.recoveryMultiplier)}
          </Text>
        </View>
      </DashboardCard>
    );
  }

  // No score — CTA
  return (
    <DashboardCard
      title="Recovery"
      icon="fitness-outline"
      iconColor={Colors.accent}
      colors={colors}
    >
      <View style={styles.cta}>
        <Text style={[styles.ctaPrompt, { color: colors.textSecondary }]}>
          How are you feeling?
        </Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: Colors.accent }]}
          onPress={onCheckIn}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaBtnText}>Check In</Text>
        </TouchableOpacity>
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreInfo: {
    flex: 1,
    gap: 4,
  },
  zoneLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  recommendation: {
    fontSize: 13,
    lineHeight: 18,
  },
  legacy: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  legacyScore: {
    fontSize: 36,
    fontWeight: '800',
  },
  legacyLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPrompt: {
    fontSize: 14,
  },
  ctaBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
