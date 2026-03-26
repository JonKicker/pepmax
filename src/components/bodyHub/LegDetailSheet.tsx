/**
 * Bottom sheet content for the Legs region in the cardio layer.
 *
 * Shows: weekly mileage, activity breakdown, gym leg sets count,
 * cross-module warning banner, and Start Cardio action button.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { LegData } from '../../types/bodyHub';

type Props = {
  data: LegData | null;
  onClose: () => void;
};

const CARDIO_COLOR = LAYER_COLORS.cardio;

const ACTIVITY_ICONS: Record<string, string> = {
  run: 'walk-outline',
  cycle: 'bicycle-outline',
  walk: 'footsteps-outline',
  swim: 'water-outline',
};

const ACTIVITY_LABELS: Record<string, string> = {
  run: 'Running',
  cycle: 'Cycling',
  walk: 'Walking',
  swim: 'Swimming',
};

export default function LegDetailSheet({ data, onClose }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleStartCardio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/cardio/start-session' as any);
  };

  if (!data) return null;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="walk-outline" size={20} color={CARDIO_COLOR} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Legs</Text>
        </View>
        <View style={[styles.mileageBadge, { backgroundColor: CARDIO_COLOR + '1A' }]}>
          <Text style={[styles.mileageValue, { color: CARDIO_COLOR }]}>
            {data.weeklyMileage.toFixed(1)}
          </Text>
          <Text style={[styles.mileageUnit, { color: CARDIO_COLOR }]}>mi this week</Text>
        </View>
      </View>

      {/* Cross-Module Warning Banner */}
      {data.crossModuleWarning && (
        <View style={[styles.warningBanner, { backgroundColor: '#F59E0B' + '1A', borderColor: '#F59E0B' }]}>
          <Ionicons name="warning-outline" size={16} color="#F59E0B" />
          <Text style={[styles.warningText, { color: '#F59E0B' }]}>
            High mileage + gym leg work — consider recovery
          </Text>
        </View>
      )}

      {/* Activity Breakdown */}
      {data.activityBreakdown.length > 0 && (
        <View style={styles.breakdownSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Activity Breakdown</Text>
          {data.activityBreakdown.map((item) => (
            <View key={item.type} style={styles.breakdownRow}>
              <Ionicons
                name={(ACTIVITY_ICONS[item.type] ?? 'fitness-outline') as any}
                size={14}
                color={CARDIO_COLOR}
              />
              <Text style={[styles.breakdownName, { color: colors.textPrimary }]}>
                {ACTIVITY_LABELS[item.type] ?? item.type}
              </Text>
              <Text style={[styles.breakdownMiles, { color: colors.textSecondary }]}>
                {item.miles.toFixed(1)} mi
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.gymLegSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gym leg sets</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.weeklyCalories > 0 ? data.weeklyCalories.toLocaleString() : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Calories burned</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {data.activityBreakdown.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Activity types</Text>
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
    marginBottom: 14,
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
  mileageBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mileageValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  mileageUnit: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Activity Breakdown
  breakdownSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  breakdownName: {
    flex: 1,
    fontSize: 14,
  },
  breakdownMiles: {
    fontSize: 14,
    fontWeight: '600',
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
