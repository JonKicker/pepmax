import React, { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useNutritionProgress } from '../../../src/hooks/useNutritionProgress';
import MacroTrendChart from '../../../src/components/nutrition/MacroTrendChart';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

export default function NutritionProgressScreen() {
  const { colors } = useTheme();
  const progress = useNutritionProgress('1M');

  useEffect(() => {
    analytics.track(AnalyticsEvent.NUTRITION_PROGRESS_VIEWED);
  }, []);

  if (progress.loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} size="large" />
      </View>
    );
  }

  if (progress.error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Could not load nutrition data.
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.border }]}
          onPress={progress.reload}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryText, { color: Colors.nutrition }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { averages } = progress;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Chart card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MacroTrendChart
          data={progress.data}
          timeRange={progress.timeRange}
          onTimeRangeChange={progress.setTimeRange}
          colors={colors}
        />
      </View>

      {/* Average stats section */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Daily Averages</Text>

      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatRow label="Calories" value={`${averages.calories.toLocaleString()} kcal`} color={Colors.nutrition} colors={colors} />
        <StatRow label="Protein" value={`${averages.protein}g`} color="#3498DB" colors={colors} />
        <StatRow label="Carbs" value={`${averages.carbs}g`} color="#E67E22" colors={colors} />
        <StatRow label="Fat" value={`${averages.fat}g`} color="#E74C3C" colors={colors} />
      </View>

      {progress.data.length > 0 && (
        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
          Based on {progress.data.length} logged day{progress.data.length !== 1 ? 's' : ''}
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
}: {
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
