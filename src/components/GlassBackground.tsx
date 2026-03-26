import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

type Props = { children: React.ReactNode };

export function GlassBackground({ children }: Props) {
  const { colors } = useTheme();

  const gradientColors = [
    colors.glass.gradientStart,
    colors.glass.gradientMid,
    colors.glass.gradientEnd,
  ] as const;

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
});
