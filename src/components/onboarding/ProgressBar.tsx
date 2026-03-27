/**
 * ProgressBar — animated top bar showing quiz completion.
 * Uses Reanimated width animation with useAnimatedStyle.
 */
import { useEffect } from 'react';
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
  step: number;
  total: number;
  /** If true, animations are skipped (AccessibilityInfo.isReduceMotionEnabled) */
  reduceMotion?: boolean;
};

export default function ProgressBar({ step, total, reduceMotion = false }: Props) {
  const { colors } = useTheme();
  const pct = step / total;
  const width = useSharedValue(pct);

  useEffect(() => {
    if (reduceMotion) {
      width.value = pct;
    } else {
      width.value = withTiming(pct, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [pct, reduceMotion]);

  const animatedBar = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: Colors.accent }, animatedBar]}
        />
      </View>
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        accessibilityLabel={`Step ${step} of ${total}`}
      >
        {step} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});
