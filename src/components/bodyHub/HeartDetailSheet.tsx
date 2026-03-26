/**
 * Bottom sheet content for the Heart organ in the cardio layer.
 *
 * Shows: resting BPM, HR zone bar, last session summary, VO2max placeholder.
 * Handles empty hrZones with a "No HR data" state (Ray note #1).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { HeartData } from '../../types/bodyHub';

type Props = {
  data: HeartData | null;
  onClose: () => void;
};

const CARDIO_COLOR = LAYER_COLORS.cardio;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs > 0) return `${hrs}h ${remainingMins}m`;
  return `${mins}m`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export default function HeartDetailSheet({ data, onClose }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleStartCardio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/cardio/start-session' as any);
  };

  if (!data) return null;

  const totalZoneMinutes = data.hrZones.reduce((sum, z) => sum + z.minutes, 0);

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart" size={20} color={CARDIO_COLOR} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Heart</Text>
        </View>
        {data.restingBpm !== null && (
          <View style={[styles.bpmBadge, { backgroundColor: CARDIO_COLOR + '1A' }]}>
            <Text style={[styles.bpmValue, { color: CARDIO_COLOR }]}>{data.restingBpm}</Text>
            <Text style={[styles.bpmUnit, { color: CARDIO_COLOR }]}>bpm resting</Text>
          </View>
        )}
      </View>

      {/* HR Zone Bar */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HR Zones (this month)</Text>

      {data.hrZones.length === 0 ? (
        // Ray note #1: show "No HR data" when hrZones is empty
        <View style={[styles.noDataBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="pulse-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No HR data</Text>
          <Text style={[styles.noDataSubtext, { color: colors.textSecondary }]}>
            Use a heart rate monitor during cardio sessions to see zone data.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.zoneBar}>
            {data.hrZones.map((zone) => {
              const pct = totalZoneMinutes > 0 ? zone.minutes / totalZoneMinutes : 0;
              if (pct <= 0) return null;
              return (
                <View
                  key={zone.zone}
                  style={[styles.zoneSegment, { flex: pct, backgroundColor: zone.color }]}
                />
              );
            })}
          </View>
          <View style={styles.zoneLegend}>
            {data.hrZones.map((zone) => (
              <View key={zone.zone} style={styles.zoneLegendItem}>
                <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                <Text style={[styles.zoneLabel, { color: colors.textSecondary }]}>
                  Z{zone.zone} {zone.minutes}m
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Stats Row: Last Session + VO2max */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.lastSession ? formatDuration(data.lastSession.duration) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last session</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.lastSession ? formatDistance(data.lastSession.distance) : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textSecondary }]}>—</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VO2max</Text>
          <Text style={[styles.comingSoon, { color: CARDIO_COLOR }]}>Coming soon</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: CARDIO_COLOR }]}
        onPress={handleStartCardio}
        activeOpacity={0.7}
      >
        <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
        <Text style={styles.actionBtnText}>Start Cardio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  bpmBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bpmValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  bpmUnit: {
    fontSize: 12,
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Zone bar
  zoneBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  zoneSegment: {
    height: '100%',
  },
  zoneLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  zoneLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneLabel: {
    fontSize: 11,
  },

  // No HR data state
  noDataBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  comingSoon: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  // Action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
