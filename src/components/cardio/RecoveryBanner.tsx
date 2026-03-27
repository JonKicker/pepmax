import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { GlassCard } from '../GlassCard';
import { getTodayRecoveryScore } from '../../services/recoveryScoreService';
import { suggestEffort } from '../../utils/recoveryPaceCalc';

type Props = {
  onZoneTarget?: (zone: number) => void;
};

export default function RecoveryBanner({ onZoneTarget }: Props) {
  const { colors } = useTheme();
  const [score, setScore] = useState<number | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await getTodayRecoveryScore();
      if (cancelled) return;

      if (result.data) {
        setScore(result.data.recoveryScore);
        setZone(result.data.zone);

        const effort = suggestEffort(result.data.recoveryScore);
        if (effort && onZoneTarget) {
          onZoneTarget(effort.zoneTarget);
        }
      }

      // RAY #F3: resolve regardless of result — no infinite spinner
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return;
    const duration = reduceMotion ? 0 : 300;
    opacity.value = withDelay(0, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(0, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }));
  }, [loaded, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // RAY #F3: If offline or no cached doc, show prompt — no spinner
  if (!loaded) return null;

  const getZoneColor = (z: string | null): string => {
    switch (z) {
      case 'green': return colors.success;
      case 'yellow': return colors.warning;
      case 'orange': return colors.warning;
      case 'red': return colors.error;
      default: return colors.textSecondary;
    }
  };

  if (score === null) {
    return (
      <Reanimated.View
        style={[styles.wrapper, animatedStyle]}
        accessibilityLabel="Complete your morning check-in for recovery-adjusted targets"
        accessibilityRole="text"
      >
        <GlassCard
          intensity="subtle"
          accentColor={colors.textSecondary}
          padding={12}
          style={styles.cardSpacing}
        >
          <Text style={[styles.neutralText, { color: colors.textSecondary }]}>
            Complete your morning check-in for recovery-adjusted targets
          </Text>
        </GlassCard>
      </Reanimated.View>
    );
  }

  const effort = suggestEffort(score);
  const color = getZoneColor(zone);

  return (
    <Reanimated.View
      style={[styles.wrapper, animatedStyle]}
      accessibilityLabel={`Recovery score ${score}. ${effort?.label ?? 'Recovery'}. Zone ${effort?.zoneTarget} target.`}
      accessibilityRole="summary"
    >
      <GlassCard
        intensity="subtle"
        accentColor={color}
        padding={12}
        style={styles.cardSpacing}
      >
        <View style={styles.row}>
          <View style={[styles.scoreBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.scoreText, { color }]}>{score}</Text>
          </View>
          <View style={styles.labelGroup}>
            <Text style={[styles.effortLabel, { color }]}>{effort?.label ?? 'Recovery'}</Text>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              Zone {effort?.zoneTarget} target
            </Text>
          </View>
        </View>
      </GlassCard>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardSpacing: {
    // GlassCard handles borderRadius: 16
  },
  neutralText: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '800',
  },
  labelGroup: {
    flex: 1,
  },
  effortLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
  },
});
