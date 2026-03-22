/**
 * MeasurementTrendChart — generalized Victory Native chart for body measurement trends.
 * Shows faint daily line + bold weekly average scatter + area fill + time range tabs.
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
import type { TimeRange } from '../../types/bodyTracking';

type DataPoint = { x: Date; y: number; label: string };
type WeeklyAvg = { weekStart: string; avg: number };

type Props = {
  data: DataPoint[];
  weeklyAverages: WeeklyAvg[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  unitLabel: string;
  color: string;
  emptyMessage?: string;
};

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export default function MeasurementTrendChart({
  data,
  weeklyAverages,
  timeRange,
  onTimeRangeChange,
  unitLabel,
  color,
  emptyMessage = 'No data in this range',
}: Props) {
  const { colors } = useTheme();

  const weeklyData = weeklyAverages.map((w) => ({
    x: new Date(w.weekStart + 'T00:00:00'),
    y: w.avg,
    label: `${w.avg} ${unitLabel}\nweek of ${w.weekStart}`,
  }));

  const yValues = [...data.map((d) => d.y), ...weeklyData.map((d) => d.y)];
  const yMin = yValues.length > 0 ? Math.min(...yValues) - 2 : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) + 2 : 100;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TIME_RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.tab, { backgroundColor: r === timeRange ? color : 'transparent' }]}
            onPress={() => onTimeRangeChange(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: r === timeRange ? '#fff' : colors.textSecondary }]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        </View>
      ) : (
        <VictoryChart
          height={200}
          padding={{ top: 16, bottom: 32, left: 48, right: 16 }}
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
          />
          {/* Area fill */}
          <VictoryArea
            data={data}
            style={{ data: { fill: color + '20', stroke: 'transparent' } }}
            interpolation="monotoneX"
          />
          {/* Daily faint line */}
          <VictoryLine
            data={data}
            style={{ data: { stroke: color, strokeWidth: 1.5, opacity: 0.3 } }}
            interpolation="monotoneX"
          />
          {/* Weekly average scatter */}
          {weeklyData.length > 0 && (
            <VictoryScatter
              data={weeklyData}
              size={5}
              style={{ data: { fill: color } }}
            />
          )}
        </VictoryChart>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  tabText: { fontSize: 12, fontWeight: '600' },
  empty: { height: 160, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontStyle: 'italic' },
});
