/**
 * WinStreakBadge — shows consecutive duel win streak.
 *
 * streak < 3:  renders null
 * streak 3-4:  flame-outline icon, warm orange
 * streak 5-9:  flame icon (filled), bright orange, subtle pulse
 * streak 10+:  skull icon, red, pulse
 *
 * useReducedMotion: no pulse animation.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// ─── Constants ────────────────────────────────────────────────────────────────

const WARM_ORANGE = '#E17055';
const BRIGHT_ORANGE = '#FD9644';
const STREAK_RED = '#FF3B30';
const TEXT_COLOR = '#FFFFFF';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  streak: number;
  style?: ViewStyle;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StreakConfig = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  shouldPulse: boolean;
};

function getStreakConfig(streak: number): StreakConfig | null {
  if (streak < 3) return null;
  if (streak <= 4) {
    return { iconName: 'flame-outline', color: WARM_ORANGE, shouldPulse: false };
  }
  if (streak <= 9) {
    return { iconName: 'flame', color: BRIGHT_ORANGE, shouldPulse: true };
  }
  // 10+
  return { iconName: 'skull', color: STREAK_RED, shouldPulse: true };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WinStreakBadge({ streak, style }: Props) {
  const reducedMotion = useReducedMotion();

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  const config = getStreakConfig(streak);

  useEffect(() => {
    if (!config || !config.shouldPulse || reducedMotion) {
      pulseScale.value = 1;
      pulseOpacity.value = 1;
      return;
    }

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [streak, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  if (!config) return null;

  return (
    <Animated.View style={[styles.container, { borderColor: config.color + '44' }, style, animatedStyle]}>
      <Ionicons name={config.iconName} size={14} color={config.color} />
      <Text style={[styles.streakText, { color: config.color }]}>
        {streak}
      </Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
