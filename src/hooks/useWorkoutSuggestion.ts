/**
 * useWorkoutSuggestion — computes an AI-adaptive workout suggestion
 * given the user's recovery zone + score, muscle stats, and equipment profile.
 *
 * Uses:
 *  - useBodyHubMuscles for per-muscle training recency
 *  - useEquipmentProfiles for active equipment profile
 *  - useEffect + useState to fetch templates (async — cannot use useMemo)
 *  - useMemo to derive suggestion once all data is ready
 */
import { useState, useEffect, useMemo } from 'react';
import { useBodyHubMuscles } from './useBodyHubMuscles';
import { useEquipmentProfiles } from './useEquipmentProfiles';
import { getTemplates } from '../services/templateService';
import { getAllExercises } from '../services/exerciseService';
import { exerciseLibrary as staticLibrary } from '../data/exerciseLibrary';
import { generateSuggestion, buildExerciseEquipmentSet } from '../utils/workoutSuggestion';
import type { RecoveryZone } from '../types/recoveryScore';
import type { SuggestedWorkout } from '../types/workoutSuggestion';
import type { WorkoutTemplate } from '../types/template';

export function useWorkoutSuggestion(
  recoveryZone: RecoveryZone | null,
  recoveryScore: number | null,
): { suggestion: SuggestedWorkout | null; isLoading: boolean; error: string | null } {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Muscle stats from Body Hub
  const bodyHub = useBodyHubMuscles('front', true, 'recency');

  // Active equipment profile
  const equipmentProfiles = useEquipmentProfiles();

  // Fetch templates on mount (async — must use useEffect, not useMemo)
  useEffect(() => {
    let cancelled = false;

    async function fetchTemplates() {
      const result = await getTemplates();
      if (cancelled) return;
      if (result.error) {
        setError(result.error.message);
      } else {
        setTemplates(result.data ?? []);
      }
      setTemplatesLoaded(true);
    }

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load equipment profiles on mount
  useEffect(() => {
    equipmentProfiles.loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    bodyHub.loading ||
    equipmentProfiles.isLoading ||
    !templatesLoaded;

  // Derive suggestion with useMemo once all data is ready
  const suggestion = useMemo<SuggestedWorkout | null>(() => {
    if (isLoading) return null;
    if (!recoveryZone || recoveryScore === null) return null;

    const muscleStats = bodyHub.muscleStats;
    if (muscleStats.size === 0) return null;

    // Map profile equipment to exercise-layer equipment strings
    const profileEquipment = equipmentProfiles.activeProfile?.equipment ?? [];
    const equipmentSet = buildExerciseEquipmentSet(profileEquipment);
    const availableEquipment = Array.from(equipmentSet);

    // Use static library + any custom exercises (getAllExercises needs custom array)
    const exerciseLibrary = getAllExercises([]);

    try {
      return generateSuggestion({
        muscleStats,
        recoveryZone,
        recoveryScore,
        availableEquipment,
        templates,
        exerciseLibrary,
      });
    } catch {
      return null;
    }
  }, [
    isLoading,
    recoveryZone,
    recoveryScore,
    bodyHub.muscleStats,
    equipmentProfiles.activeProfile,
    templates,
  ]);

  return { suggestion, isLoading, error };
}
