/**
 * AnimatedToggle — spring-physics toggle switch.
 *
 * RAY MANDATORY #1: default active/track colors use useTheme() tokens.
 * RAY MANDATORY #5: accessibilityState={{ checked: value }} present.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, AccessibilityState } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4; // 4px padding (2px each side)

type AnimatedToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Track color when ON — defaults to colors.accent */
  activeColor?: string;
  /** Track color when OFF — defaults to colors.border */
  inactiveColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function AnimatedToggle({
  value,
  onValueChange,
  activeColor,
  inactiveColor,
  disabled = false,
  accessibilityLabel = 'Toggle',
}: AnimatedToggleProps) {
  // RAY MANDATORY #1: defaults from theme
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const resolvedActive = activeColor ?? colors.accent;
  const resolvedInactive = inactiveColor ?? colors.border;

  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      // Instant value change — no spring animation
      progress.value = value ? 1 : 0;
    } else {
      progress.value = withSpring(value ? 1 : 0, { damping: 15, stiffness: 200 });
    }
  }, [value, reducedMotion]);

  const thumbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  // Interpolate track color between inactive ↔ active
  const trackColor = useDerivedValue(() =>
    interpolateColor(progress.value, [0, 1], [resolvedInactive, resolvedActive]),
  );

  const trackAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: trackColor.value,
  }));

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  // RAY MANDATORY #5: accessibilityState includes checked
  const a11yState: AccessibilityState = {
    checked: value,
    disabled,
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={a11yState}
      disabled={disabled}
      style={[styles.pressable, disabled && styles.disabledPressable]}
    >
      <Animated.View style={[styles.track, trackAnimStyle]}>
        <Animated.View style={[styles.thumb, thumbAnimStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  disabledPressable: {
    opacity: 0.4,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
