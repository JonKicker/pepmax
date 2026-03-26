import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../hooks/useTheme';

// Blur intensity by mode — higher = more frosted
const BLUR_HEAVY_LIGHT = 80;
const BLUR_HEAVY_DARK = 40;
const BLUR_SUBTLE_LIGHT = 50;
const BLUR_SUBTLE_DARK = 25;

type GlassCardProps = {
  intensity?: 'heavy' | 'subtle';
  children: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  padding?: number;
};

export function GlassCard({ intensity = 'subtle', children, style, accentColor, padding = 16 }: GlassCardProps) {
  const { colors, dark } = useTheme();

  const blurIntensity = intensity === 'heavy'
    ? (dark ? BLUR_HEAVY_DARK : BLUR_HEAVY_LIGHT)
    : (dark ? BLUR_SUBTLE_DARK : BLUR_SUBTLE_LIGHT);

  const tint = dark ? 'dark' : 'light';
  const bgColor = intensity === 'heavy' ? colors.glass.heavy : colors.glass.subtle;
  const contentStyle = useMemo(() => ({ padding }), [padding]);

  return (
    <View style={[
      styles.wrapper,
      {
        borderColor: colors.glass.border,
        shadowColor: colors.glass.shadow,
      },
      style,
    ]}>
      {/* BlurView on iOS; Android falls back to semi-transparent overlay only */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={blurIntensity} tint={tint} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      <View style={contentStyle}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});
