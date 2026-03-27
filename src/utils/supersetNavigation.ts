/**
 * supersetNavigation.ts
 *
 * Pure utility functions for superset and circuit grouping logic.
 * No React, no side effects — safe to test in isolation.
 */

import type { SessionExercise } from '../types/workout';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GroupedExercise = { exercise: SessionExercise; originalIndex: number };
export type ExerciseGroup = { groupNumber: number | null; exercises: GroupedExercise[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the exercise belongs to a superset group.
 */
export function isInSuperset(exercise: SessionExercise): boolean {
  return exercise.supersetGroup !== null && exercise.supersetGroup !== undefined;
}

/**
 * Returns all exercises that share the same supersetGroup as the exercise at
 * exerciseIndex, including itself. Returns a single-element array when the
 * exercise is not in a superset.
 */
export function getSupersetGroup(
  exercises: SessionExercise[],
  exerciseIndex: number,
): GroupedExercise[] {
  const exercise = exercises[exerciseIndex];
  if (!exercise) return [];
  if (!isInSuperset(exercise)) {
    return [{ exercise, originalIndex: exerciseIndex }];
  }
  const group = exercise.supersetGroup!;
  const result: GroupedExercise[] = [];
  for (let i = 0; i < exercises.length; i++) {
    if (exercises[i].supersetGroup === group) {
      result.push({ exercise: exercises[i], originalIndex: i });
    }
  }
  return result;
}

/**
 * Groups a flat exercises list into ExerciseGroup buckets.
 * Exercises with the same supersetGroup appear together. Standalone exercises
 * get groupNumber === null. The original index into the source array is preserved.
 *
 * Ordering within a group follows the exercises array order (stable).
 */
export function groupExercisesBySuperset(exercises: SessionExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const seenGroups = new Map<number, ExerciseGroup>();

  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    if (!isInSuperset(exercise)) {
      // Standalone
      groups.push({ groupNumber: null, exercises: [{ exercise, originalIndex: i }] });
    } else {
      const groupNum = exercise.supersetGroup!;
      if (seenGroups.has(groupNum)) {
        seenGroups.get(groupNum)!.exercises.push({ exercise, originalIndex: i });
      } else {
        const newGroup: ExerciseGroup = {
          groupNumber: groupNum,
          exercises: [{ exercise, originalIndex: i }],
        };
        groups.push(newGroup);
        seenGroups.set(groupNum, newGroup);
      }
    }
  }
  return groups;
}

/**
 * Converts a 0-based group number to a letter label.
 * 0 → "A", 1 → "B", ..., 25 → "Z", 26 → "A" (wraps)
 */
export function getGroupLabel(groupNumber: number): string {
  return String.fromCharCode(65 + (groupNumber % 26));
}

/**
 * Determines whether the training app should start a rest timer after the
 * given set is completed.
 *
 * Rules:
 * - Exercise NOT in a superset → always rest (return true)
 * - Exercise IS in a superset:
 *   - Find all group members in exercises order.
 *   - The "round" is setIdx (0-based).
 *   - Look for the next group member (after exerciseIdx in group order) that
 *     has an incomplete or missing set at round index → if found, no rest yet.
 *   - If exerciseIdx is the last member completing this round → rest.
 *
 * A set at round `setIdx` is considered "complete" when set[setIdx].completed === true.
 */
export function shouldRestAfterSet(
  exercises: SessionExercise[],
  exerciseIdx: number,
  setIdx: number,
): boolean {
  const exercise = exercises[exerciseIdx];
  if (!exercise || !isInSuperset(exercise)) return true;

  const groupMembers = getSupersetGroup(exercises, exerciseIdx);
  if (groupMembers.length <= 1) return true; // lone member — treat as normal

  // Find this exercise's position within its group
  const posInGroup = groupMembers.findIndex((m) => m.originalIndex === exerciseIdx);

  // Check whether any member AFTER this one in the group still needs to do round setIdx
  for (let i = posInGroup + 1; i < groupMembers.length; i++) {
    const member = groupMembers[i];
    const memberSet = member.exercise.sets[setIdx];
    if (!memberSet || !memberSet.completed) {
      // Next member hasn't done this round yet — no rest
      return false;
    }
  }

  // This exercise is the last in the group to complete this round → rest
  return true;
}

/**
 * Returns the name of the next exercise to perform within a superset,
 * or null when the exercise is not in a superset.
 *
 * The "next" exercise is the one immediately after exerciseIdx in the group.
 * When exerciseIdx is the last member, wraps around to the first member
 * (indicating a new round starts).
 */
export function getNextSupersetExerciseName(
  exercises: SessionExercise[],
  exerciseIdx: number,
): string | null {
  const exercise = exercises[exerciseIdx];
  if (!exercise || !isInSuperset(exercise)) return null;

  const groupMembers = getSupersetGroup(exercises, exerciseIdx);
  if (groupMembers.length <= 1) return null;

  const posInGroup = groupMembers.findIndex((m) => m.originalIndex === exerciseIdx);
  const nextPos = (posInGroup + 1) % groupMembers.length;
  return groupMembers[nextPos].exercise.exerciseName;
}
