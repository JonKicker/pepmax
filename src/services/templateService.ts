/**
 * Workout template service — CRUD, computed helpers, and starter seeding.
 *
 * All operations scoped to users/{uid}/workoutTemplates/{docId}.
 */
import { orderBy } from 'firebase/firestore';
import {
  addDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  updateDocument,
  COLLECTIONS,
} from './firebase/firestore';
import { exerciseLibrary } from '../data/exerciseLibrary';
import { findExerciseById } from './exerciseService';
import type { ServiceResult } from '../types/service';
import type { Exercise } from '../types/exercise';
import type {
  WorkoutTemplate,
  WorkoutTemplateInput,
  TemplateExercise,
} from '../types/template';

const COL = COLLECTIONS.WORKOUT_TEMPLATES;

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<ServiceResult<WorkoutTemplate[]>> {
  const result = await queryDocuments<WorkoutTemplate>(COL, []);
  if (result.error) return result;
  // Sort client-side to avoid composite Firestore index
  const sorted = result.data.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() ?? 0;
    const bTime = b.updatedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
  return { data: sorted, error: null };
}

export async function getTemplateById(
  id: string,
): Promise<ServiceResult<WorkoutTemplate | null>> {
  return getDocument<WorkoutTemplate>(COL, id);
}

export async function saveTemplate(
  input: WorkoutTemplateInput,
): Promise<ServiceResult<string>> {
  return addDocument<Record<string, unknown>>(COL, input);
}

export async function updateTemplate(
  id: string,
  data: Partial<WorkoutTemplateInput>,
): Promise<ServiceResult<void>> {
  return updateDocument<Record<string, unknown>>(COL, id, data);
}

export async function deleteTemplate(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COL, id);
}

// ─── Computed helpers ────────────────────────────────────────────────────────

/** Sum of (targetSets * 1.5 min) + rest time between sets */
export function computeEstimatedDuration(exercises: TemplateExercise[]): number {
  let totalMinutes = 0;
  for (const ex of exercises) {
    const sets = Math.max(ex.targetSets, 1);
    const setTime = sets * 1.5;
    const restTime = ((sets - 1) * ex.restSeconds) / 60;
    totalMinutes += setTime + restTime;
  }
  return Math.round(totalMinutes);
}

/** Unique primary muscles from all exercises, resolved via library */
export function computeMuscleGroups(
  exercises: TemplateExercise[],
  library: Exercise[],
): string[] {
  const muscles = new Set<string>();
  for (const ex of exercises) {
    const found = findExerciseById(library, ex.exerciseId);
    if (found) {
      found.primaryMuscles.forEach((m) => muscles.add(m));
    }
  }
  return Array.from(muscles);
}

// ─── Starter templates ──────────────────────────────────────────────────────

function makeTemplateExercise(
  staticId: string,
  order: number,
  targetSets: number,
  targetReps: string,
  restSeconds = 90,
): TemplateExercise {
  const ex = exerciseLibrary.find((e) => e.id === staticId);
  return {
    exerciseId: staticId,
    exerciseName: ex?.name ?? staticId,
    order,
    targetSets,
    targetReps,
    restSeconds,
  };
}

const STARTER_TEMPLATES: WorkoutTemplateInput[] = [
  {
    name: 'Push Day',
    color: '#8E44AD',
    exercises: [
      makeTemplateExercise('static_bench_press', 0, 4, '8-12'),
      makeTemplateExercise('static_incline_db_press', 1, 3, '10-12'),
      makeTemplateExercise('static_cable_crossover', 2, 3, '12-15'),
      makeTemplateExercise('static_overhead_press', 3, 4, '8-10'),
      makeTemplateExercise('static_lateral_raise', 4, 3, '12-15'),
      makeTemplateExercise('static_tricep_pushdown', 5, 3, '12-15'),
    ],
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    estimatedDuration: 0,
  },
  {
    name: 'Pull Day',
    color: '#2E86C1',
    exercises: [
      makeTemplateExercise('static_barbell_row', 0, 4, '8-10'),
      makeTemplateExercise('static_pull_up', 1, 3, '8-12'),
      makeTemplateExercise('static_seated_cable_row', 2, 3, '10-12'),
      makeTemplateExercise('static_face_pull', 3, 3, '15-20'),
      makeTemplateExercise('static_barbell_curl', 4, 3, '10-12'),
      makeTemplateExercise('static_hammer_curl', 5, 3, '10-12'),
    ],
    muscleGroups: ['Back', 'Shoulders', 'Biceps'],
    estimatedDuration: 0,
  },
  {
    name: 'Leg Day',
    color: '#27AE60',
    exercises: [
      makeTemplateExercise('static_barbell_squat', 0, 4, '6-10'),
      makeTemplateExercise('static_romanian_deadlift', 1, 3, '8-12'),
      makeTemplateExercise('static_leg_press', 2, 3, '10-15'),
      makeTemplateExercise('static_leg_curl', 3, 3, '10-12'),
      makeTemplateExercise('static_standing_calf_raise', 4, 4, '12-15'),
      makeTemplateExercise('static_hip_thrust', 5, 3, '10-12'),
    ],
    muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    estimatedDuration: 0,
  },
  {
    name: 'Full Body',
    color: '#E74C3C',
    exercises: [
      makeTemplateExercise('static_barbell_squat', 0, 3, '8-10'),
      makeTemplateExercise('static_bench_press', 1, 3, '8-10'),
      makeTemplateExercise('static_barbell_row', 2, 3, '8-10'),
      makeTemplateExercise('static_overhead_press', 3, 3, '8-10'),
      makeTemplateExercise('static_romanian_deadlift', 4, 3, '8-10'),
    ],
    muscleGroups: ['Quads', 'Chest', 'Back', 'Shoulders', 'Hamstrings'],
    estimatedDuration: 0,
  },
];

// Compute durations for starters
for (const t of STARTER_TEMPLATES) {
  t.estimatedDuration = computeEstimatedDuration(t.exercises);
}

/** Seeds starter templates if user has none. Call on first load. */
export async function seedStarterTemplates(): Promise<void> {
  const result = await getTemplates();
  if (result.error || (result.data && result.data.length > 0)) return;

  for (const template of STARTER_TEMPLATES) {
    await saveTemplate(template);
  }
}
