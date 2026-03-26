/**
 * Segment detail screen — shows a segment's map, stats, and leaderboard.
 *
 * Route param: segmentId (string)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getSegmentById } from '../../../src/services/segmentService';
import SegmentLeaderboard from '../../../src/components/cardio/SegmentLeaderboard';
import type { RouteSegment, SegmentActivityType } from '../../../src/types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

const ACTIVITY_LABELS: Record<SegmentActivityType, string> = {
  run: 'Run',
  cycle: 'Cycle',
  walk: 'Walk',
};

const ACTIVITY_ICONS: Record<SegmentActivityType, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk',
  cycle: 'bicycle',
  walk: 'footsteps',
};

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

export default function SegmentDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { segmentId } = useLocalSearchParams<{ segmentId: string }>();

  const [segment, setSegment] = useState<RouteSegment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getSegmentById(segmentId);
      if (result.error || !result.data) {
        setLoadError(true);
      } else {
        setSegment(result.data);
      }
      setLoading(false);
    })();
  }, [segmentId]);

  const region = useMemo(() => {
    if (!segment || segment.route.length === 0) return undefined;
    const lats = segment.route.map((p) => p.latitude);
    const lngs = segment.route.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.003) * 1.4,
      longitudeDelta: Math.max(maxLng - minLng, 0.003) * 1.4,
    };
  }, [segment]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.cardio} />
      </View>
    );
  }

  if (loadError || !segment) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Could not load segment.
        </Text>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: Colors.cardio }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const polylineCoords = segment.route.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const createdDate = segment.createdAt instanceof Date
    ? segment.createdAt
    : (segment.createdAt as any)?.toDate?.() ?? new Date();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.activityBadge, { backgroundColor: Colors.cardio + '1A' }]}>
          <Ionicons name={ACTIVITY_ICONS[segment.activityType]} size={14} color={Colors.cardio} />
          <Text style={[styles.activityLabel, { color: Colors.cardio }]}>
            {ACTIVITY_LABELS[segment.activityType]}
          </Text>
        </View>
        {segment.visibility === 'private' && (
          <View style={[styles.privateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.privateChipText, { color: colors.textSecondary }]}>Private</Text>
          </View>
        )}
      </View>

      {/* Map */}
      {region && (
        <MapView style={styles.map} region={region}>
          <Polyline
            coordinates={polylineCoords}
            strokeColor={Colors.cardio}
            strokeWidth={4}
          />
          <Marker
            coordinate={{ latitude: segment.startPoint.latitude, longitude: segment.startPoint.longitude }}
            pinColor={Colors.cardio}
          />
          <Marker
            coordinate={{ latitude: segment.endPoint.latitude, longitude: segment.endPoint.longitude }}
            pinColor="#27AE60"
          />
        </MapView>
      )}

      {/* Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatRow label="Distance" value={formatDistance(segment.distanceMeters)} colors={colors} />
        <StatRow label="Activity" value={ACTIVITY_LABELS[segment.activityType]} colors={colors} />
        <StatRow label="Creator" value={segment.creatorUsername} colors={colors} />
        <StatRow
          label="Created"
          value={createdDate.toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          colors={colors}
        />
        {segment.bestEffortUsername && segment.bestEffortSeconds !== null && (
          <StatRow
            label="Course Record"
            value={`${segment.bestEffortUsername} — ${Math.floor(segment.bestEffortSeconds / 60)}:${String(segment.bestEffortSeconds % 60).padStart(2, '0')}`}
            colors={colors}
          />
        )}
      </View>

      {/* Leaderboard */}
      <View style={[styles.leaderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.leaderTitle, { color: colors.textPrimary }]}>Leaderboard</Text>
        <SegmentLeaderboard
          segmentId={segment.id}
          distanceMeters={segment.distanceMeters}
        />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activityLabel: { fontSize: 13, fontWeight: '700' },
  privateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  privateChipText: { fontSize: 12 },
  map: { width: '100%', height: 240, borderRadius: 14, overflow: 'hidden' },
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
  leaderCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  leaderTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
});
