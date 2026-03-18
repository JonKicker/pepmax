import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getCompletedSessions } from '../../../src/services/workoutSessionService';
import { formatVolume, formatWorkoutDuration } from '../../../src/utils/training';
import type { WorkoutSession } from '../../../src/types/workout';
import type { MuscleGroup } from '../../../src/types/exercise';

// ─── Constants ──────────────────────────────────────────────────────────────

const DATE_RANGES = ['This Week', 'This Month', '3 Months', 'All Time'] as const;
type DateRange = (typeof DATE_RANGES)[number];

const MUSCLE_COLORS: Partial<Record<MuscleGroup, string>> = {
  Chest: '#E74C3C',
  Back: '#2E86C1',
  Shoulders: '#E67E22',
  Biceps: '#27AE60',
  Triceps: '#8E44AD',
  Quads: '#1ABC9C',
  Hamstrings: '#D35400',
  Glutes: '#C0392B',
  Core: '#2980B9',
  Calves: '#16A085',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSessionDate(ts: any): string {
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDateCutoff(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case 'This Week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday as start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'This Month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case '3 Months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case 'All Time':
      return new Date(0);
  }
}

function sessionToDate(session: WorkoutSession): Date {
  const ts = session.startedAt;
  return ts?.toDate ? ts.toDate() : new Date(ts as any);
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onPress,
  colors,
}: {
  session: WorkoutSession;
  onPress: () => void;
  colors: any;
}) {
  const date = formatSessionDate(session.startedAt);
  const exerciseCount = session.exercises.filter((e) =>
    e.sets.some((s) => s.completed),
  ).length;
  const completedSets = session.exercises.flatMap((e) =>
    e.sets.filter((s) => s.completed),
  );
  const prCount = completedSets.filter((s) => s.isPersonalRecord).length;
  const muscles = [
    ...new Set(session.exercises.map((e) => e.primaryMuscle)),
  ] as MuscleGroup[];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[cardStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[cardStyles.accent, { backgroundColor: Colors.gym }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={[cardStyles.date, { color: colors.textSecondary }]}>{date}</Text>
          <View style={cardStyles.badgeRow}>
            {session.isBareMinimum && (
              <View style={cardStyles.adaptedBadge}>
                <Text style={cardStyles.adaptedBadgeText}>Adapted</Text>
              </View>
            )}
            {prCount > 0 && (
              <View style={cardStyles.prBadge}>
                <Ionicons name="trophy" size={12} color="#333" />
                <Text style={cardStyles.prBadgeText}>x{prCount}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[cardStyles.templateName, { color: colors.textPrimary }]} numberOfLines={1}>
          {session.templateName || 'Quick Workout'}
        </Text>

        <View style={cardStyles.statsRow}>
          <Text style={[cardStyles.stat, { color: colors.textSecondary }]}>
            {formatWorkoutDuration(session.duration)}
          </Text>
          <Text style={[cardStyles.statDot, { color: colors.textSecondary }]}>·</Text>
          <Text style={[cardStyles.stat, { color: colors.textSecondary }]}>
            {formatVolume(session.totalVolume)}
          </Text>
          <Text style={[cardStyles.statDot, { color: colors.textSecondary }]}>·</Text>
          <Text style={[cardStyles.stat, { color: colors.textSecondary }]}>
            {exerciseCount} ex · {completedSets.length} sets
          </Text>
        </View>

        {/* Muscle group dots */}
        <View style={cardStyles.muscleRow}>
          {muscles.slice(0, 6).map((m) => (
            <View
              key={m}
              style={[cardStyles.muscleDot, { backgroundColor: MUSCLE_COLORS[m] ?? Colors.gym }]}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  accent: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  date: { fontSize: 12, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  adaptedBadge: {
    backgroundColor: Colors.warning, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  adaptedBadgeText: { fontSize: 10, fontWeight: '800', color: 'white' },
  prBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.gold, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  prBadgeText: { fontSize: 10, fontWeight: '800', color: '#333' },
  templateName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stat: { fontSize: 12, fontWeight: '600' },
  statDot: { marginHorizontal: 6, fontSize: 12 },
  muscleRow: { flexDirection: 'row', gap: 4 },
  muscleDot: { width: 8, height: 8, borderRadius: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('All Time');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const result = await getCompletedSessions(200);
    if (!result.error) setSessions(result.data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    let result = sessions.filter((s) => sessionToDate(s) >= cutoff);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.exercises.some((e) => e.exerciseName.toLowerCase().includes(q)) ||
        (s.templateName ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [sessions, dateRange, searchQuery]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.gym} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search exercises or templates..."
            placeholderTextColor={colors.textSecondary + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date range filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {DATE_RANGES.map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setDateRange(range)}
            style={[
              styles.filterChip,
              {
                backgroundColor: dateRange === range ? Colors.gym : colors.surface,
                borderColor: dateRange === range ? Colors.gym : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: dateRange === range ? 'white' : colors.textSecondary },
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Session list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.gym} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No matching sessions found.' : 'No completed workouts yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/training/session-detail',
                params: { sessionId: item.id },
              })
            }
            colors={colors}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterScroll: { maxHeight: 48, marginTop: 8 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  listEmpty: { flex: 1 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
});
