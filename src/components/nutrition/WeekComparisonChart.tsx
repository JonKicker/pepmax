/**
 * WeekComparisonChart — Victory Native mini bar chart showing daily nutrition scores
 * for this week and last week side by side.
 *
 * Uses VictoryBar with grouped data. Null scores are rendered as 0-height bars
 * (unlogged days remain visually empty).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { VictoryBar, VictoryChart, VictoryGroup, VictoryAxis, VictoryTheme } from 'victory-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import type { WeekSummary } from '../../types/weeklyComparison';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary;
  /** Primary text color from theme. */
  textColor: string;
  /** Border/grid color from theme. */
  borderColor: string;
  /** Optional accent color override; defaults to theme nutrition color. */
  accentColor?: string;
};

// ─── Day labels ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekComparisonChart({ thisWeek, lastWeek, textColor, borderColor, accentColor }: Props) {
  const { colors } = useTheme();
  const barColor = accentColor ?? colors.nutrition;

  // Reduced motion check
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Entrance animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: reduceMotion ? 0 : 600, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: reduceMotion ? 0 : 600, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Convert null scores to 0 for charting (null = no data)
  const thisData = thisWeek.dailyScores.map((score, i) => ({
    x: i + 1,
    y: score ?? 0,
  }));

  const lastData = lastWeek.dailyScores.map((score, i) => ({
    x: i + 1,
    y: score ?? 0,
  }));

  return (
    <Reanimated.View style={[styles.container, animStyle]}>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: barColor }]} />
        <Text style={[styles.legendText, { color: textColor }]}>This week</Text>
        <View style={[styles.legendDot, { backgroundColor: borderColor }]} />
        <Text style={[styles.legendText, { color: textColor }]}>Last week</Text>
      </View>

      <VictoryChart
        height={140}
        domainPadding={{ x: 12 }}
        padding={{ top: 10, bottom: 30, left: 30, right: 10 }}
        theme={VictoryTheme.material}
      >
        <VictoryAxis
          tickValues={[1, 2, 3, 4, 5, 6, 7]}
          tickFormat={(t: number) => DAY_LABELS[t - 1] ?? ''}
          style={{
            tickLabels: { fontSize: 9, fill: textColor, padding: 4 },
            axis: { stroke: borderColor },
            grid: { stroke: 'transparent' },
          }}
        />
        <VictoryAxis
          dependentAxis
          domain={[0, 100]}
          tickValues={[0, 50, 100]}
          style={{
            tickLabels: { fontSize: 9, fill: textColor },
            axis: { stroke: borderColor },
            grid: { stroke: borderColor, strokeOpacity: 0.3 },
          }}
        />
        <VictoryGroup offset={8} colorScale={[barColor, borderColor]}>
          <VictoryBar
            data={thisData}
            barWidth={7}
            cornerRadius={{ top: 2 }}
            style={{ data: { fill: barColor, opacity: 0.85 } }}
          />
          <VictoryBar
            data={lastData}
            barWidth={7}
            cornerRadius={{ top: 2 }}
            style={{ data: { fill: borderColor, opacity: 0.6 } }}
          />
        </VictoryGroup>
      </VictoryChart>
    </Reanimated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 4 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: { fontSize: 11, fontWeight: '600' },
});
