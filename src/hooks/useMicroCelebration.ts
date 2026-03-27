/**
 * useMicroCelebration — inline scale + opacity flash for micro feedback.
 *
 * Returns { style, trigger }
 *   style  → AnimatedStyle to apply to the element being celebrated
 *   trigger → call to fire the animation + haptic
 *
 * Reduced motion: skips animation, still fires haptic.
 */
import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

export type MicroCelebrationReturn = {
  style: ReturnType<typeof useAnimatedStyle>;
  trigger: () => void;
};

export function useMicroCelebration(): MicroCelebrationReturn {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const trigger = useCallback(() => {
    // Always fire haptic
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    if (reducedMotion) return;

    // scale: 1.0 -> 1.15 -> 1.0
    scale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 180 }),
    );

    // opacity: 1.0 -> 0.7 -> 1.0
    opacity.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1.0, { duration: 200 }),
    );
  }, [reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { style, trigger };
}
