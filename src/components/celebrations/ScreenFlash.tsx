/**
 * ScreenFlash — full-screen color flash overlay.
 * opacity 0 -> 0.3 -> 0 over 300ms total.
 * Returns null when reduceMotion is enabled.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type ScreenFlashProps = {
  color: string;
  onComplete?: () => void;
};

export function ScreenFlash({ color, onComplete }: ScreenFlashProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      if (onComplete) onComplete();
      return;
    }

    opacity.value = withSequence(
      withTiming(0.3, { duration: 80 }),
      withTiming(0, { duration: 220 }, () => {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: color,
  }));

  if (reducedMotion) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animStyle]}
      pointerEvents="none"
    />
  );
}
