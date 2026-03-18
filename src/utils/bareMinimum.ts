import { exerciseLibrary } from '../data/exerciseLibrary';
import { findExerciseById } from '../services/exerciseService';
import type { TemplateExercise } from '../types/template';

// Bodyweight exercises that are functionally compound (multi-joint, high effort)
const COMPOUND_BODYWEIGHT_IDS = new Set([
  'static_pull_up',
  'static_chin_up',
  'static_chest_dip',
  'static_tricep_dip',
  'static_push_up',
  'static_diamond_push_up',
  'static_burpee',
]);

export type BareMinimumResult = {
  exercises: TemplateExercise[];
  removedExercises: TemplateExercise[];
  estimatedMinutes: number;
  originalEstimatedMinutes: number;
  volumePercentage: number;
};

function countSets(exercises: TemplateExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.targetSets, 0);
}

function estimateMinutes(exercises: TemplateExercise[]): number {
  return countSets(exercises) * 3;
}

function reduceSets(targetSets: number): number {
  if (targetSets >= 4) return targetSets - 1;
  if (targetSets === 3) return 2;
  return targetSets;
}

export function generateBareMinimum(
  templateExercises: TemplateExercise[],
  timeCap: number,
): BareMinimumResult {
  const originalSets = countSets(templateExercises);
  const originalEstimatedMinutes = estimateMinutes(templateExercises);

  // Step 1: classify
  const kept: TemplateExercise[] = [];
  const removed: TemplateExercise[] = [];

  for (const te of templateExercises) {
    const libExercise = findExerciseById(exerciseLibrary, te.exerciseId);
    const category = libExercise?.category ?? 'Compound';

    const isCompound = category === 'Compound';
    const isCompoundBodyweight =
      category === 'Bodyweight' && COMPOUND_BODYWEIGHT_IDS.has(te.exerciseId);

    if (isCompound || isCompoundBodyweight) {
      kept.push(te);
    } else {
      removed.push(te);
    }
  }

  // Step 2: fallback if nothing kept
  let working = kept.length > 0 ? kept : templateExercises.slice(0, 3);

  // Step 3: reduce sets
  working = working.map((te) => ({
    ...te,
    targetSets: reduceSets(te.targetSets),
  }));

  // Step 4: time cap enforcement
  while (estimateMinutes(working) > timeCap && working.length > 1) {
    working = working.slice(0, working.length - 1);
  }

  // Compute removed list (original kept minus what survived time cap trimming)
  const keptIds = new Set(working.map((e) => e.exerciseId));
  const allRemoved = templateExercises.filter((e) => !keptIds.has(e.exerciseId));

  const bareMinSets = countSets(working);
  const volumePercentage =
    originalSets > 0 ? Math.round((bareMinSets / originalSets) * 100) : 100;

  return {
    exercises: working,
    removedExercises: allRemoved,
    estimatedMinutes: estimateMinutes(working),
    originalEstimatedMinutes,
    volumePercentage,
  };
}
