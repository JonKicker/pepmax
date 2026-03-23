/**
 * RecoveryTrendChart — 7-day sparkline of daily recovery scores.
 * Minimal chrome (no full axes). Touch tooltip via VictoryVoronoiContainer.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import type { Theme } from '../../constants/theme';

type Props = {
  data: Array<{ date: string; score: number }>;
  colors: Theme['colors'];
};

export function RecoveryTrendChart({ data, colors }: Props) {
  if (data.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Need at least 2 days of data for trend
        </Text>
      </View>
    );
  }

  const chartData = data.map((d, i) => ({
    x: i + 1,
    y: d.score,
    label: `${d.date.slice(5)}\n${d.score}`,
  }));

  const latestZone = getZone(data[data.length - 1].score);
  const lineColor = getZoneColor(latestZone);
  const fillColor = lineColor + '20'; // 12% opacity

  const yMin = Math.max(0, Math.min(...data.map((d) => d.score)) - 10);
  const yMax = Math.min(100, Math.max(...data.map((d) => d.score)) + 10);

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
});
