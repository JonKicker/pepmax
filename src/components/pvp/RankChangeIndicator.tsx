/**
 * RankChangeIndicator — shows rank movement with up/down arrows.
 *
 * change > 0:  green up arrow + "+X"
 * change < 0:  red down arrow + "-X"
 * change === 0: gray dash
 * isNew:  "NEW" badge in accent color
 *
 * Animated entrance: slides in from right (withTiming, 200ms).
 * useReducedMotion: instant display.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// ─── Constants ────────────────────────────────────────────────────────────────

const UP_COLOR = '#00B894';
const DOWN_COLOR = '#E17055';
const NEUTRAL_COLOR = '#636E72';
const ACCENT = '#6C5CE7';
const TEXT_COLOR = '#FFFFFF';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  change: number;
  isNew?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RankChangeIndicator({ change, isNew }: Props) {
  const reducedMotion = useReducedMotion();

  const translateX = useSharedValue(reducedMotion ? 0 : 16);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      translateX.value = 0;
      opacity.value = 1;
    } else {
      translateX.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [reducedMotion, change, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (isNew) {
    return (
      <Animated.View style={[styles.container, animStyle]}>
        <View style={[styles.newBadge, { backgroundColor: ACCENT + '33', borderColor: ACCENT + '66' }]}>
          <Text style={[styles.newText, { color: ACCENT }]}>NEW</Text>
        </View>
      </Animated.View>
    );
  }

  if (change === 0) {
    return (
      <Animated.View style={[styles.container, animStyle]}>
        <Text style={[styles.neutralDash, { color: NEUTRAL_COLOR }]}>—</Text>
      </Animated.View>
    );
  }

  const isUp = change > 0;
  const color = isUp ? UP_COLOR : DOWN_COLOR;
  const iconName: React.ComponentProps<typeof Ionicons>['name'] = isUp ? 'arrow-up' : 'arrow-down';
  const label = isUp ? `+${change}` : `${change}`;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Ionicons name={iconName} size={12} color={color} />
      <Text style={[styles.changeText, { color }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  neutralDash: {
    fontSize: 14,
    fontWeight: '700',
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  newText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
