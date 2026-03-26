/**
 * Bottom sheet content for a tapped muscle region.
 *
 * Score mode (when zoneScore is available):
 *   - ScoreGauge (100px) with "X% Recovered" semantic label
 *   - SubScoreBar for each zone in the breakdown
 *   - Existing stats (weekly sets, volume, exercises) below
 *
 * Recency mode (zoneScore is null): renders exactly as before.
 *
 * Ray's note #3: The color meaning changed (green = recovered, not recently trained).
 * "X% Recovered" label makes this unambiguous.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { ScoreGauge } from '../recovery/ScoreGauge';
import { SubScoreBar } from '../recovery/SubScoreBar';
import { LAYER_COLORS } from '../../types/bodyHub';
import type { MuscleStats } from '../../utils/muscleMapping';

// ─── Types ───────────────────────────────────────────────────────────────────

type ZoneBreakdownItem = {
  zone: string;
  label: string;
  score: number;
};

type Props = {
  stats: MuscleStats | null;
  onClose: () => void;
  /** Averaged recovery score (0–100) for this muscle region. null = recency mode. */
  zoneScore?: number | null;
  /** Individual zone scores for sub-score bars. null = recency mode. */
  zoneBreakdown?: ZoneBreakdownItem[] | null;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MuscleDetailSheet({
  stats,
  onClose,
  zoneScore = null,
  zoneBreakdown = null,
}: Props) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const volumeUnit = userProfile?.units === 'metric' ? 'kg' : 'lbs';
  const hasScoreData = zoneScore !== null;

  if (!stats) return null;

  const daysSinceText = (() => {
    if (stats.daysSinceTraining === null) return 'Never trained';
    if (stats.daysSinceTraining === 0) return 'Today';
    if (stats.daysSinceTraining === 1) return 'Yesterday';
    return `${stats.daysSinceTraining} days ago`;
  })();

  const lastTrainedDate = stats.lastTrained
    ? stats.lastTrained.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const handleTrain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/training' as any);
  };

  const layerColor = LAYER_COLORS.muscles;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.muscleName, { color: colors.textPrimary }]}>{stats.muscle}</Text>
        {/* Score mode: no recency badge (color semantics changed) */}
        {!hasScoreData && (
          <View style={[styles.badge, { backgroundColor: layerColor + '1A' }]}>
            <Text style={[styles.badgeText, { color: layerColor }]}>{daysSinceText}</Text>
          </View>
        )}
      </View>

      {/* Score Mode — ScoreGauge + semantic label + zone breakdown */}
      {hasScoreData && (
        <View style={styles.scoreSection}>
          <ScoreGauge
            score={zoneScore!}
            size={100}
            strokeWidth={9}
            colors={colors}
            showLabel={false}
          />
          {/* Semantic label — makes "green = recovered" unambiguous (Ray note #3) */}
          <Text style={[styles.recoveredLabel, { color: colors.textPrimary }]}>
            {Math.round(zoneScore!)}% Recovered
          </Text>
          {/* Last trained shown in score mode below the gauge label */}
          {stats.daysSinceTraining !== null && (
            <Text style={[styles.lastTrainedSubtext, { color: colors.textSecondary }]}>
              Last trained {daysSinceText}
            </Text>
          )}

          {/* Zone breakdown sub-score bars */}
          {zoneBreakdown && zoneBreakdown.length > 0 && (
            <View style={styles.zoneBreakdown}>
              {zoneBreakdown.map((item) => (
                <SubScoreBar
                  key={item.zone}
                  label={item.label}
                  score={item.score}
                  available
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Stats — visible in both modes */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.weeklySets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sets this week</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.weeklyVolume > 0 ? `${Math.round(stats.weeklyVolume).toLocaleString()}` : '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Volume ({volumeUnit})</Text>
        </View>
        {lastTrainedDate && !hasScoreData && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{lastTrainedDate}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Last trained</Text>
            </View>
          </>
        )}
      </View>

      {/* Top Exercises */}
      {stats.topExercises.length > 0 && (
        <View style={styles.exerciseSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Top Exercises</Text>
          {stats.topExercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text style={[styles.exerciseName, { color: colors.textPrimary }]} numberOfLines={1}>
                {ex.name}
              </Text>
              <Text style={[styles.exerciseWeight, { color: colors.textSecondary }]}>
                {ex.bestWeight} {ex.weightUnit}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: layerColor }]}
        onPress={handleTrain}
        activeOpacity={0.7}
      >
        <Ionicons name="barbell-outline" size={18} color="#FFFFFF" />
        <Text style={styles.actionBtnText}>Train This Muscle</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  muscleName: {
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Score mode
  scoreSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recoveredLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  lastTrainedSubtext: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  zoneBreakdown: {
    width: '100%',
    marginTop: 8,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    height: 28,
  },

  // Exercises
  exerciseSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  exerciseName: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  exerciseWeight: {
    fontSize: 14,
    fontWeight: '500',
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
