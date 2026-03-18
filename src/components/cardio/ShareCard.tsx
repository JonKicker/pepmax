import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import {
  formatDistance,
  formatDuration,
  formatPace,
} from '../../utils/cardio';
import type { CardioSession, DistanceUnit } from '../../types/cardio';

// ─── Constants ────────────────────────────────────────────────────────────────

export type ShareFormat = 'story' | 'feed';

export const SHARE_CARD_DIMS: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  feed: { width: 360, height: 360 },
};

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Run', cycle: 'Cycle', walk: 'Walk', swim: 'Swim',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTIVITY_ICONS: Record<string, any> = {
  run: 'walk-outline',
  cycle: 'bicycle-outline',
  walk: 'footsteps-outline',
  swim: 'water-outline',
};

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type Props = {
  session: CardioSession;
  unit: DistanceUnit;
  format: ShareFormat;
};

/**
 * Off-screen card used as the capture target for react-native-view-shot.
 * Intentionally does NOT include a MapView — captureRef + MapView is unreliable
 * in managed Expo environments.
 */
const ShareCard = forwardRef<View, Props>(({ session, unit, format }, ref) => {
  const { width, height } = SHARE_CARD_DIMS[format];
  const isStory = format === 'story';

  const date = session.startedAt.toDate().toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const activityLabel = ACTIVITY_LABELS[session.activityType] ?? session.activityType;
  const iconName = ACTIVITY_ICONS[session.activityType] ?? 'fitness-outline';

  return (
    <View ref={ref} style={[styles.card, { width, height }]}>
      {/* Decorative accent circle */}
      <View style={styles.bgAccent} />

      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.activityBadge}>
          <Ionicons name={iconName} size={13} color={Colors.cardio} />
          <Text style={styles.activityLabel}>{activityLabel}</Text>
        </View>
        <Text style={styles.dateText}>{date}</Text>
      </View>

      {/* Hero stat — distance */}
      <View style={[styles.heroSection, isStory && styles.heroSectionStory]}>
        <Text style={styles.heroValue}>{formatDistance(session.distance, unit)}</Text>
        <Text style={styles.heroLabel}>Total Distance</Text>
      </View>

      {/* Supporting stats grid */}
      <View style={styles.statsGrid}>
        <StatPill label="Duration" value={formatDuration(session.duration)} />
        <StatPill label="Avg Pace" value={formatPace(session.averagePace, unit)} />
        <StatPill label="Calories" value={`${session.calories} kcal`} />
        <StatPill label="Elev. Gain" value={`${Math.round(session.elevationGain)} m`} />
        {session.avgHeartRate != null && (
          <StatPill label="Avg HR" value={`${session.avgHeartRate} bpm`} />
        )}
      </View>

      {/* PepMax watermark */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>PEPMAX</Text>
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    padding: 28,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: Colors.cardio,
    opacity: 0.13,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardio + '22',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activityLabel: { color: Colors.cardio, fontWeight: '700', fontSize: 13 },
  dateText: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },

  heroSection: { alignItems: 'flex-start', marginVertical: 16 },
  heroSectionStory: { marginVertical: 52 },
  heroValue: { fontSize: 54, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: '44%',
    flex: 1,
  },
  pillValue: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  pillLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },

  watermark: { alignItems: 'flex-end', marginTop: 14 },
  watermarkText: {
    color: Colors.cardio,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
    opacity: 0.8,
  },
});
