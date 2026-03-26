/**
 * SegmentLeaderboard — fetches and displays efforts for a segment.
 *
 * Filter pills: All-Time | This Month | Friends Only | Crew
 * Highlights the current user's own row. Crown next to #1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/theme';
import { getSegmentLeaderboard } from '../../services/segmentService';
import { getFriends } from '../../services/friendService';
import { getMyCrews } from '../../services/crewService';
import type { SegmentEffort, SegmentFilter } from '../../types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPaceKm(secondsPerKm: number): string {
  if (secondsPerKm <= 0) return '—';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const FILTER_LABELS: { value: SegmentFilter; label: string }[] = [
  { value: 'allTime', label: 'All-Time' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'friendsOnly', label: 'Friends Only' },
  { value: 'crew', label: 'Crew' },
];

// ─── Row ──────────────────────────────────────────────────────────────────────

function LeaderRow({
  rank,
  effort,
  isMe,
  colors,
}: {
  rank: number;
  effort: SegmentEffort;
  isMe: boolean;
  colors: any;
}) {
  const bg = isMe ? Colors.cardio + '18' : 'transparent';
  return (
    <View style={[styles.row, { backgroundColor: bg, borderBottomColor: colors.border }]}>
      <View style={styles.rankCell}>
        {rank === 1 ? (
          <Text style={styles.crown}>{'👑'}</Text>
        ) : (
          <Text style={[styles.rankText, { color: colors.textSecondary }]}>{rank}</Text>
        )}
      </View>
      <Text style={[styles.username, { color: isMe ? Colors.cardio : colors.textPrimary }]} numberOfLines={1}>
        {effort.displayName}
      </Text>
      <Text style={[styles.timeCell, { color: colors.textPrimary }]}>
        {formatDuration(effort.durationSeconds)}
      </Text>
      <Text style={[styles.paceCell, { color: colors.textSecondary }]}>
        {formatPaceKm(effort.paceSecondsPerKm)}
      </Text>
      <Text style={[styles.dateCell, { color: colors.textSecondary }]}>
        {formatDate(effort.attemptedAt as unknown as Date)}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  segmentId: string;
  distanceMeters: number;
};

export default function SegmentLeaderboard({ segmentId }: Props) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [allEfforts, setAllEfforts] = useState<SegmentEffort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<SegmentFilter>('allTime');

  // UID sets for friend/crew filtering
  const [friendUids, setFriendUids] = useState<Set<string>>(new Set());
  const [crewUids, setCrewUids] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const [leaderResult, friendsResult, crewsResult] = await Promise.all([
      getSegmentLeaderboard(segmentId),
      getFriends(),
      getMyCrews(),
    ]);

    if (leaderResult.data) setAllEfforts(leaderResult.data);

    if (friendsResult.data) {
      setFriendUids(new Set(friendsResult.data.map((f) => f.friendUid)));
    }
    if (crewsResult.data && currentUser?.uid) {
      const uids = new Set<string>();
      crewsResult.data.forEach((c) => c.memberUids.forEach((u) => uids.add(u)));
      setCrewUids(uids);
    }

    setLoading(false);
  }, [segmentId, currentUser?.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  // Apply filter
  const now = Date.now();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthMs = startOfMonth.getTime();

  const filtered = allEfforts.filter((effort) => {
    if (activeFilter === 'allTime') return true;
    const ts = effort.attemptedAt instanceof Date
      ? effort.attemptedAt.getTime()
      : (effort.attemptedAt as any)?.toDate?.()?.getTime?.() ?? now;
    if (activeFilter === 'thisMonth') return ts >= startOfMonthMs;
    if (activeFilter === 'friendsOnly') return effort.uid === currentUser?.uid || friendUids.has(effort.uid);
    if (activeFilter === 'crew') return effort.uid === currentUser?.uid || crewUids.has(effort.uid);
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Filter pills */}
      <View style={styles.filters}>
        {FILTER_LABELS.map(({ value, label }) => {
          const active = activeFilter === value;
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? Colors.cardio : colors.surface,
                  borderColor: active ? Colors.cardio : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: active ? 'white' : colors.textPrimary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.cardio} style={styles.loader} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="timer-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No efforts yet
          </Text>
        </View>
      ) : (
        <>
          {/* Header row */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={styles.rankCell} />
            <Text style={[styles.colHeader, { color: colors.textSecondary, flex: 1 }]}>Athlete</Text>
            <Text style={[styles.colHeader, { color: colors.textSecondary, width: 64 }]}>Time</Text>
            <Text style={[styles.colHeader, { color: colors.textSecondary, width: 72 }]}>Pace</Text>
            <Text style={[styles.colHeader, { color: colors.textSecondary, width: 54 }]}>Date</Text>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.uid}
            renderItem={({ item, index }) => (
              <LeaderRow
                rank={index + 1}
                effort={item}
                isMe={item.uid === currentUser?.uid}
                colors={colors}
              />
            )}
            scrollEnabled={false}
          />
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  loader: { marginVertical: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14 },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  colHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  rankCell: { width: 28, alignItems: 'center' },
  rankText: { fontSize: 13, fontWeight: '600' },
  crown: { fontSize: 14 },
  username: { flex: 1, fontSize: 13, fontWeight: '600' },
  timeCell: { width: 64, fontSize: 13, fontWeight: '700' },
  paceCell: { width: 72, fontSize: 12 },
  dateCell: { width: 54, fontSize: 11 },
});
