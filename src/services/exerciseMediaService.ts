import { exerciseMediaMap, ExerciseMedia } from '../data/exerciseMediaMap';

/**
 * Pure synchronous lookup of exercise media (GIF + thumbnail).
 * Returns null for custom exercises or any ID not in the map.
 */
export function getExerciseMedia(exerciseId: string): ExerciseMedia | null {
  if (!exerciseId) return null;
  return exerciseMediaMap[exerciseId] ?? null;
}
