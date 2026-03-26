/**
 * MacroTrendChart — calories area chart + grouped macros bar chart.
 * Follows the WeightChart pattern with inline TimeRangeTabs.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VictoryChart,
  VictoryLine,
  VictoryArea,
  VictoryScatter,
  VictoryBar,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
  VictoryGroup,
} from 'victory-native';
import { Colors } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import type { DailyMacroPoint } from '../../services/nutritionService';
import type { NutritionTimeRange } from '../../hooks/useNutritionProgress';

const TIME_RANGES: NutritionTimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

const PROTEIN_COLOR = '#3498DB';
const CARBS_COLOR = '#E67E22';
const FAT_COLOR = '#E74C3C';

type Props = {
  data: DailyMacroPoint[];
  timeRange: NutritionTimeRange;
  onTimeRangeChange: (range: NutritionTimeRange) => void;
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
  selected: NutritionTimeRange;
  onChange: (r: NutritionTimeRange) => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.tabs}>
      {TIME_RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.tab,
            { backgroundColor: r === selected ? Colors.nutrition : 'transparent' },
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

export default function MacroTrendChart({ data, timeRange, onTimeRangeChange }: Props) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} themeColors={colors} />
        <View style={styles.emptyChart}>
          <Ionicons name="nutrition-outline" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log meals to see nutrition trends
          </Text>
        </View>
      </View>
    );
  }

  // Build chart data from DailyMacroPoint array
  const calorieData = data.map((d) => ({
    x: new Date(d.date + 'T12:00:00'),
    y: d.calories,
    label: `${Math.round(d.calories)} cal\n${formatDate(d.date)}`,
  }));

  const proteinData = data.map((d) => ({
    x: new Date(d.date + 'T12:00:00'),
    y: d.protein,
    label: `${Math.round(d.protein)}g protein`,
  }));

  const carbsData = data.map((d) => ({
    x: new Date(d.date + 'T12:00:00'),
    y: d.carbs,
    label: `${Math.round(d.carbs)}g carbs`,
  }));

  const fatData = data.map((d) => ({
    x: new Date(d.date + 'T12:00:00'),
    y: d.fat,
    label: `${Math.round(d.fat)}g fat`,
  }));

  const calValues = calorieData.map((d) => d.y);
  const calMin = Math.max(0, Math.min(...calValues) - 100);
  const calMax = Math.max(...calValues) + 100;

  return (
    <View style={styles.container}>
      <TimeRangeTabs selected={timeRange} onChange={onTimeRangeChange} themeColors={colors} />

      {/* ── Calories Chart ── */}
      <VictoryChart
        height={160}
        padding={{ top: 16, bottom: 32, left: 52, right: 16 }}
        domain={{ y: [calMin, calMax] }}
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
          label="cal"
          style={{
            axis: { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            axisLabel: { fill: colors.textSecondary, fontSize: 9, padding: 38 },
            grid: { stroke: colors.border, strokeDasharray: '4,4', opacity: 0.4 },
          }}
          tickFormat={(t: number) => t >= 1000 ? `${(t / 1000).toFixed(1)}k` : `${t}`}
        />
        <VictoryArea
          data={calorieData}
          style={{ data: { fill: Colors.nutrition + '26', stroke: 'transparent' } }}
        />
        <VictoryLine
          data={calorieData}
          style={{ data: { stroke: Colors.nutrition, strokeWidth: 2.5 } }}
        />
        <VictoryScatter
          data={calorieData}
          size={data.length <= 14 ? 4 : 2}
          style={{ data: { fill: Colors.nutrition } }}
        />
      </VictoryChart>

      {/* ── Macros Chart ── */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Macros (g)</Text>

      <VictoryChart
        height={160}
        padding={{ top: 8, bottom: 32, left: 40, right: 16 }}
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
        <VictoryGroup offset={data.length <= 14 ? 6 : 3}>
          <VictoryBar
            data={proteinData}
            style={{ data: { fill: PROTEIN_COLOR, opacity: 0.85 } }}
            barWidth={data.length <= 14 ? 5 : 3}
          />
          <VictoryBar
            data={carbsData}
            style={{ data: { fill: CARBS_COLOR, opacity: 0.85 } }}
            barWidth={data.length <= 14 ? 5 : 3}
          />
          <VictoryBar
            data={fatData}
            style={{ data: { fill: FAT_COLOR, opacity: 0.85 } }}
            barWidth={data.length <= 14 ? 5 : 3}
          />
        </VictoryGroup>
      </VictoryChart>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: PROTEIN_COLOR, label: 'Protein' },
          { color: CARBS_COLOR, label: 'Carbs' },
          { color: FAT_COLOR, label: 'Fat' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 52,
    marginTop: 4,
    marginBottom: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});
