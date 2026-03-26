/**
 * SlimXPBar — compact animated XP progress bar for the top of the dashboard.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  level: number;
  totalXP: number;
  progress: number; // 0–1
  onPress: () => void;
};

const XP_BAR_COLOR = '#6C5CE7';

export function SlimXPBar({ level, totalXP, progress, onPress }: Props) {
  const { colors } = useTheme();

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(Math.min(progress, 1), {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {`Lv ${level} · ${totalXP.toLocaleString()} XP`}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.fill, fillStyle, { backgroundColor: XP_BAR_COLOR }]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    gap: 4,
  },
  label: {
    fontSize: 11,
    textAlign: 'right',
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
