/**
 * WeightStatsRow — displays starting, current, change, average, lowest, highest
 * for the selected time range.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { WeightStats } from '../../types/bodyTracking';
import type { Units } from '../../types/profile';
import { kgToLbs } from '../../utils/tdee';

type Props = {
  stats: WeightStats;
  goalWeightKg?: number;
  units: Units;
};

function fmt(kg: number, units: Units): string {
  const val = units === 'imperial' ? kgToLbs(kg) : kg;
  return (Math.round(val * 10) / 10).toFixed(1);
}

function changeColor(change: number, goalWeightKg?: number, currentKg?: number): string {
  if (!goalWeightKg || !currentKg) return Colors.light.textSecondary;
  const needToLose = currentKg > goalWeightKg;
  const movingToward = needToLose ? change < 0 : change > 0;
  return movingToward ? Colors.light.success : Colors.error;
}

export default function WeightStatsRow({ stats, goalWeightKg, units }: Props) {
  const { colors } = useTheme();
  const unitLabel = units === 'imperial' ? 'lbs' : 'kg';
  const sign = stats.change >= 0 ? '+' : '';

  const items = [
    { label: 'Start', value: `${fmt(stats.starting, units)}` },
    { label: 'Current', value: `${fmt(stats.current, units)}` },
    {
      label: 'Change',
      value: `${sign}${fmt(stats.change, units)}`,
      color: changeColor(stats.change, goalWeightKg, stats.current),
    },
    { label: 'Avg', value: `${fmt(stats.average, units)}` },
    { label: 'Low', value: `${fmt(stats.lowest, units)}` },
    { label: 'High', value: `${fmt(stats.highest, units)}` },
  ];

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <Text style={[styles.value, { color: item.color ?? colors.textPrimary }]}>
            {item.value}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
    gap: 4,
  },
  cell: {
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
    paddingVertical: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
});
