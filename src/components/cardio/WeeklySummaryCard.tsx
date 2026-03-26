import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { formatDistance, formatDuration } from '../../utils/cardio';
import type { DistanceUnit } from '../../types/cardio';
import type { WeeklyCardioSummary } from '../../services/cardioService';

type Props = {
  summary: WeeklyCardioSummary | null; // null = loading
  distanceUnit: DistanceUnit;
};

type PillProps = { value: string; label: string };

function Pill({ value, label }: PillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export default function WeeklySummaryCard({ summary, distanceUnit }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>THIS WEEK</Text>
      <View style={styles.row}>
        <Pill
          value={summary ? formatDistance(summary.totalDistanceM, distanceUnit) : '—'}
          label="Distance"
        />
        <View style={styles.divider} />
        <Pill
          value={summary ? String(summary.sessionCount) : '—'}
          label="Sessions"
        />
        <View style={styles.divider} />
        <Pill
          value={summary ? formatDuration(summary.totalDurationSecs) : '—'}
          label="Time"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardio,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  heading: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flex: 1,
    alignItems: 'center',
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
