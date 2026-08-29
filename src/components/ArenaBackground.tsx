import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { arenaColors } from '../constants/competeTheme';

type Props = { children: React.ReactNode };

export function ArenaBackground({ children }: Props) {
  const { dark } = useTheme();
  const arena = arenaColors(dark);

  return (
    <LinearGradient
      colors={[arena.gradientStart, arena.gradientMid, arena.gradientEnd]}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
});
