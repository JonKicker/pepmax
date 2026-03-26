import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progress: number; // 0–1
  totalXP?: number;
  compact?: boolean; // smaller version for dashboard card
};

export function XPProgressBar({
  level,
  currentLevelXP,
  xpToNextLevel,
  progress,
  totalXP,
  compact = false,
}: Props) {
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

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactLabelRow}>
          <Text style={[styles.compactLevelLabel, { color: Colors.gold }]}>
            Lv {level}
          </Text>
          <Text style={[styles.compactXPLabel, { color: colors.textSecondary }]}>
            {currentLevelXP}/{xpToNextLevel} XP
          </Text>
        </View>
        <View style={[styles.track, styles.compactTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.fill, fillStyle, { backgroundColor: Colors.gold }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.levelLabel, { color: Colors.gold }]}>Level {level}</Text>
        <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
          {currentLevelXP} / {xpToNextLevel} XP
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: Colors.gold }]} />
      </View>
      {totalXP !== undefined && (
        <Text style={[styles.totalXP, { color: colors.textSecondary }]}>
          Total XP: {totalXP.toLocaleString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: { fontSize: 17, fontWeight: '700' },
  xpLabel: { fontSize: 13 },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  totalXP: { fontSize: 12, textAlign: 'right' },

  compactContainer: { gap: 4 },
  compactLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactLevelLabel: { fontSize: 13, fontWeight: '700' },
  compactXPLabel: { fontSize: 12 },
  compactTrack: { height: 6, borderRadius: 3 },
});
