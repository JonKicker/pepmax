/**
 * MealScoreBadge — animated circular badge displaying a 0-100 meal quality score.
 *
 * Color-coded:
 *   Green  (80-100) — great meal
 *   Yellow (50-79)  — room for improvement
 *   Red    (<50)    — needs attention
 *
 * Entrance animation via Reanimated withTiming (scale + opacity).
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_GREEN = '#34C759';
const SCORE_YELLOW = '#FF9500';
const SCORE_RED = '#FF3B30';

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_GREEN;
  if (score >= 50) return SCORE_YELLOW;
  return SCORE_RED;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Great';
  if (score >= 50) return 'OK';
  return 'Low';
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  score: number;
  size?: 'sm' | 'md';
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MealScoreBadge({ score, size = 'sm' }: Props): React.ReactElement {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    scale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.5)) });
  }, [score]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const isSm = size === 'sm';

  const badgeSize = isSm ? 42 : 56;
  const borderRadius = badgeSize / 2;
  const fontSize = isSm ? 13 : 18;
  const labelSize = isSm ? 8 : 10;

  return (
    <Reanimated.View
      style={[
        styles.badge,
        animStyle,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius,
          borderColor: color,
          backgroundColor: color + '18',
        },
      ]}
      accessibilityLabel={`Meal score: ${score} out of 100, ${label}`}
      accessibilityRole="text"
    >
      <Text style={[styles.score, { color, fontSize }]}>{score}</Text>
      <Text style={[styles.label, { color, fontSize: labelSize }]}>{label}</Text>
    </Reanimated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '800',
    lineHeight: 16,
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 10,
  },
});
