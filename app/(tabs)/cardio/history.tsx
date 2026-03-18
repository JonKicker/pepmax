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
import { getRecentSessions } from '../../../src/services/cardioService';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import { formatDistance, formatDuration } from '../../../src/utils/cardio';
import type { CardioSession } from '../../../src/types/cardio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekKey(date: Date): string {
  // Returns "YYYY-Www" for grouping
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 4).getTime()) / 604800000) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(key: string): string {
  // Parse "YYYY-Www" → rough date string
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
  run: 'Run',
  cycle: 'Cycle',
  walk: 'Walk',
  swim: 'Swim',
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

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.rowIcon, { backgroundColor: Colors.cardio + '1A' }]}>
        <Ionicons
          name={ACTIVITY_ICONS[session.activityType] ?? 'fitness'}
          size={20}
          color={Colors.cardio}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
          {ACTIVITY_LABELS[session.activityType] ?? session.activityType}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
          {formatDistance(session.distance, unit)} · {formatDuration(session.duration)} · {date}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const result = await getRecentSessions(50);
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
    // Map is insertion-ordered; sessions are ordered desc by date from Firestore
    for (const [key, sessions] of groups) {
      flat.push({ type: 'header', key: `h-${key}`, label: weekLabel(key) });
      for (const s of sessions) {
        flat.push({ type: 'session', key: s.id, session: s });
      }
    }
    setItems(flat);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.cardio} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Failed to load sessions. Pull to retry.
        </Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: Colors.cardio }]} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="bicycle-outline" size={52} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No sessions yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Complete a session to see it here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
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
                pathname: '/(tabs)/cardio/session-summary',
                params: { sessionId: item.session.id },
              })
            }
          />
        );
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  errorText: { fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: 'white', fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  list: { padding: 16, paddingBottom: 48, gap: 8 },
  weekHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  rowSub: { fontSize: 13 },
});
