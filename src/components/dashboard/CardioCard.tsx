/**
 * CardioCard — most recent cardio session summary.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { CardioSession } from '../../types/cardio';

type Props = {
  sessions: CardioSession[];
  colors: Theme['colors'];
  error: boolean;
  units: 'imperial' | 'metric';
  onPress: () => void;
};

const ACTIVITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk-outline',
  cycle: 'bicycle-outline',
  walk: 'footsteps-outline',
  swim: 'water-outline',
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDistance(meters: number, units: 'imperial' | 'metric'): string {
  if (units === 'imperial') {
    return `${(meters / 1609.344).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function getRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CardioCard({ sessions, colors, error, units, onPress }: Props) {
  const recent = sessions.length > 0 ? sessions[0] : null;

  return (
    <DashboardCard
      title="Cardio"
      icon="heart-outline"
      iconColor={Colors.cardio}
      onPress={onPress}
      colors={colors}
    >
      {error ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Could not load cardio data.</Text>
      ) : !recent ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>No cardio sessions yet.</Text>
      ) : (
        <View style={styles.row}>
          <Ionicons
            name={ACTIVITY_ICONS[recent.activityType] ?? 'fitness-outline'}
            size={24}
            color={Colors.cardio}
            style={styles.icon}
          />
          <View style={styles.details}>
            <Text style={[styles.type, { color: colors.textPrimary }]}>
              {recent.activityType.charAt(0).toUpperCase() + recent.activityType.slice(1)}
            </Text>
            <Text style={[styles.stats, { color: colors.textSecondary }]}>
              {formatDistance(recent.distance, units)} · {formatDuration(recent.duration)} · {getRelativeTime(
                recent.startedAt?.toDate ? recent.startedAt.toDate() : new Date(),
              )}
            </Text>
          </View>
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 28 },
  details: { flex: 1 },
  type: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  stats: { fontSize: 13 },
});
