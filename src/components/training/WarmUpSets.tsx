import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { computeWarmUpSets } from '../../utils/warmUpCalculator';
import type { WeightUnit, BarType } from '../../types/warmUp';

interface WarmUpSetsProps {
  workingWeight: number;
  unit: WeightUnit;
  barType: BarType;
}

export function WarmUpSets({ workingWeight, unit, barType }: WarmUpSetsProps) {
  const { colors } = useTheme();
  const result = computeWarmUpSets(workingWeight, unit, barType);

  if (result.sets.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: Colors.gym }]}>Warm-Up Sets</Text>

      {/* Column headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.setCol, { color: colors.textSecondary }]}>Set</Text>
        <Text style={[styles.headerCell, styles.pctCol, { color: colors.textSecondary }]}>%</Text>
        <Text style={[styles.headerCell, styles.weightCol, { color: colors.textSecondary }]}>Weight</Text>
        <Text style={[styles.headerCell, styles.repsCol, { color: colors.textSecondary }]}>Reps</Text>
      </View>

      {result.sets.map((s) => (
        <View
          key={s.setNumber}
          style={[styles.row, { borderColor: colors.border }]}
        >
          <Text style={[styles.cell, styles.setCol, { color: colors.textSecondary }]}>
            W{s.setNumber}
          </Text>
          <Text style={[styles.cell, styles.pctCol, { color: colors.textSecondary }]}>
            {s.percent}%
          </Text>
          <Text style={[styles.cell, styles.weightCol, { color: colors.textPrimary }]}>
            {s.weight} {unit}
          </Text>
          <Text style={[styles.cell, styles.repsCol, { color: colors.textPrimary }]}>
            {s.reps}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
  },
  cell: {
    fontSize: 13,
    fontWeight: '500',
  },
  setCol: { width: 32 },
  pctCol: { width: 42 },
  weightCol: { flex: 1 },
  repsCol: { width: 40, textAlign: 'right' },
});
