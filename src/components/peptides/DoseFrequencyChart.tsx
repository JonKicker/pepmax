/**
 * DoseFrequencyChart — bar chart showing daily dose counts over a time range.
 * Follows the WeightChart pattern with inline TimeRangeTabs.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from 'victory-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { DoseFrequencyPoint, PeptideTimeRange } from '../../hooks/usePeptideProgress';

const TIME_RANGES: PeptideTimeRange[] = ['1W', '1M', '3M', '6M', 'ALL'];

type Props = {
  data: DoseFrequencyPoint[];
  timeRange: PeptideTimeRange;
  onTimeRangeChange: (range: PeptideTimeRange) => void;
  colors?: ReturnType<typeof useTheme>['colors'];
};

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

// ─── Time Range Tabs ─────────────────────────────────────────────────────────

function TimeRangeTabs({
  selected,
  onChange,
  themeColors,
}: {
  selected: PeptideTimeRange;
  onChange: (r: PeptideTimeRange) => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.tabs}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.tab,
            { backgroundColor: r === selected ? Colors.peptide : 'transparent' },
          ]}
          onPress={() => onChange(r)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: r === selected ? '#fff' : themeColors.textSecondary },
            ]}
          >
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DoseFrequencyChart({ data, timeRange, onTimeRangeChange }: Props) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} themeColors={colors} />
        <View style={styles.emptyChart}>
          <Ionicons name="flask-outline" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log doses to see frequency trends
          </Text>
        </View>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    x: new Date(d.date + 'T12:00:00'),
    y: d.count,
    label: `${d.count} dose${d.count !== 1 ? 's' : ''}\n${formatDate(d.date)}`,
  }));

  const maxCount = Math.max(...data.map((d) => d.count));
  const yMax = Math.max(maxCount + 1, 3);

  return (
    <View style={styles.container}>
      <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} themeColors={colors} />

      <VictoryChart
        height={220}
        padding={{ top: 16, bottom: 35, left: 40, right: 16 }}
        domain={{ y: [0, yMax] }}
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
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.4 },
          }}
          tickFormat={(t: number) => Number.isInteger(t) ? `${t}` : ''}
        />
        <VictoryBar
          data={chartData}
          style={{ data: { fill: Colors.peptide, opacity: 0.85 } }}
          barWidth={data.length <= 14 ? 10 : data.length <= 30 ? 6 : 4}
          cornerRadius={{ top: 3 }}
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
