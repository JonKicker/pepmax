/**
 * MorphButton — a button that morphs from text label to a success icon
 * after `onPress` resolves, then morphs back.
 *
 * RAY MANDATORY #1: default color uses colors.accent from useTheme().
 * RAY MANDATORY #3: setTimeout ref is cleared on unmount.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useHaptic } from '../../hooks/useHaptic';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type MorphState = 'idle' | 'morphing' | 'success' | 'reverting';

type MorphButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  /** Background color — defaults to colors.accent from theme */
  color?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  successIcon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Duration (ms) to show success state before reverting. Default: 1800 */
  successDuration?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function MorphButton({
  label,
  onPress,
  color,
  icon,
  successIcon = 'checkmark',
  successDuration = 1800,
  style,
  disabled = false,
}: MorphButtonProps) {
  // RAY MANDATORY #1: default color from theme
  const { colors } = useTheme();
  const { trigger: haptic } = useHaptic();
  const reducedMotion = useReducedMotion();
  const resolvedColor = color ?? colors.accent;

  const [morphState, setMorphState] = useState<MorphState>('idle');

  // RAY MANDATORY #3: timeout ref cleared on unmount
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Shared values for label ↔ icon cross-fade
  const labelOpacity = useSharedValue(1);
  const labelScale = useSharedValue(1);
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);
  const buttonWidth = useSharedValue(1); // 1 = full width, 0.6 = pill

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: buttonWidth.value }],
  }));

  const morphToSuccess = useCallback(() => {
    haptic('success');

    if (reducedMotion) {
      // Instant state swap — no animation
      setMorphState('success');
      iconOpacity.value = 1;
      iconScale.value = 1;
      labelOpacity.value = 0;
      buttonWidth.value = 0.35;

      timeoutRef.current = setTimeout(() => {
        setMorphState('idle');
        iconOpacity.value = 0;
        iconScale.value = 0.5;
        labelOpacity.value = 1;
        labelScale.value = 1;
        buttonWidth.value = 1;
        timeoutRef.current = null;
      }, successDuration);
      return;
    }

    setMorphState('morphing');

    // Fade out label
    labelOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
    labelScale.value = withTiming(0.7, { duration: 180 });

    // Shrink to pill shape
    buttonWidth.value = withTiming(0.35, { duration: 220, easing: Easing.inOut(Easing.ease) });

    // After label fades out, show icon
    timeoutRef.current = setTimeout(() => {
      setMorphState('success');

      iconOpacity.value = withTiming(1, { duration: 180 });
      iconScale.value = withSpring(1, { damping: 10, stiffness: 180 });

      // Schedule revert
      timeoutRef.current = setTimeout(() => {
        setMorphState('reverting');

        // Fade out icon
        iconOpacity.value = withTiming(0, { duration: 180 });
        iconScale.value = withTiming(0.5, { duration: 180 });

        // Expand back
        buttonWidth.value = withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) });

        timeoutRef.current = setTimeout(() => {
          // Fade in label
          labelOpacity.value = withTiming(1, { duration: 180 });
          labelScale.value = withSpring(1, { damping: 12, stiffness: 200 });
          setMorphState('idle');
          timeoutRef.current = null;
        }, 200);
      }, successDuration);
    }, 200);
  }, [successDuration, haptic, reducedMotion]);

  const handlePress = useCallback(async () => {
    if (morphState !== 'idle') return;

    try {
      await Promise.resolve(onPress());
    } catch (err) {
      // RAY FIX: do NOT morph to success when onPress throws — log and bail
      console.error('[MorphButton] onPress threw an error:', err);
      return;
    }
    morphToSuccess();
  }, [morphState, onPress, morphToSuccess]);

  const isEffectivelyDisabled = disabled || morphState !== 'idle';

  return (
    <Animated.View style={[styles.wrapper, { backgroundColor: resolvedColor }, style, buttonAnimStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={isEffectivelyDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isEffectivelyDisabled, busy: morphState === 'morphing' }}
        style={styles.inner}
      >
        {/* Label layer */}
        <Animated.View style={[styles.layer, labelAnimStyle]} pointerEvents="none">
          {icon && <Ionicons name={icon} size={18} color="white" style={styles.icon} />}
          <Text style={styles.label}>{label}</Text>
        </Animated.View>

        {/* Icon layer (success) */}
        <Animated.View style={[styles.layer, styles.layerAbsolute, iconAnimStyle]} pointerEvents="none">
          <Ionicons name={successIcon} size={24} color="white" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  layerAbsolute: {
    position: 'absolute',
  },
  icon: {},
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
