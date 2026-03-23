import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { useUnits } from '../../../src/hooks/useUnits';
import { Colors } from '../../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getMeasurementHistory } from '../../../src/services/bodyMeasurementService';
import {
  filterByTimeRange,
  computeWeeklyAverages,
  findPersonalBests,
} from '../../../src/utils/bodyMeasurementUtils';
import MeasurementTrendChart from '../../../src/components/body/MeasurementTrendChart';

import type { BodyMeasurement } from '../../../src/types/bodyMeasurement';
import type { TimeRange } from '../../../src/types/bodyTracking';

export default function MeasurementTrendsScreen() {
  const { colors } = useTheme();
  const { formatWeight, formatLength, convertWeightToDisplay, convertLengthToDisplay, weightLabel, lengthLabel } = useUnits();

  const [allEntries, setAllEntries] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightRange, setWeightRange] = useState<TimeRange>('3M');
  const [bfRange, setBfRange] = useState<TimeRange>('3M');
  const [waistRange, setWaistRange] = useState<TimeRange>('3M');

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    const result = await getMeasurementHistory();
    if (result.error) {
      setError('Failed to load data. Tap to retry.');
    } else {
      setAllEntries(result.data ?? []);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadEntries(); }, []));

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity
        style={[styles.centered, { backgroundColor: colors.background }]}
        onPress={loadEntries}
      >
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
        <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
      </TouchableOpacity>
    );
  }

  // Weight chart
  const weightEntries = filterByTimeRange(allEntries, weightRange).filter((e) => e.weight != null);
  const weightData = weightEntries.map((e) => ({
    x: new Date(e.date + 'T00:00:00'),
    y: convertWeightToDisplay(e.weight!),
    label: `${convertWeightToDisplay(e.weight!)} ${weightLabel}\n${e.date}`,
  }));
  const weightWeekly = computeWeeklyAverages(
    filterByTimeRange(allEntries, weightRange),
    'weight',
  ).map((w) => ({ weekStart: w.weekStart, avg: convertWeightToDisplay(w.avg) }));

  // Body fat chart
  const bfEntries = filterByTimeRange(allEntries, bfRange).filter((e) => e.bodyFatPercent != null);
  const bfData = bfEntries.map((e) => ({
    x: new Date(e.date + 'T00:00:00'),
    y: e.bodyFatPercent!,
    label: `${e.bodyFatPercent}%\n${e.date}`,
  }));
  const bfWeekly = computeWeeklyAverages(filterByTimeRange(allEntries, bfRange), 'bodyFatPercent');

  // Waist chart
  const waistEntries = filterByTimeRange(allEntries, waistRange).filter(
    (e) => e.measurements.waist != null,
  );
  const waistData = waistEntries.map((e) => ({
    x: new Date(e.date + 'T00:00:00'),
    y: convertLengthToDisplay(e.measurements.waist!),
    label: `${convertLengthToDisplay(e.measurements.waist!)} ${lengthLabel}\n${e.date}`,
  }));
  const waistWeekly = computeWeeklyAverages(
    filterByTimeRange(allEntries, waistRange),
    'waist',
  ).map((w) => ({ weekStart: w.weekStart, avg: convertLengthToDisplay(w.avg) }));

  const bests = findPersonalBests(allEntries);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Weight trend */}
      <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Weight ({weightLabel})</Text>
        <MeasurementTrendChart
          data={weightData}
          weeklyAverages={weightWeekly}
          timeRange={weightRange}
          onTimeRangeChange={setWeightRange}
          unitLabel={weightLabel}
          color={Colors.gym}
          emptyMessage="No weight data in this range"
        />
      </View>

      {/* Body fat trend — only shown if any data exists */}
      {allEntries.some((e) => e.bodyFatPercent != null) && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Body Fat %</Text>
          <MeasurementTrendChart
            data={bfData}
            weeklyAverages={bfWeekly}
            timeRange={bfRange}
            onTimeRangeChange={setBfRange}
            unitLabel="%"
            color="#e67e22"
            emptyMessage="No body fat data in this range"
          />
        </View>
      )}

      {/* Waist trend — only shown if any data exists */}
      {allEntries.some((e) => e.measurements.waist != null) && (
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Waist ({lengthLabel})</Text>
          <MeasurementTrendChart
            data={waistData}
            weeklyAverages={waistWeekly}
            timeRange={waistRange}
            onTimeRangeChange={setWaistRange}
            unitLabel={lengthLabel}
            color="#9b59b6"
            emptyMessage="No waist data in this range"
          />
        </View>
      )}

      {/* Personal bests */}
      {(bests.lowestWeight || bests.lowestBodyFat || bests.lowestWaist) && (
        <View style={[styles.bestsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.bestsTitle, { color: colors.textPrimary }]}>Personal Bests</Text>
          {bests.lowestWeight && (
            <BestRow
              label="Lowest Weight"
              value={formatWeight(bests.lowestWeight.value)}
              date={bests.lowestWeight.date}
              colors={colors}
            />
          )}
          {bests.lowestBodyFat && (
            <BestRow
              label="Lowest Body Fat"
              value={`${bests.lowestBodyFat.value}%`}
              date={bests.lowestBodyFat.date}
              colors={colors}
            />
          )}
          {bests.lowestWaist && (
            <BestRow
              label="Smallest Waist"
              value={formatLength(bests.lowestWaist.value)}
              date={bests.lowestWaist.date}
              colors={colors}
            />
          )}
        </View>
      )}

      {allEntries.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Log measurements to see trends here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function BestRow({
  label,
  value,
  date,
  colors,
}: {
  label: string;
  value: string;
  date: string;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  return (
    <View style={styles.bestRow}>
      <Text style={[styles.bestLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.bestRight}>
        <Text style={[styles.bestValue, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[styles.bestDate, { color: colors.textSecondary }]}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },

  bestsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  bestsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  bestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  bestLabel: { fontSize: 14 },
  bestRight: { alignItems: 'flex-end' },
  bestValue: { fontSize: 15, fontWeight: '700' },
  bestDate: { fontSize: 12, marginTop: 1 },

  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
});
