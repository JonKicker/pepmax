import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getSessionById } from '../../../src/services/cardioService';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import {
  formatDuration,
  formatDistance,
  formatPace,
} from '../../../src/utils/cardio';
import type { CardioSession } from '../../../src/types/cardio';

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Run',
  cycle: 'Cycle',
  walk: 'Walk',
  swim: 'Swim',
};

export default function SessionSummaryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { settings } = useCardioSettings();
  const unit = settings.distanceUnit;

  const [session, setSession] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getSessionById(sessionId);
      if (result.error || !result.data) {
        setLoadError(true);
      } else {
        setSession(result.data);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.cardio} />
      </View>
    );
  }

  if (loadError || !session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Could not load session data.
        </Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: Colors.cardio }]}
          onPress={() => router.replace('/(tabs)/cardio')}
        >
          <Text style={styles.doneBtnText}>Back to Cardio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = session.startedAt.toDate().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.activityBadge, { backgroundColor: Colors.cardio + '1A' }]}>
          <Text style={[styles.activityLabel, { color: Colors.cardio }]}>
            {ACTIVITY_LABELS[session.activityType] ?? session.activityType}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
      </View>

      {/* Hero stat */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
          {formatDistance(session.distance, unit)}
        </Text>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Distance</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatRow label="Duration" value={formatDuration(session.duration)} colors={colors} />
        <StatRow label="Avg Pace" value={formatPace(session.averagePace, unit)} colors={colors} />
        <StatRow label="Calories" value={`${session.calories} kcal`} colors={colors} />
        <StatRow label="Elevation Gain" value={`${Math.round(session.elevationGain)} m`} colors={colors} />
        <StatRow label="Elevation Loss" value={`${Math.round(session.elevationLoss)} m`} colors={colors} />
        {session.activityType === 'swim' && session.lapCount != null && (
          <StatRow label="Laps" value={String(session.lapCount)} colors={colors} />
        )}
      </View>

      {/* Splits */}
      {session.splits.length > 0 && (
        <View style={[styles.splitsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.splitsTitle, { color: colors.textPrimary }]}>Splits</Text>
          <View style={[styles.splitHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.splitNum, { color: colors.textSecondary }]}>#</Text>
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Dist</Text>
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Time</Text>
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Pace</Text>
          </View>
          {session.splits.map((s) => (
            <View key={s.splitNumber} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.splitNum, { color: colors.textSecondary }]}>{s.splitNumber}</Text>
              <Text style={[styles.splitCell, { color: colors.textPrimary }]}>{formatDistance(s.distance, unit)}</Text>
              <Text style={[styles.splitCell, { color: colors.textPrimary }]}>{formatDuration(s.time)}</Text>
              <Text style={[styles.splitCell, { color: Colors.cardio }]}>{formatPace(s.pace, unit)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Map placeholder */}
      <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="map-outline" size={32} color={colors.textSecondary} />
        <Text style={[styles.mapPlaceholderText, { color: colors.textSecondary }]}>
          Route map coming soon
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: Colors.cardio }]}
        onPress={() => router.replace('/(tabs)/cardio')}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorText: { fontSize: 15, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 48, gap: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  activityBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  activityLabel: { fontWeight: '700', fontSize: 14 },
  dateText: { fontSize: 14 },

  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 28,
  },
  heroValue: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  heroLabel: { fontSize: 14, marginTop: 4 },

  statsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },

  splitsCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  splitsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  splitHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  splitRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  splitNum: { width: 28, fontSize: 13, fontWeight: '600' },
  splitCell: { flex: 1, fontSize: 13 },

  mapPlaceholder: {
    borderRadius: 14,
    borderWidth: 1,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapPlaceholderText: { fontSize: 13 },

  doneBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
