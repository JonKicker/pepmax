/**
 * SubScoreBar — horizontal progress bar for a single recovery sub-score.
 * Bar color indicates quality: green >70, yellow 50–70, red <50.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Theme } from '../../constants/theme';

type Props = {
  label: string;
  score: number;
  available: boolean;
  colors: Theme['colors'];
};

function barColor(score: number): string {
  if (score >= 70) return '#4CAF50';
  if (score >= 50) return '#FF9800';
  return '#F44336';
}

export function SubScoreBar({ label, score, available, colors }: Props) {
  if (!available) {
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.noData, { color: colors.textSecondary }]}>No data</Text>
      </View>
    );
  }

  const fillWidth = `${Math.max(0, Math.min(100, score))}%` as const;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.scoreText, { color: colors.textSecondary }]}>
          {Math.round(score)}/100
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: fillWidth, backgroundColor: barColor(score) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 13,
  },
  noData: {
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
