/**
 * GradientButton — full-width gradient CTA that wraps AnimatedPressable.
 *
 * FIX 4: Default gradient colors come from useTheme() tokens, not hardcoded hex.
 * Pass `colors` prop to override.
 */
import React from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '../hooks/useTheme';

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  /** Gradient color stops — defaults to [colors.accent, colors.primary] from theme */
  colors?: readonly [string, string, ...string[]];
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function GradientButton({
  label,
  onPress,
  colors: colorOverride,
  icon,
  style,
  disabled,
}: GradientButtonProps) {
  const { colors } = useTheme();
  const gradientColors = colorOverride ?? [colors.accent, colors.primary] as const;

  return (
    <AnimatedPressable
      haptic
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.wrapper, style, disabled ? styles.disabled : undefined]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {icon && <Ionicons name={icon} size={20} color="white" style={styles.icon} />}
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
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
});
