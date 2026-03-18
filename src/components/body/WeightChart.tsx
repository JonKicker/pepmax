/**
 * WeightChart — victory-native line chart with time range tabs, goal line,
 * tappable data points, and trend-coloured area fill.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryScatter,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { BodyWeightEntry, TimeRange } from '../../types/bodyTracking';
import type { Units } from '../../types/profile';
import { kgToLbs } from '../../utils/tdee';

type Props = {
  entries: BodyWeightEntry[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  goalWeightKg?: number;
  units: Units;
};

const TIME_RANGES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

function toDisplay(kg: number, units: Units): number {
  return units === 'imperial' ? Math.round(kgToLbs(kg) * 10) / 10 : Math.round(kg * 10) / 10;
}

export default function WeightChart({ entries, timeRange, onTimeRangeChange, goalWeightKg, units }: Props) {
  const { colors } = useTheme();
  const unitLabel = units === 'imperial' ? 'lbs' : 'kg';

  const data = entries.map((e) => ({
    x: new Date(e.date),
    y: toDisplay(e.weight, units),
    label: `${toDisplay(e.weight, units)} ${unitLabel}\n${e.date}`,
  }));

  // Determine trend direction (toward or away from goal)
  const trendingTowardGoal = (() => {
    if (!goalWeightKg || entries.length < 2) return true; // default green
    const goalDisplay = toDisplay(goalWeightKg, units);
    const recent = data.slice(-7);
    if (recent.length < 2) return true;
    const first = recent[0].y;
    const last = recent[recent.length - 1].y;
    const needToLose = first > goalDisplay;
    return needToLose ? last <= first : last >= first;
  })();

  const fillColor = trendingTowardGoal ? 'rgba(39, 174, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)';
  const lineColor = trendingTowardGoal ? Colors.light.success : Colors.error;

  // Y-axis domain with padding
  const yValues = data.map((d) => d.y);
  const goalDisplay = goalWeightKg ? toDisplay(goalWeightKg, units) : null;
  if (goalDisplay) yValues.push(goalDisplay);
  const yMin = yValues.length > 0 ? Math.min(...yValues) - 2 : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) + 2 : 100;

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <TimeRangeTabs
          selected={timeRange}
          onChange={onTimeRangeChange}
          colors={colors}
        />
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log your weight to see trends
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
      <VictoryChart
        height={220}
        padding={{ top: 20, bottom: 35, left: 50, right: 16 }}
        domain={{ y: [yMin, yMax] }}
        containerComponent={
          <VictoryVoronoiContainer
            voronoiDimension="x"
            labels={({ datum }: { datum: { label: string } }) => datum.label}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: colors.surface, stroke: colors.border }}
                style={{ fill: colors.textPrimary, fontSize: 10 }}
                cornerRadius={6}
                flyoutPadding={{ top: 6, bottom: 6, left: 10, right: 10 }}
              />
            }
          />
        }
      >
        {/* X axis */}
        <VictoryAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
          }}
          tickFormat={(t: Date) => {
            const d = new Date(t);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />

        {/* Y axis */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.4 },
          }}
        />

        {/* Area fill */}
        <VictoryArea
          data={data}
          style={{ data: { fill: fillColor, stroke: 'transparent' } }}
        />

        {/* Main line */}
        <VictoryLine
          data={data}
          style={{ data: { stroke: lineColor, strokeWidth: 2.5 } }}
        />

        {/* Data points */}
        <VictoryScatter
          data={data}
          size={4}
          style={{ data: { fill: lineColor } }}
        />

        {/* Goal weight line */}
        {goalDisplay != null && (
          <VictoryLine
            data={[
              { x: data[0].x, y: goalDisplay },
              { x: data[data.length - 1].x, y: goalDisplay },
            ]}
            style={{
              data: { stroke: Colors.body, strokeWidth: 1.5, strokeDasharray: '6,4' },
            }}
          />
        )}
      </VictoryChart>
    </View>
  );
}

// ─── Time Range Tabs ────────────────────────────────────────────────────────

function TimeRangeTabs({
  selected,
  onChange,
  colors,
}: {
  selected: TimeRange;
  onChange: (r: TimeRange) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.tabs}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.tab,
            { backgroundColor: r === selected ? Colors.body : 'transparent' },
          ]}
          onPress={() => onChange(r)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: r === selected ? '#fff' : colors.textSecondary },
            ]}
          >
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyChart: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
