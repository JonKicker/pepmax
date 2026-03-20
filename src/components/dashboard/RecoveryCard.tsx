/**
 * RecoveryCard — displays today's readiness score or prompts for a check-in.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { RecoveryInput } from '../../types/recovery';
import { multiplierColor } from '../../utils/recovery';

type Props = {
  recovery: RecoveryInput | null;
  colors: Theme['colors'];
  onCheckIn: () => void;
};

const QUALITY_EMOJI: Record<number, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export function RecoveryCard({ recovery, colors, onCheckIn }: Props) {
  return (
    <DashboardCard
      title="Recovery"
      icon="bed-outline"
      iconColor={Colors.accent}
      colors={colors}
    >
      {recovery ? (
        <View style={styles.hasData}>
          <Text style={[styles.score, { color: multiplierColor(recovery.recoveryMultiplier) }]}>
            {recovery.readinessScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
            Readiness Score
          </Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            Sleep: {recovery.sleepHours}h · {QUALITY_EMOJI[recovery.sleepQuality] ?? ''}
            {recovery.overallReadiness != null
              ? `  ·  Readiness: ${recovery.overallReadiness}/10`
              : ''}
          </Text>
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            How are you feeling?
          </Text>
          <TouchableOpacity
            style={[styles.checkInBtn, { backgroundColor: Colors.accent }]}
            onPress={onCheckIn}
            activeOpacity={0.7}
          >
            <Text style={styles.checkInText}>Check In</Text>
          </TouchableOpacity>
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  hasData: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  detail: {
    fontSize: 14,
  },
  noData: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prompt: {
    fontSize: 14,
  },
  checkInBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkInText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
