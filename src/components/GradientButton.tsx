/**
 * GradientButton — full-width gradient CTA that wraps AnimatedPressable.
 *
 * Added `pulse` prop: subtle scale pulse animation to draw attention.
 * Added `loading` prop: shows spinner, disables taps (RAY ADVISORY C).
 * RAY MANDATORY #6: cancelAnimation called on both shared values in cleanup.
 * RAY MANDATORY #2: shimmer is null until onLayout fires (real width known).
 * RAY ADVISORY B: shimmer uses expo-linear-gradient.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  View,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '../hooks/useTheme';
import { useReducedMotion } from '../hooks/useReducedMotion';

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  /** Gradient color stops — defaults to [colors.accent, colors.primary] from theme */
  colors?: readonly [string, string, ...string[]];
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /**
   * Pulse mode: animates a gentle scale throb to draw user attention.
   * Cancels automatically when disabled or loading.
   */
  pulse?: boolean;
  /**
   * Loading mode: shows an ActivityIndicator and suppresses all taps.
   * RAY ADVISORY C: loading disables onPress.
   */
  loading?: boolean;
};

export function GradientButton({
  label,
  onPress,
  colors: colorOverride,
  icon,
  style,
  disabled,
  pulse = false,
  loading = false,
}: GradientButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const gradientColors = colorOverride ?? ([colors.accent, colors.primary] as const);

  // ─── Pulse animation ───────────────────────────────────────────────────────
  // RAY MANDATORY #6: both shared values cancelled on cleanup
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    // Disable pulse when reduce motion is on
    const shouldPulse = pulse && !disabled && !loading && !reducedMotion;
    if (shouldPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      // RAY MANDATORY #6: cancel both before resetting
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withSpring(1);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }

    return () => {
      // RAY MANDATORY #6: cancel both on unmount / dep change
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [pulse, disabled, loading, reducedMotion]);

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // ─── Shimmer (loading state) ───────────────────────────────────────────────
  // RAY MANDATORY #2: no magic 200px — shimmer is null until onLayout fires
  const [shimmerWidth, setShimmerWidth] = React.useState<number | null>(null);
  const shimmerTranslate = useSharedValue(-1);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setShimmerWidth(w);
    }
  }, []);

  useEffect(() => {
    if (!loading || shimmerWidth === null) {
      cancelAnimation(shimmerTranslate);
      shimmerTranslate.value = -1;
      return;
    }
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(shimmerTranslate);
    };
  }, [loading, shimmerWidth]);

  const shimmerAnimStyle = useAnimatedStyle(() => {
    if (shimmerWidth === null) return { opacity: 0 };
    return {
      transform: [
        { translateX: shimmerTranslate.value * shimmerWidth },
      ],
    };
  });

  // ─── Effective disabled state (loading suppresses taps) ───────────────────
  // RAY ADVISORY C
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={pulseAnimStyle}>
      <AnimatedPressable
        haptic={!isDisabled}
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled: isDisabled }}
        style={[styles.wrapper, style, isDisabled ? styles.disabled : undefined]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
          onLayout={handleLayout}
        >
          {/* RAY MANDATORY #2: shimmer only renders when width is known */}
          {loading && shimmerWidth !== null && (
            <Animated.View
              style={[
                styles.shimmer,
                { width: shimmerWidth * 0.4 },
                shimmerAnimStyle,
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          )}

          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              {icon && (
                <Ionicons name={icon} size={20} color="white" style={styles.icon} />
              )}
              <Text style={styles.label}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    overflow: 'hidden',
  },
  icon: {},
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: undefined, // overridden inline
  },
});
