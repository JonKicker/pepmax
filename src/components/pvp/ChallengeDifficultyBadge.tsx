/**
 * ChallengeDifficultyBadge — compact badge showing challenge difficulty + XP reward.
 *
 * Sizes:
 *   sm — compact inline chip (label + XP on one line)
 *   md — full badge with separate XP line
 *
 * extreme: subtle opacity pulse animation, gated by useReducedMotion.
 *
 * useReducedMotion: extreme badge shows static, no animation.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getDifficultyConfig } from '../../utils/pvpEventUtils';
import type { ChallengeDifficulty } from '../../types/pvpEvents';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  difficulty: ChallengeDifficulty;
  xpReward: number;
  size?: 'sm' | 'md';
};

// ─── Difficulty color constants ───────────────────────────────────────────────
// These are difficulty-semantic colors — they must be visually consistent
// across all themes (gray/orange/red communicate "easy/medium/hard" universally).
// They are NOT brand colors and do not map to theme tokens.

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, { bg: string; text: string }> = {
  normal:  { bg: '#3A3A4A', text: '#A0A0B8' },
  hard:    { bg: '#5C3A1A', text: '#F39C12' },
  extreme: { bg: '#4A1A1A', text: '#E17055' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ChallengeDifficultyBadge({ difficulty, xpReward, size = 'md' }: Props) {
  const reducedMotion = useReducedMotion();
  const config = getDifficultyConfig(difficulty);
  const colors = DIFFICULTY_COLORS[difficulty];

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (difficulty === 'extreme' && !reducedMotion) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [difficulty, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  const accessibilityLabel = `${config.label} difficulty, ${xpReward} XP reward`;

  if (size === 'sm') {
    return (
      <Animated.View
        style={[
          styles.smContainer,
          { backgroundColor: colors.bg },
          difficulty === 'extreme' && pulseStyle,
        ]}
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={[styles.smLabel, { color: colors.text }]}>
          {config.label}
        </Text>
        <Text style={[styles.smXp, { color: colors.text }]}>
          {' · '}{xpReward} XP
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.mdContainer,
        { backgroundColor: colors.bg },
        difficulty === 'extreme' && pulseStyle,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        style={[
          styles.mdLabel,
          { color: colors.text },
          difficulty !== 'normal' && styles.bold,
        ]}
      >
        {config.label}
      </Text>
      <Text style={[styles.mdXp, { color: colors.text }]}>
        {xpReward} XP
      </Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  smContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  smLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  smXp: {
    fontSize: 11,
    fontWeight: '500',
  },
  mdContainer: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  mdLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  mdXp: {
    fontSize: 12,
    fontWeight: '700',
  },
  bold: {
    fontWeight: '800',
  },
});
