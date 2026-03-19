import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getLogsForDateRange } from '../../../src/services/nutritionService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import {
  aggregateMicronutrients,
  getDashboardTrafficLight,
  getNeedsAttentionNutrients,
} from '../../../src/utils/microAggregation';
import type { AggregationResult, MicroAggregate } from '../../../src/utils/microAggregation';
import { MICRONUTRIENT_LABELS, MICRONUTRIENT_UNITS } from '../../../src/constants/nutrition';
import { FOCUS_PACKS } from '../../../src/constants/focusPacks';
import type { FoodLogEntry } from '../../../src/types/nutrition';

const TRAFFIC_COLORS = {
  green: '#4CAF50',
  yellow: '#FF9800',
  red: '#F44336',
};

// ─── Mini Sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ rdaPercents }: { rdaPercents: number[] }) {
  const BAR_WIDTH = 6;
  const BAR_GAP = 2;
  const MAX_HEIGHT = 28;
  const MIN_HEIGHT = 2;

  const maxVal = Math.max(...rdaPercents, 1);
  return (
    <View style={sparkStyles.container}>
      {rdaPercents.map((pct, i) => {
        const height = Math.max(MIN_HEIGHT, (pct / Math.max(maxVal, 100)) * MAX_HEIGHT);
        const color = TRAFFIC_COLORS[getDashboardTrafficLight(pct)];
        return (
          <View
            key={i}
            style={[
              sparkStyles.bar,
              { width: BAR_WIDTH, height, backgroundColor: color, marginLeft: i === 0 ? 0 : BAR_GAP },
            ]}
          />
        );
      })}
    </View>
  );
}

const sparkStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 28 },
  bar: { borderRadius: 2 },
});

// ─── Group weekly averages for 30-day sparkline (4 bars) ──────────────────────

function weeklyAvgRdaPercents(dailyRdaPercents: number[]): number[] {
  const weeks: number[] = [];
  for (let w = 0; w < 4; w++) {
    const start = w * 7;
    const slice = dailyRdaPercents.slice(start, start + 7);
    const avg = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
    weeks.push(avg);
  }
  return weeks;
}

// ─── Nutrient Row ─────────────────────────────────────────────────────────────

function NutrientRow({
  agg,
  timeRange,
  needsAttention,
  colors,
}: {
  agg: MicroAggregate;
  timeRange: 'week' | 'month';
  needsAttention: Set<string>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const light = getDashboardTrafficLight(agg.rdaPercent);
  const unit = MICRONUTRIENT_UNITS[agg.nutrientKey] ?? '';
  const label = MICRONUTRIENT_LABELS[agg.nutrientKey] ?? agg.nutrientKey;
  const avgDisplay =
    agg.avgDaily < 10
      ? agg.avgDaily.toFixed(1)
      : Math.round(agg.avgDaily).toString();
  const rdaPctDisplay = Math.round(agg.rdaPercent);
  const sparkData =
    timeRange === 'week'
      ? agg.dailyRdaPercents
      : weeklyAvgRdaPercents(agg.dailyRdaPercents);
  const showBadge = timeRange === 'month' && needsAttention.has(agg.nutrientKey);

  return (
    <View style={[rowStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[rowStyles.dot, { backgroundColor: TRAFFIC_COLORS[light] }]} />
      <View style={rowStyles.info}>
        <Text style={[rowStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[rowStyles.value, { color: colors.textSecondary }]}>
          {avgDisplay}{unit} · {rdaPctDisplay}% RDA
        </Text>
      </View>
      {showBadge && (
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>Needs Attention</Text>
        </View>
      )}
      <MiniSparkline rdaPercents={sparkData} />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 12, marginTop: 1 },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MicrosScreen() {
  const { colors } = useTheme();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [focusPack, setFocusPack] = useState('all');
  const [data, setData] = useState<AggregationResult | null>(null);
  const [needsAttention, setNeedsAttention] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (range: 'week' | 'month') => {
      setLoading(true);
      setError(null);
      const days = range === 'week' ? 7 : 30;
      const today = toLocalDateKey();
      const [y, m, d] = today.split('-').map(Number);
      const startDate = toLocalDateKey(new Date(y, m - 1, d - (days - 1)));

      const result = await getLogsForDateRange(startDate, today);
      if (!result.error && result.data) {
        const entries = result.data as FoodLogEntry[];
        setData(aggregateMicronutrients(entries, days as 7 | 30));
        if (range === 'month') {
          setNeedsAttention(getNeedsAttentionNutrients(entries));
        } else {
          setNeedsAttention(new Set());
        }
      } else if (result.error) {
        setError('Failed to load data. Tap to retry.');
      }
      setLoading(false);
    },
    [],
  );

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      load(timeRange);
    }, [load]),
    // Intentionally omit timeRange — screen-focus reload uses current range,
    // range-change reloads are handled exclusively by handleRangeChange.
  );

  const handleRangeChange = (range: 'week' | 'month') => {
    setTimeRange(range);
    load(range);
  };

  const activePack = FOCUS_PACKS.find((p) => p.id === focusPack) ?? FOCUS_PACKS[0];
  const filteredNutrients =
    activePack.nutrients.length === 0
      ? data?.nutrients ?? []
      : (data?.nutrients ?? []).filter((n) => activePack.nutrients.includes(n.nutrientKey));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      {/* Time range toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['week', 'month'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.toggleTab,
              timeRange === r && { backgroundColor: Colors.nutrition },
            ]}
            onPress={() => handleRangeChange(r)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                { color: timeRange === r ? '#fff' : colors.textSecondary },
              ]}
            >
              {r === 'week' ? 'Week' : 'Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Focus pack chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {FOCUS_PACKS.map((pack) => (
          <TouchableOpacity
            key={pack.id}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              focusPack === pack.id && { backgroundColor: Colors.nutrition, borderColor: Colors.nutrition },
            ]}
            onPress={() => setFocusPack(pack.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: focusPack === pack.id ? '#fff' : colors.textSecondary },
              ]}
            >
              {pack.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Coverage note */}
      {data && (
        <View style={styles.coverageRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.coverageText, { color: colors.textSecondary }]}>
            {data.foodsWithMicroData} of {data.totalFoodsLogged} logged foods include micronutrient data
          </Text>
        </View>
      )}

      {/* Error state */}
      {!loading && error && (
        <TouchableOpacity
          style={[styles.errorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => load(timeRange)}
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
        </TouchableOpacity>
      )}

      {/* Nutrient list */}
      {loading ? (
        <ActivityIndicator color={Colors.nutrition} style={{ marginTop: 40 }} />
      ) : !error ? (
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredNutrients.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No data for selected period.</Text>
          ) : (
            filteredNutrients.map((agg) => (
              <NutrientRow
                key={agg.nutrientKey}
                agg={agg}
                timeRange={timeRange}
                needsAttention={needsAttention}
                colors={colors}
              />
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  toggleRow: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  coverageText: { fontSize: 12 },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: { padding: 24, textAlign: 'center', fontSize: 14 },
  errorRow: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 14, flex: 1 },
});
