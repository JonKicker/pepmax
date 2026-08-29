import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { AnimatedPressable } from '../../../src/components/AnimatedPressable';
import { StaggeredList } from '../../../src/components/StaggeredList';
import { CardioSkeleton } from '../../../src/components/SkeletonScreen';
import { Colors } from '../../../src/constants/theme';
import { getLastSessionByType, getThisWeekCardioSummary } from '../../../src/services/cardioService';
import { formatDistance, formatDuration } from '../../../src/utils/cardio';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import WeeklySummaryCard from '../../../src/components/cardio/WeeklySummaryCard';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { ACTIVITY_REGISTRY } from '../../../src/constants/activityRegistry';
import type { ActivityType, LastSessionSummary } from '../../../src/types/cardio';
import type { WeeklyCardioSummary } from '../../../src/services/cardioService';

// ─── Types ────────────────────────────────────────────────────────────────────

type Activity = {
  type: ActivityType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

// Drive activity list from registry (RAY #7 — no hardcoded activity list)
const ACTIVITIES: Activity[] = ACTIVITY_REGISTRY.map((a) => ({
  type: a.type,
  label: a.label,
  icon: a.icon as React.ComponentProps<typeof Ionicons>['name'],
}));

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
    <View style={[styles.card, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}>
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

        <AnimatedPressable
          haptic
          style={[styles.startBtn, { backgroundColor: Colors.cardio }]}
          onPress={() => onStart(activity.type)}
        >
          <Ionicons name="play" size={14} color="white" />
          <Text style={styles.startBtnText}>Start</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function CardioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { settings } = useCardioSettings();

  const [lastSessions, setLastSessions] = useState<Partial<Record<ActivityType, LastSessionSummary | null>>>(
    Object.fromEntries(ACTIVITIES.map((a) => [a.type, null])) as Partial<Record<ActivityType, LastSessionSummary | null>>,
  );
  const [weeklySummary, setWeeklySummary] = useState<WeeklyCardioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLastSessions = useCallback(async () => {
    setLoading(true);
    const [weeklyResult, ...activityResults] = await Promise.all([
      getThisWeekCardioSummary(),
      ...ACTIVITIES.map((a) => getLastSessionByType(a.type)),
    ]);

    setWeeklySummary(weeklyResult.data ?? null);

    const map: Partial<Record<ActivityType, LastSessionSummary | null>> =
      Object.fromEntries(ACTIVITIES.map((a) => [a.type, null]));
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
    router.push({ pathname: '/(tabs)/cardio/start-session', params: { activityType: type } });
  };

  if (loading) return <CardioSkeleton />;

  return (
    <GlassBackground>
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <StaggeredList staggerDelay={80}>
          <WeeklySummaryCard
            summary={weeklySummary}
            distanceUnit={settings.distanceUnit}
          />

          {/* Segments entry point */}
          <AnimatedPressable
            haptic
            style={[styles.segmentsCard, { backgroundColor: colors.glass.subtle, borderColor: colors.glass.border }]}
            onPress={() => router.push('/(tabs)/cardio/segments')}
          >
            <View style={[styles.segmentsAccent, { backgroundColor: Colors.cardio }]} />
            <View style={styles.segmentsContent}>
              <View style={[styles.segmentsIconWrap, { backgroundColor: Colors.cardio + '1A' }]}>
                <Ionicons name="flag" size={22} color={Colors.cardio} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.segmentsTitle, { color: colors.textPrimary }]}>Segments</Text>
                <Text style={[styles.segmentsSubtitle, { color: colors.textSecondary }]}>
                  Compete on named stretches of road or trail
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </AnimatedPressable>

          {ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.type}
              activity={activity}
              lastSession={lastSessions[activity.type] ?? null}
              loading={false}
              onStart={handleStart}
              colors={colors}
            />
          ))}
        </StaggeredList>
      </ScrollView>

      <AnimatedPressable
        haptic
        style={[styles.fab, { backgroundColor: Colors.cardio }]}
        onPress={() => router.push('/(tabs)/cardio/start-session')}
      >
        <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={30} color="white" />
        </View>
      </AnimatedPressable>

      <View style={[styles.footer, { borderTopColor: colors.glass.border }]}>
        <AnimatedPressable
          haptic
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/history')}
        >
          <Ionicons name="list" size={18} color={Colors.cardio} />
          <Text style={[styles.footerBtnText, { color: Colors.cardio }]}>History</Text>
        </AnimatedPressable>
        <AnimatedPressable
          haptic
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/progress')}
        >
          <Ionicons name="analytics" size={18} color={Colors.cardio} />
          <Text style={[styles.footerBtnText, { color: Colors.cardio }]}>Progress</Text>
        </AnimatedPressable>
        <AnimatedPressable
          haptic
          style={styles.footerBtn}
          onPress={() => router.push('/(tabs)/cardio/settings')}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>Settings</Text>
        </AnimatedPressable>
      </View>
    </View>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 148, gap: 12 },

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

  segmentsCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentsAccent: { width: 4 },
  segmentsContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  segmentsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentsTitle: { fontSize: 15, fontWeight: '700' },
  segmentsSubtitle: { fontSize: 12, marginTop: 2 },

  fab: {
    position: 'absolute',
    bottom: 72,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
