import { exerciseLibrary } from '../data/exerciseLibrary';
import { Exercise, MuscleGroup, ExerciseCategory } from '../types/exercise';
import { COLLECTIONS, addDocument, queryDocuments, deleteDocument } from './firebase/firestore';
import type { ServiceResult } from '../types/service';

// ─── Pure helpers (no Firestore) ──────────────────────────────────────────────

/** Merge static library with user's custom exercises */
export function getAllExercises(custom: Exercise[]): Exercise[] {
  return [...exerciseLibrary, ...custom];
}

/** Search + filter exercises. All filters are AND-combined. */
export function applyFilters(
  exercises: Exercise[],
  searchQuery: string,
  muscles: MuscleGroup[],
  categories: ExerciseCategory[],
): Exercise[] {
  let results = exercises;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    results = results.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
        e.equipment.toLowerCase().includes(q),
    );
  }

  if (muscles.length > 0) {
    results = results.filter((e) =>
      muscles.some((m) => e.primaryMuscles.includes(m)),
    );
  }

  if (categories.length > 0) {
    results = results.filter((e) => categories.includes(e.category));
  }

  return results;
}

/** Lookup a single exercise by ID from a combined list */
export function findExerciseById(
  exercises: Exercise[],
  id: string,
): Exercise | undefined {
  return exercises.find((e) => e.id === id);
}

// ─── Firestore CRUD for custom exercises ─────────────────────────────────────

export async function getCustomExercises(): Promise<ServiceResult<Exercise[]>> {
  const result = await queryDocuments<Exercise>(COLLECTIONS.CUSTOM_EXERCISES, []);
  if (result.error) return result;
  // Mark them all as custom
  const exercises = result.data.map((e) => ({ ...e, isCustom: true }));
  return { data: exercises, error: null };
}

export async function addCustomExercise(
  exercise: Omit<Exercise, 'id' | 'isCustom'>,
): Promise<ServiceResult<string>> {
  return addDocument(COLLECTIONS.CUSTOM_EXERCISES, {
    ...exercise,
    isCustom: true,
  });
}

export async function deleteCustomExercise(
  id: string,
): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.CUSTOM_EXERCISES, id);
}
