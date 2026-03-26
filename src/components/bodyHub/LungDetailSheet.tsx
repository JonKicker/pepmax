/**
 * Bottom sheet content for the Lungs organ in the cardio layer.
 *
 * Shows: weekly cardio minutes with delta vs last week, weekly distance,
 * effort score as percentage, and a Start Cardio action button.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { LungData } from '../../types/bodyHub';

type Props = {
  data: LungData | null;
  onClose: () => void;
};

const CARDIO_COLOR = LAYER_COLORS.cardio;

export default function LungDetailSheet({ data, onClose }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleStartCardio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/cardio/start-session' as any);
  };

  if (!data) return null;

  const minutesDelta = data.weeklyCardioMinutes - data.lastWeekMinutes;
  const deltaPositive = minutesDelta >= 0;
  const deltaText = `${deltaPositive ? '+' : ''}${minutesDelta} min vs last week`;

  const effortPct =
    data.effortScore !== null ? `${data.effortScore}%` : '—';

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="fitness-outline" size={20} color={CARDIO_COLOR} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Lungs</Text>
        </View>
      </View>

      {/* Big weekly minutes number */}
      <View style={styles.bigStatRow}>
        <Text style={[styles.bigNumber, { color: colors.textPrimary }]}>
          {data.weeklyCardioMinutes}
        </Text>
        <Text style={[styles.bigUnit, { color: colors.textSecondary }]}>min this week</Text>
      </View>

      {/* Delta vs last week */}
      <View style={styles.deltaRow}>
        <Ionicons
          name={deltaPositive ? 'trending-up-outline' : 'trending-down-outline'}
          size={14}
          color={deltaPositive ? '#22C55E' : '#F87171'}
        />
        <Text
          style={[
            styles.deltaText,
            { color: deltaPositive ? '#22C55E' : '#F87171' },
          ]}
        >
          {deltaText}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.weeklyDistance.toFixed(1)} mi
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{effortPct}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Effort score</Text>
          <Text style={[styles.effortSub, { color: colors.textSecondary }]}>vs WHO 150 min/wk</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.lastWeekMinutes}m
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last week</Text>
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
    marginBottom: 12,
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

  bigStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  bigUnit: {
    fontSize: 14,
    fontWeight: '500',
  },

  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '600',
  },

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
  effortSub: {
    fontSize: 9,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

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
