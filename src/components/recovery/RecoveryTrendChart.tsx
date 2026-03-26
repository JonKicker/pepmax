/**
 * RecoveryTrendChart — sparkline of daily recovery scores.
 * Supports a compact mode (default) and a fullMode with time-range tabs.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryScatter,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { getZoneColor, getZone } from '../../utils/recoveryScore';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';
import type { RecoveryTimeRange } from '../../hooks/useRecoveryProgress';

type Props = {
  data: Array<{ date: string; score: number }>;
  colors: Theme['colors'];
  fullMode?: boolean;
  timeRange?: RecoveryTimeRange;
  onTimeRangeChange?: (r: RecoveryTimeRange) => void;
};

function TimeRangeTabs({
  selected,
  onChange,
  colors,
}: {
  selected: RecoveryTimeRange;
  onChange: (r: RecoveryTimeRange) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const ranges: RecoveryTimeRange[] = ['1W', '1M', '3M', '6M', 'ALL'];
  return (
    <View style={styles.tabs}>
      {ranges.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.tab, { backgroundColor: r === selected ? Colors.accent : 'transparent' }]}
          onPress={() => onChange(r)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: r === selected ? '#fff' : colors.textSecondary }]}>
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function RecoveryTrendChart({
  data,
  colors,
  fullMode = false,
  timeRange = '1M',
  onTimeRangeChange,
}: Props) {
  if (data.length < 2) {
    return (
      <View>
        {fullMode && onTimeRangeChange && (
          <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
        )}
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Need at least 2 days of data for trend
          </Text>
        </View>
      </View>
    );
  }

  const latestZone = getZone(data[data.length - 1].score);
  const lineColor = getZoneColor(latestZone);
  const fillColor = lineColor + '20';

  const yMin = Math.max(0, Math.min(...data.map((d) => d.score)) - 10);
  const yMax = Math.min(100, Math.max(...data.map((d) => d.score)) + 10);

  if (fullMode) {
    // Full mode: date-based x axis, taller chart, grid, time-range tabs
    const chartData = data.map((d) => ({
      x: new Date(d.date + 'T12:00:00'),
      y: d.score,
      label: `${d.date.slice(5)}\n${d.score}`,
    }));

    return (
      <View>
        {onTimeRangeChange && (
          <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
        )}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Recovery Trend</Text>
        <VictoryChart
          height={220}
          padding={{ top: 20, bottom: 35, left: 50, right: 16 }}
          domain={{ y: [yMin, yMax] }}
          scale={{ x: 'time' }}
          containerComponent={
            <VictoryVoronoiContainer
              voronoiDimension="x"
              labels={({ datum }: { datum: { label: string } }) => datum.label}
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: colors.surface, stroke: colors.border }}
                  style={{ fill: colors.textPrimary, fontSize: 10 }}
                  cornerRadius={6}
                />
              }
            />
          }
        >
          <VictoryAxis
            style={{
              axis: { stroke: colors.border },
              tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            }}
            tickFormat={(t: Date) => {
              const month = String(t.getMonth() + 1).padStart(2, '0');
              const day = String(t.getDate()).padStart(2, '0');
              return `${month}/${day}`;
            }}
            tickCount={5}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: colors.border },
              grid: { stroke: colors.border, strokeDasharray: '4,4' },
              tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            }}
          />
          <VictoryArea
            data={chartData}
            interpolation="monotoneX"
            style={{ data: { fill: fillColor, stroke: 'transparent' } }}
          />
          <VictoryLine
            data={chartData}
            interpolation="monotoneX"
            style={{ data: { stroke: lineColor, strokeWidth: 2 } }}
          />
          <VictoryScatter
            data={chartData}
            size={3}
            style={{ data: { fill: lineColor } }}
          />
        </VictoryChart>
      </View>
    );
  }

  // Compact mode (default) — original behavior unchanged
  const chartData = data.map((d, i) => ({
    x: i + 1,
    y: d.score,
    label: `${d.date.slice(5)}\n${d.score}`,
  }));

  return (
    <View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>7-Day Trend</Text>
      <VictoryChart
        height={140}
        padding={{ top: 16, bottom: 24, left: 32, right: 16 }}
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
              />
            }
          />
        }
      >
        <VictoryAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
          }}
          tickFormat={(t: number) => {
            const d = data[t - 1];
            return d ? d.date.slice(5) : '';
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: colors.border, strokeDasharray: '4,4' },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
          }}
          tickCount={3}
        />
        <VictoryArea
          data={chartData}
          interpolation="monotoneX"
          style={{ data: { fill: fillColor, stroke: 'transparent' } }}
        />
        <VictoryLine
          data={chartData}
          interpolation="monotoneX"
          style={{ data: { stroke: lineColor, strokeWidth: 2 } }}
        />
        <VictoryScatter
          data={chartData}
          size={3}
          style={{ data: { fill: lineColor } }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
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
});
