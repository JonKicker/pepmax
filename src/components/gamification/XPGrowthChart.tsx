/**
 * XPGrowthChart — area + line chart showing cumulative XP earned over time.
 * Follows the WeightChart pattern.
 */
import React from 'react';
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
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { XPTimeRange } from '../../hooks/useXPProgress';

const GOLD = '#F59E0B';
const GOLD_AREA = 'rgba(245, 158, 11, 0.15)';
const TIME_RANGES: XPTimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

type DataPoint = { x: Date; y: number; label: string };

type Props = {
  data: DataPoint[];
  timeRange: XPTimeRange;
  onTimeRangeChange: (range: XPTimeRange) => void;
  colors: Theme['colors'];
};

function TimeRangeTabs({
  selected,
  onChange,
  colors,
}: {
  selected: XPTimeRange;
  onChange: (r: XPTimeRange) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.tabs}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.tab,
            { backgroundColor: r === selected ? GOLD : 'transparent' },
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

export function XPGrowthChart({ data, timeRange, onTimeRangeChange, colors }: Props) {
  if (data.length < 2) {
    return (
      <View style={styles.container}>
        <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Earn XP to see your growth curve
          </Text>
        </View>
      </View>
    );
  }

  const yValues = data.map((d) => d.y);
  const yMin = 0;
  const yMax = Math.max(Math.max(...yValues) * 1.1, 10);

  return (
    <View style={styles.container}>
      <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} colors={colors} />
      <VictoryChart
        height={220}
        padding={{ top: 20, bottom: 35, left: 60, right: 16 }}
        domain={{ y: [yMin, yMax] }}
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
        {/* X axis */}
        <VictoryAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
          }}
          tickFormat={(t: Date) => {
            const d = new Date(t);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${month}/${day}`;
          }}
          tickCount={5}
        />

        {/* Y axis — cumulative XP */}
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.4 },
          }}
          tickFormat={(t: number) => {
            if (t >= 1000) return `${Math.round(t / 100) / 10}k`;
            return String(Math.round(t));
          }}
        />

        {/* Area fill */}
        <VictoryArea
          data={data}
          interpolation="monotoneX"
          style={{ data: { fill: GOLD_AREA, stroke: 'transparent' } }}
        />

        {/* Main line */}
        <VictoryLine
          data={data}
          interpolation="monotoneX"
          style={{ data: { stroke: GOLD, strokeWidth: 2.5 } }}
        />

        {/* Data points */}
        <VictoryScatter
          data={data}
          size={4}
          style={{ data: { fill: GOLD } }}
          labels={() => ''}
          labelComponent={<VictoryTooltip active={false} />}
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
