import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getFilteredSessions } from '../../../src/services/cardioService';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import { formatDistance, formatDuration, formatPace, isGoalMet } from '../../../src/utils/cardio';
import FilterBar from '../../../src/components/cardio/FilterBar';
import RouteMap from '../../../src/components/cardio/RouteMap';
import type { CardioSession, HistoryFilter } from '../../../src/types/cardio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 604800000) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(key: string): string {
  const [year, wStr] = key.split('-W');
  const week = parseInt(wStr, 10);
  const jan4 = new Date(parseInt(year, 10), 0, 4);
  const start = new Date(jan4.getTime() + (week - 1) * 7 * 86400000);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const ACTIVITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk',
  cycle: 'bicycle',
  walk: 'footsteps',
  swim: 'water',
};

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Run', cycle: 'Cycle', walk: 'Walk', swim: 'Swim',
};

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  unit,
  onPress,
  colors,
}: {
  session: CardioSession;
  unit: 'mi' | 'km';
  onPress: () => void;
  colors: any;
}) {
  const date = session.startedAt.toDate().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const goalMet = isGoalMet(session);

  const hasRoute = session.route && session.route.length >= 2;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <View style={[styles.rowIcon, { backgroundColor: Colors.cardio + '1A' }]}>
            <Ionicons
              name={ACTIVITY_ICONS[session.activityType] ?? 'fitness'}
              size={20}
              color={Colors.cardio}
            />
          </View>
          <View style={styles.rowTitleArea}>
            <View style={styles.rowTitleRow}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                {ACTIVITY_LABELS[session.activityType] ?? session.activityType}
              </Text>
              {goalMet && (
                <Ionicons name="checkmark-circle" size={14} color="#27AE60" />
              )}
            </View>
            <Text style={[styles.rowDate, { color: colors.textSecondary }]}>{date}</Text>
          </View>
          {hasRoute && (
            <View style={styles.thumbnailWrap}>
              <RouteMap
                route={session.route}
                averagePace={session.averagePace}
                interactive={false}
                style={styles.thumbnail}
              />
            </View>
          )}
        </View>
        <View style={styles.rowStats}>
          <Text style={[styles.rowStat, { color: colors.textPrimary }]}>
            {formatDistance(session.distance, unit)}
          </Text>
          <Text style={[styles.rowStatSep, { color: colors.border }]}>·</Text>
          <Text style={[styles.rowStat, { color: colors.textPrimary }]}>
            {formatDuration(session.duration)}
          </Text>
          <Text style={[styles.rowStatSep, { color: colors.border }]}>·</Text>
          <Text style={[styles.rowStat, { color: colors.textPrimary }]}>
            {formatPace(session.averagePace, unit)}
          </Text>
          <Text style={[styles.rowStatSep, { color: colors.border }]}>·</Text>
          <Text style={[styles.rowStat, { color: colors.textSecondary }]}>
            {session.calories} kcal
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

type ListItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'session'; key: string; session: CardioSession };

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings } = useCardioSettings();
  const unit = settings.distanceUnit;

  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<HistoryFilter>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await getFilteredSessions(filters, 50);
    if (result.error || !result.data) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    // Group by week
    const groups = new Map<string, CardioSession[]>();
    for (const s of result.data) {
      const key = weekKey(s.startedAt.toDate());
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    const flat: ListItem[] = [];
    for (const [key, sessions] of groups) {
      flat.push({ type: 'header', key: `h-${key}`, label: weekLabel(key) });
      for (const s of sessions) {
        flat.push({ type: 'session', key: s.id, session: s });
      }
    }
    setItems(flat);
    setLoading(false);
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleFiltersChange = (newFilters: HistoryFilter) => {
    setFilters(newFilters);
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.cardio} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Failed to load sessions.
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: Colors.cardio }]} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
        <View style={styles.centered}>
          <Ionicons name="bicycle-outline" size={52} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No sessions found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {filters.activityType || filters.dateRange !== undefined
              ? 'Try adjusting your filters.'
              : 'Complete a session to see it here.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text style={[styles.weekHeader, { color: colors.textSecondary }]}>{item.label}</Text>
            );
          }
          return (
            <SessionRow
              session={item.session}
              unit={unit}
              colors={colors}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/cardio/session-detail',
                  params: { sessionId: item.session.id },
                })
              }
            />
          );
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullContainer: { flex: 1, paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  errorText: { fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  list: { paddingHorizontal: 16, paddingBottom: 48, gap: 8 },
  weekHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },

  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  rowMain: { gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleArea: { flex: 1 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowDate: { fontSize: 12, marginTop: 2 },
  thumbnailWrap: { width: 52, height: 52, borderRadius: 8, overflow: 'hidden' },
  thumbnail: { width: 52, height: 52, borderRadius: 8 },
  rowStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  rowStat: { fontSize: 13, fontWeight: '500' },
  rowStatSep: { fontSize: 13 },
});
