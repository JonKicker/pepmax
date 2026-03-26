import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useConsistencyProgress } from '../../../src/hooks/useConsistencyProgress';
import { ConsistencyTrendChart } from '../../../src/components/dashboard/ConsistencyTrendChart';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

export default function ConsistencyDetailScreen() {
  const { colors } = useTheme();
  const consistency = useConsistencyProgress('3M');

  useEffect(() => {
    analytics.track(AnalyticsEvent.CONSISTENCY_TREND_VIEWED);
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Summary stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {consistency.loading ? '–' : consistency.currentWeekPct != null ? `${consistency.currentWeekPct}%` : '–'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {consistency.loading ? '–' : consistency.bestWeekPct != null ? `${consistency.bestWeekPct}%` : '–'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best Week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {consistency.loading ? '–' : consistency.avgPct != null ? `${consistency.avgPct}%` : '–'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Average</Text>
        </View>
      </View>

      {/* Chart */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Weekly Trend</Text>
      {consistency.loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 24 }} />
      ) : (
        <ConsistencyTrendChart
          data={consistency.chartData}
          timeRange={consistency.timeRange}
          onTimeRangeChange={consistency.setTimeRange}
          colors={colors}
        />
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>≥ 80% — Outstanding</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F39C12' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>50–79% — Building</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{'< 50% — Needs work'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },

  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 40 },

  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 8, marginBottom: 4 },

  legend: { gap: 8, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13 },
});
