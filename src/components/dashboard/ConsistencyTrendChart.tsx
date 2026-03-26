/**
 * ConsistencyTrendChart — weekly consistency % over time with colour zones.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { useTheme } from '../../hooks/useTheme';
import type { Theme } from '../../constants/theme';
import type { ConsistencyTimeRange } from '../../hooks/useConsistencyProgress';

const ZONE_GREEN = '#27AE60';
const ZONE_ORANGE = '#F39C12';
const ZONE_RED = '#E74C3C';
const TIME_RANGES: ConsistencyTimeRange[] = ['1M', '3M', '6M'];

type DataPoint = { x: Date; y: number; label: string };

type Props = {
  data: DataPoint[];
  timeRange: ConsistencyTimeRange;
  onTimeRangeChange: (range: ConsistencyTimeRange) => void;
  colors: Theme['colors'];
};

function zoneColor(y: number): string {
  if (y >= 80) return ZONE_GREEN;
  if (y >= 50) return ZONE_ORANGE;
  return ZONE_RED;
}

function TimeRangeTabs({
  selected,
  onChange,
  colors,
}: {
  selected: ConsistencyTimeRange;
  onChange: (r: ConsistencyTimeRange) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.tabs}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.tab,
            { backgroundColor: r === selected ? ZONE_GREEN : 'transparent' },
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

export function ConsistencyTrendChart({ data, timeRange, onTimeRangeChange, colors }: Props) {
  if (data.length < 2) {
    return (
      <View style={styles.container}>
        <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Not enough data for consistency trend
          </Text>
        </View>
      </View>
    );
  }

  const latestY = data[data.length - 1].y;
  const lineColor = zoneColor(latestY);
  const fillColor = lineColor + '26'; // ~15% opacity

  // Reference lines as simple line data
  const xStart = data[0].x;
  const xEnd = data[data.length - 1].x;

  return (
    <View style={styles.container}>
      <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
      <VictoryChart
        height={220}
        padding={{ top: 20, bottom: 35, left: 46, right: 16 }}
        domain={{ y: [0, 100] }}
        scale={{ x: 'time' }}
        containerComponent={
          <VictoryVoronoiContainer
            voronoiDimension="x"
            labels={({ datum }: { datum: DataPoint }) => datum.label}
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
        {/* X axis — "Wk MM/DD" */}
        <VictoryAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
          }}
          tickFormat={(t: Date) => {
            const d = new Date(t);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `Wk ${month}/${day}`;
          }}
          tickCount={5}
        />

        {/* Y axis — percentage */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.4 },
          }}
          tickFormat={(t: number) => `${t}%`}
          tickValues={[0, 25, 50, 75, 100]}
        />

        {/* Reference line at 80% (green zone threshold) */}
        <VictoryLine
          data={[
            { x: xStart, y: 80 },
            { x: xEnd, y: 80 },
          ]}
          style={{
            data: {
              stroke: ZONE_GREEN,
              strokeWidth: 1,
              strokeDasharray: '6,4',
              opacity: 0.5,
            },
          }}
        />

        {/* Reference line at 50% (orange zone threshold) */}
        <VictoryLine
          data={[
            { x: xStart, y: 50 },
            { x: xEnd, y: 50 },
          ]}
          style={{
            data: {
              stroke: ZONE_ORANGE,
              strokeWidth: 1,
              strokeDasharray: '6,4',
              opacity: 0.5,
            },
          }}
        />

        {/* Area fill */}
        <VictoryArea
          data={data}
          interpolation="monotoneX"
          style={{ data: { fill: fillColor, stroke: 'transparent' } }}
        />

        {/* Main line */}
        <VictoryLine
          data={data}
          interpolation="monotoneX"
          style={{ data: { stroke: lineColor, strokeWidth: 2.5 } }}
        />
      </VictoryChart>
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
