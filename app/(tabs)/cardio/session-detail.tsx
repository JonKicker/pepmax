import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getSessionById, deleteCardioSession } from '../../../src/services/cardioService';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import {
  formatDuration,
  formatDistance,
  formatPace,
  isGoalMet,
} from '../../../src/utils/cardio';
import RouteMap from '../../../src/components/cardio/RouteMap';
import HeartRateChart from '../../../src/components/cardio/HeartRateChart';
import TimeInZones from '../../../src/components/cardio/TimeInZones';
import ShareModal from '../../../src/components/cardio/ShareModal';
import SegmentCreator from '../../../src/components/cardio/SegmentCreator';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { useHeartRateZones } from '../../../src/hooks/useHeartRateZones';
import { getTrainingEffect } from '../../../src/utils/cardio';
import type { CardioSession, Split } from '../../../src/types/cardio';
import type { RouteSegment } from '../../../src/types/segments';

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── Split row ────────────────────────────────────────────────────────────────

function SplitRowView({
  split,
  isFastest,
  isSlowest,
  unit,
  colors,
}: {
  split: Split;
  isFastest: boolean;
  isSlowest: boolean;
  unit: 'mi' | 'km';
  colors: any;
}) {
  const bg = isFastest
    ? Colors.nutrition + '1A'
    : isSlowest
    ? Colors.cardio + '1A'
    : 'transparent';
  const accent = isFastest ? Colors.nutrition : isSlowest ? Colors.cardio : colors.textPrimary;

  return (
    <View style={[styles.splitRow, { backgroundColor: bg, borderBottomColor: colors.border }]}>
      <Text style={[styles.splitNum, { color: colors.textSecondary }]}>{split.splitNumber}</Text>
      <Text style={[styles.splitCell, { color: accent }]}>{formatPace(split.pace, unit)}</Text>
      <Text style={[styles.splitCell, { color: colors.textPrimary }]}>{formatDuration(split.time)}</Text>
      <Text style={[styles.splitCell, { color: colors.textSecondary }]}>
        {split.elevationChange >= 0 ? '+' : ''}{Math.round(split.elevationChange)} m
      </Text>
    </View>
  );
}

// ─── Activity labels ──────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Run', cycle: 'Cycle', walk: 'Walk', swim: 'Swim',
};

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { settings } = useCardioSettings();
  const unit = settings.distanceUnit;

  const [session, setSession] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [segmentCreatorVisible, setSegmentCreatorVisible] = useState(false);

  // Must be called unconditionally (Rules of Hooks) — zones only used when session is loaded
  const maxHR = settings.maxHeartRate ?? 180;
  const { zones } = useHeartRateZones(maxHR);

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

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'This session and its data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const result = await deleteCardioSession(sessionId);
            setDeleting(false);
            if (result.error) {
              Alert.alert('Error', 'Could not delete session. Please try again.');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleRepeat = () => {
    if (!session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(tabs)/cardio/start-session',
      params: {
        activityType: session.activityType,
      },
    });
  };

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.cardio} />
        </View>
      </GlassBackground>
    );
  }

  if (loadError || !session) {
    return (
      <GlassBackground>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Could not load session data.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.cardio }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.actionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </GlassBackground>
    );
  }

  const date = session.startedAt.toDate().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Find fastest / slowest splits
  let fastestIdx = -1;
  let slowestIdx = -1;
  if (session.splits.length > 1) {
    let minPace = Infinity;
    let maxPace = 0;
    session.splits.forEach((s, i) => {
      if (s.pace > 0 && s.pace < minPace) { minPace = s.pace; fastestIdx = i; }
      if (s.pace > maxPace) { maxPace = s.pace; slowestIdx = i; }
    });
  }

  // Best pace = fastest split
  const bestPace = fastestIdx >= 0 ? session.splits[fastestIdx].pace : null;

  const goalMet = isGoalMet(session);

  return (
    <GlassBackground>
    <ScrollView
      style={styles.container}
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

      {/* Goal badge */}
      {session.goals && session.goals.type !== 'none' && (
        <View style={[styles.goalBadge, { backgroundColor: goalMet ? Colors.nutrition + '1A' : colors.surface, borderColor: goalMet ? Colors.nutrition : colors.border }]}>
          <Ionicons name={goalMet ? 'checkmark-circle' : 'close-circle'} size={16} color={goalMet ? Colors.nutrition : colors.textSecondary} />
          <Text style={[styles.goalText, { color: goalMet ? Colors.nutrition : colors.textSecondary }]}>
            {goalMet ? 'Goal achieved!' : 'Goal not met'}
          </Text>
        </View>
      )}

      {/* Route map */}
      <RouteMap
        route={session.route}
        averagePace={session.averagePace}
        interactive
        distanceUnit={unit}
        style={styles.map}
      />

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatRow label="Distance" value={formatDistance(session.distance, unit)} colors={colors} />
        <StatRow label="Duration" value={formatDuration(session.duration)} colors={colors} />
        <StatRow label="Avg Pace" value={formatPace(session.averagePace, unit)} colors={colors} />
        {bestPace && (
          <StatRow label="Best Pace" value={formatPace(bestPace, unit)} colors={colors} />
        )}
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
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Pace</Text>
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Time</Text>
            <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Elev</Text>
          </View>
          {session.splits.map((s, i) => (
            <SplitRowView
              key={s.splitNumber}
              split={s}
              isFastest={i === fastestIdx}
              isSlowest={i === slowestIdx}
              unit={unit}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Heart Rate section — only shown when HR data is present */}
      {(session.heartRateData && session.heartRateData.length > 0) && (
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.hrHeader}>
            <Text style={[styles.splitsTitle, { color: colors.textPrimary }]}>Heart Rate</Text>
            {session.timeInZones && (
              <Text style={[styles.trainingEffect, { color: Colors.cardio }]}>
                {getTrainingEffect(session.timeInZones)}
              </Text>
            )}
          </View>
          {session.avgHeartRate != null && (
            <StatRow label="Avg Heart Rate" value={`${session.avgHeartRate} bpm`} colors={colors} />
          )}
          {session.maxHeartRate != null && (
            <StatRow label="Max Heart Rate" value={`${session.maxHeartRate} bpm`} colors={colors} />
          )}
          <View style={styles.hrChartWrap}>
            <HeartRateChart
              hrData={session.heartRateData}
              zones={zones}
              maxHR={maxHR}
              colors={colors}
            />
          </View>
          {session.timeInZones && session.timeInZones.length > 0 && (
            <View style={styles.timeInZonesWrap}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Time in Zones</Text>
              <TimeInZones timeInZones={session.timeInZones} />
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {session.notes ? (
        <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.textPrimary }]}>{session.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.cardio }]}
          onPress={handleRepeat}
          accessibilityRole="button"
          accessibilityLabel="Repeat route"
        >
          <Ionicons name="repeat" size={16} color="white" />
          <Text style={styles.actionBtnText}>Repeat Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShareModalVisible(true); }}
          accessibilityRole="button"
          accessibilityLabel="Share session"
        >
          <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
          <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Save as Segment — outdoor sessions with GPS route only */}
      {!session.indoorMode &&
        session.route.length >= 2 &&
        ['run', 'cycle', 'walk'].includes(session.activityType) && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSegmentCreatorVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Save as segment"
          >
            <Ionicons name="flag-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Save as Segment</Text>
          </TouchableOpacity>
        )}

      {/* Share modal */}
      <ShareModal
        visible={shareModalVisible}
        session={session}
        unit={unit}
        onClose={() => setShareModalVisible(false)}
      />

      {/* Segment creator */}
      {segmentCreatorVisible && (
        <SegmentCreator
          session={session}
          onCreated={(_segment: RouteSegment) => {
            setSegmentCreatorVisible(false);
            Alert.alert('Segment Created', 'Your segment is live and ready for competition!');
          }}
          onCancel={() => setSegmentCreatorVisible(false)}
        />
      )}

      <TouchableOpacity
        style={[styles.deleteBtn, { borderColor: Colors.error }]}
        onPress={handleDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Delete session"
      >
        {deleting ? (
          <ActivityIndicator size="small" color={Colors.error} />
        ) : (
          <>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.deleteBtnText, { color: Colors.error }]}>Delete Session</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
    </GlassBackground>
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
  dateText: { fontSize: 13 },

  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  goalText: { fontSize: 13, fontWeight: '600' },

  map: { width: '100%', height: 250, borderRadius: 14 },

  statsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '600' },

  splitsCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  splitsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  splitHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  splitRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  splitNum: { width: 28, fontSize: 13, fontWeight: '600' },
  splitCell: { flex: 1, fontSize: 13 },

  hrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  trainingEffect: { fontSize: 13, fontWeight: '600' },
  hrChartWrap: { paddingTop: 8, paddingHorizontal: 8 },
  timeInZonesWrap: { padding: 16, gap: 8 },
  subLabel: { fontSize: 12, fontWeight: '600' },
  notesCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  notesLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  notesText: { fontSize: 14, lineHeight: 20 },

  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteBtnText: { fontWeight: '600', fontSize: 14 },
});
