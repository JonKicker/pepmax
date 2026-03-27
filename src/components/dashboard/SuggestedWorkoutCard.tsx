/**
 * SuggestedWorkoutCard — dashboard card showing AI-adaptive workout suggestion.
 *
 * Features:
 * - Zone-colored accent bar on left side (green/yellow/orange)
 * - Header: sparkle icon + "Suggested Workout" + intensity badge
 * - Rationale text (1-2 lines)
 * - Muscle group chips (colored pills)
 * - Exercise preview list (first 3-4 exercises: name + sets x reps)
 * - Estimated duration
 * - "Start Workout" button → navigates to /(tabs)/training
 * - Fires SUGGESTION_VIEWED analytics on mount
 * - Shows skeleton placeholder while loading
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../GlassCard';
import { SkeletonCard, SkeletonLoader } from '../SkeletonLoader';
import { analytics, AnalyticsEvent } from '../../services/analytics';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';
import type { SuggestedWorkout, SuggestionIntensity } from '../../types/workoutSuggestion';

type Props = {
  suggestion: SuggestedWorkout | null;
  loading: boolean;
  onStartWorkout: (templateId?: string) => void;
  colors: Theme['colors'];
};

// Zone colors use Colors constants — no hardcoded hex.
// 'heavy' maps to success (green), 'moderate' to gold (yellow),
// 'light' to warning (orange), 'rest' to error (red).
// success is mode-aware, so it lives on the colors prop; the rest are shared.
function getZoneColor(intensity: SuggestionIntensity, colors: Theme['colors']): string {
  switch (intensity) {
    case 'heavy':   return colors.success;
    case 'moderate': return Colors.gold;
    case 'light':   return Colors.warning;
    case 'rest':    return Colors.error;
  }
}

const INTENSITY_LABELS: Record<SuggestionIntensity, string> = {
  heavy: 'Heavy',
  moderate: 'Moderate',
  light: 'Light',
  rest: 'Rest',
};

// Muscle chip colors use Colors module constants — no hardcoded hex.
const MUSCLE_CHIP_COLORS = [
  Colors.peptide,    // #2E86C1
  Colors.nutrition,  // #27AE60
  Colors.gym,        // #8E44AD
  Colors.cardio,     // #E74C3C
  Colors.gold,       // #FFD700
  Colors.body,       // #00897B
  Colors.accent,     // #2E86C1
  Colors.primary,    // #1B4F72
];

export function SuggestedWorkoutCard({ suggestion, loading, onStartWorkout, colors }: Props) {
  useEffect(() => {
    if (suggestion) {
      analytics.track(AnalyticsEvent.SUGGESTION_VIEWED, {
        source: suggestion.source,
        intensity: suggestion.intensity,
        templateId: suggestion.templateId ?? '',
      });
    }
  }, [suggestion?.templateId, suggestion?.intensity]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.skeletonHeader}>
          <SkeletonLoader width={16} height={16} borderRadius={8} />
          <SkeletonLoader width={140} height={14} />
          <SkeletonLoader width={64} height={20} borderRadius={10} />
        </View>
        <SkeletonLoader width="90%" height={12} style={styles.skeletonBar} />
        <SkeletonLoader width="70%" height={12} style={styles.skeletonBar} />
        <View style={styles.skeletonChips}>
          <SkeletonLoader width={56} height={24} borderRadius={8} />
          <SkeletonLoader width={64} height={24} borderRadius={8} />
          <SkeletonLoader width={48} height={24} borderRadius={8} />
        </View>
        <SkeletonLoader width="100%" height={12} style={styles.skeletonBar} />
        <SkeletonLoader width="100%" height={12} style={styles.skeletonBar} />
        <SkeletonLoader width="80%" height={12} style={styles.skeletonBar} />
      </View>
    );
  }

  if (!suggestion) return null;

  const accentColor = getZoneColor(suggestion.intensity, colors);
  const intensityLabel = INTENSITY_LABELS[suggestion.intensity];
  const previewExercises = suggestion.exercises.slice(0, 4);

  return (
    <GlassCard intensity="heavy" style={styles.card} padding={0}>
      <View style={styles.inner}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Ionicons name="sparkles" size={16} color={accentColor} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Suggested Workout
            </Text>
            <View style={[styles.intensityBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
              <Text style={[styles.intensityBadgeText, { color: accentColor }]}>
                {intensityLabel}
              </Text>
            </View>
          </View>

          {/* Template name if from template */}
          {suggestion.templateName ? (
            <Text style={[styles.templateName, { color: colors.textSecondary }]} numberOfLines={1}>
              Based on: {suggestion.templateName}
            </Text>
          ) : null}

          {/* Rationale */}
          <Text
            style={[styles.rationale, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {suggestion.rationale}
          </Text>

          {/* Muscle chips */}
          {suggestion.targetMuscles.length > 0 && (
            <View style={styles.chipsRow}>
              {suggestion.targetMuscles.slice(0, 4).map((muscle, i) => (
                <View
                  key={muscle}
                  style={[
                    styles.chip,
                    { backgroundColor: MUSCLE_CHIP_COLORS[i % MUSCLE_CHIP_COLORS.length] + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: MUSCLE_CHIP_COLORS[i % MUSCLE_CHIP_COLORS.length] },
                    ]}
                  >
                    {muscle}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Exercise preview list */}
          <View style={styles.exerciseList}>
            {previewExercises.map((exercise, i) => (
              <View key={exercise.exerciseId + i} style={styles.exerciseRow}>
                <View style={[styles.exerciseDot, { backgroundColor: accentColor }]} />
                <Text
                  style={[styles.exerciseName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {exercise.exerciseName}
                </Text>
                <Text style={[styles.exerciseSets, { color: colors.textSecondary }]}>
                  {exercise.targetSets} × {exercise.targetReps}
                </Text>
              </View>
            ))}
            {suggestion.exercises.length > 4 && (
              <Text style={[styles.moreExercises, { color: colors.textSecondary }]}>
                +{suggestion.exercises.length - 4} more exercises
              </Text>
            )}
          </View>

          {/* Footer: duration + start button */}
          <View style={styles.footer}>
            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                ~{suggestion.estimatedMinutes} min
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: Colors.gym }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                analytics.track(AnalyticsEvent.SUGGESTION_STARTED, {
                  source: suggestion.source,
                  intensity: suggestion.intensity,
                  templateId: suggestion.templateId ?? '',
                });
                onStartWorkout(suggestion.templateId);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start suggested workout"
            >
              <Ionicons name="play" size={12} color={colors.textPrimary} />
              <Text style={[styles.startButtonText, { color: colors.textPrimary }]}>Start Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  intensityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  templateName: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  rationale: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 5,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  exerciseName: {
    fontSize: 13,
    flex: 1,
  },
  exerciseSets: {
    fontSize: 12,
  },
  moreExercises: {
    fontSize: 12,
    marginLeft: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  startButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Skeleton styles
  skeletonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  skeletonBar: {
    marginBottom: 0,
  },
  skeletonChips: {
    flexDirection: 'row',
    gap: 8,
  },
});
