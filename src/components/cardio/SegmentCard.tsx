/**
 * SegmentCard — card for the segments list screen.
 *
 * Shows name, distance, activity icon, leader info, and the user's best time.
 * Includes a small non-interactive MapView with the segment route as a Polyline.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { RouteSegment, SegmentActivityType } from '../../types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ACTIVITY_ICONS: Record<SegmentActivityType, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk',
  cycle: 'bicycle',
  walk: 'footsteps',
};

const ACTIVITY_LABELS: Record<SegmentActivityType, string> = {
  run: 'Run',
  cycle: 'Cycle',
  walk: 'Walk',
};

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  segment: RouteSegment;
  userBestTime?: number;
  onPress: () => void;
};

export default function SegmentCard({ segment, userBestTime, onPress }: Props) {
  const { colors } = useTheme();

  const region = useMemo(() => {
    if (segment.route.length === 0) return undefined;
    const lats = segment.route.map((p) => p.latitude);
    const lngs = segment.route.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max(maxLat - minLat, 0.002) * 1.4;
    const lngDelta = Math.max(maxLng - minLng, 0.002) * 1.4;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [segment.route]);

  const polylineCoords = segment.route.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Map preview */}
      {region && (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            region={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none"
          >
            <Polyline
              coordinates={polylineCoords}
              strokeColor={Colors.cardio}
              strokeWidth={3}
            />
            <Marker
              coordinate={{ latitude: segment.startPoint.latitude, longitude: segment.startPoint.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              pinColor={Colors.cardio}
            />
          </MapView>
        </View>
      )}

      {/* Info section */}
      <View style={styles.info}>
        {/* Name row */}
        <View style={styles.nameRow}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.cardio + '1A' }]}>
            <Ionicons name={ACTIVITY_ICONS[segment.activityType]} size={16} color={Colors.cardio} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {segment.name}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {ACTIVITY_LABELS[segment.activityType]} · {formatDistance(segment.distanceMeters)}
              {segment.visibility === 'private' ? ' · Private' : ''}
            </Text>
          </View>
        </View>

        {/* Leader row */}
        {segment.bestEffortUsername && segment.bestEffortSeconds !== null && (
          <View style={styles.leaderRow}>
            <Text style={[styles.leaderLabel, { color: colors.textSecondary }]}>{'👑 '}</Text>
            <Text style={[styles.leaderName, { color: colors.textPrimary }]}>
              {segment.bestEffortUsername}
            </Text>
            <Text style={[styles.leaderTime, { color: Colors.cardio }]}>
              {formatDuration(segment.bestEffortSeconds)}
            </Text>
          </View>
        )}

        {/* User's best time */}
        {userBestTime !== undefined && (
          <View style={styles.prRow}>
            <Ionicons name="ribbon-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.prText, { color: colors.textSecondary }]}>
              Your best: {formatDuration(userBestTime)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapWrap: {
    height: 130,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  info: { padding: 12, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 1 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderLabel: { fontSize: 12 },
  leaderName: { fontSize: 13, fontWeight: '600', flex: 1 },
  leaderTime: { fontSize: 13, fontWeight: '700' },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  prText: { fontSize: 12 },
});
