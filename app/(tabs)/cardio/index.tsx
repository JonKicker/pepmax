import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getLastSessionByType, getThisWeekCardioSummary } from '../../../src/services/cardioService';
import { formatDistance, formatDuration } from '../../../src/utils/cardio';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import WeeklySummaryCard from '../../../src/components/cardio/WeeklySummaryCard';
import type { ActivityType, LastSessionSummary } from '../../../src/types/cardio';
import type { WeeklyCardioSummary } from '../../../src/services/cardioService';

// ─── Types ────────────────────────────────────────────────────────────────────

type Activity = {
  type: ActivityType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const ACTIVITIES: Activity[] = [
  { type: 'run', label: 'Run', icon: 'walk' },
  { type: 'cycle', label: 'Cycle', icon: 'bicycle' },
  { type: 'walk', label: 'Walk', icon: 'footsteps' },
  { type: 'swim', label: 'Swim', icon: 'water' },
];

// ─── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  lastSession,
  loading,
  onStart,
  colors,
}: {
  activity: Activity;
  lastSession: LastSessionSummary | null;
  loading: boolean;
  onStart: (type: ActivityType) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const { settings } = useCardioSettings();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: Colors.cardio }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.cardio + '1A' }]}>
            <Ionicons name={activity.icon} size={26} color={Colors.cardio} />
          </View>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{activity.label}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.cardio} style={styles.cardLoader} />
        ) : lastSession ? (
          <View style={styles.lastSessionRow}>
            <Text style={[styles.lastSessionText, { color: colors.textSecondary }]}>
              Last: {formatDistance(lastSession.distance, settings.distanceUnit)} · {formatDuration(lastSession.duration)} · {lastSession.date}
            </Text>
          </View>
        ) : (
          <Text style={[styles.noSession, { color: colors.textSecondary }]}>No sessions yet</Text>
        )}

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: Colors.cardio }]}
          onPress={() => onStart(activity.type)}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={14} color="white" />
          <Text style={styles.startBtnText}>Start</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function CardioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings } = useCardioSettings();

  const [lastSessions, setLastSessions] = useState<Record<ActivityType, LastSessionSummary | null>>({
    run: null,
    cycle: null,
    walk: null,
    swim: null,
  });
  const [weeklySummary, setWeeklySummary] = useState<WeeklyCardioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLastSessions = useCallback(async () => {
    setLoading(true);
    const [weeklyResult, ...activityResults] = await Promise.all([
      getThisWeekCardioSummary(),
      ...ACTIVITIES.map((a) => getLastSessionByType(a.type)),
    ]);

    setWeeklySummary(weeklyResult.data ?? null);

    const map: Record<ActivityType, LastSessionSummary | null> = {
      run: null,
      cycle: null,
      walk: null,
      swim: null,
    };
    ACTIVITIES.forEach((a, i) => {
      const s = activityResults[i].data;
      if (s) {
        map[a.type] = {
          activityType: s.activityType,
          distance: s.distance,
          duration: s.duration,
          date: s.startedAt.toDate().toLocaleDateString(),
        };
      }
    });
    setLastSessions(map);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLastSessions();
    }, [loadLastSessions])
  );

  const handleStart = (type: ActivityType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(tabs)/cardio/start-session', params: { activityType: type } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.list}>
        <WeeklySummaryCard
          summary={loading ? null : weeklySummary}
          distanceUnit={settings.distanceUnit}
        />
        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.type}
            activity={activity}
            lastSession={lastSessions[activity.type]}
            loading={loading}
            onStart={handleStart}
            colors={colors}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/history')}
        >
          <Ionicons name="list" size={18} color={Colors.cardio} />
          <Text style={[styles.footerBtnText, { color: Colors.cardio }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/progress')}
        >
          <Ionicons name="analytics" size={18} color={Colors.cardio} />
          <Text style={[styles.footerBtnText, { color: Colors.cardio }]}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/settings')}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 16, gap: 12 },

  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardLabel: { fontSize: 18, fontWeight: '700' },
  cardLoader: { marginBottom: 10 },
  lastSessionRow: { marginBottom: 10 },
  lastSessionText: { fontSize: 13 },
  noSession: { fontSize: 13, marginBottom: 10 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerBtnText: { fontSize: 14, fontWeight: '600' },
});
