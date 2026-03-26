import React, { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { usePeptideProgress } from '../../../src/hooks/usePeptideProgress';
import DoseFrequencyChart from '../../../src/components/peptides/DoseFrequencyChart';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

export default function PeptideProgressScreen() {
  const { colors } = useTheme();
  const progress = usePeptideProgress('1M');

  useEffect(() => {
    analytics.track(AnalyticsEvent.PEPTIDE_PROGRESS_VIEWED);
  }, []);

  if (progress.loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.peptide} size="large" />
      </View>
    );
  }

  if (progress.error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Could not load dose data.
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.border }]}
          onPress={progress.reload}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryText, { color: Colors.peptide }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Chart card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DoseFrequencyChart
          data={progress.dosesPerDay}
          timeRange={progress.timeRange}
          onTimeRangeChange={progress.setTimeRange}
          colors={colors}
        />
      </View>

      {/* Summary stats */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Summary</Text>

      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatRow
          label="Total Doses"
          value={progress.totalDoses.toString()}
          color={Colors.peptide}
          colors={colors}
          last={false}
        />
        <StatRow
          label="Avg Per Day"
          value={progress.avgPerDay.toFixed(1)}
          color={Colors.peptide}
          colors={colors}
          last={true}
        />
      </View>

      {progress.dosesPerDay.length > 0 && (
        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
          Based on {progress.dosesPerDay.length} active day{progress.dosesPerDay.length !== 1 ? 's' : ''}
        </Text>
      )}
    </ScrollView>
  );
}

function StatRow({
  label,
  value,
  color,
  colors,
  last,
}: {
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
  last: boolean;
}) {
  return (
    <View style={[styles.statRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={[styles.statLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    fontSize: 15,
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
