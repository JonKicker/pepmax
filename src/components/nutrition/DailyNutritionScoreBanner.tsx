/**
 * DailyNutritionScoreBanner — "Today's Nutrition Score: X/100" banner with
 * an animated progress bar.
 *
 * Rendered at the top of the meal sections on the nutrition home screen.
 * Hidden when no default slots have been logged (dailyScore is null).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { Theme } from '../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return '#34C759';
  if (score >= 50) return '#FF9500';
  return '#FF3B30';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  dailyScore: number | null;
  colors: Theme['colors'];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DailyNutritionScoreBanner({ dailyScore, colors }: Props): React.ReactElement | null {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (dailyScore === null) return;
    progress.value = withTiming(dailyScore / 100, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [dailyScore]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (dailyScore === null) return null;

  const color = getScoreColor(dailyScore);
  const label = getScoreLabel(dailyScore);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
      accessibilityRole="text"
      accessibilityLabel={`Today's nutrition score: ${dailyScore} out of 100, ${label}`}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Today's Nutrition Score</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color }]}>{dailyScore}</Text>
          <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>/100</Text>
          <View style={[styles.labelBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.labelText, { color }]}>{label}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: color + '22' }]}>
        <Reanimated.View
          style={[styles.fill, barStyle, { backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 13,
    fontWeight: '500',
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
