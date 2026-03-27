/**
 * supersetNavigation.test.ts
 *
 * Tests for all pure utilities in src/utils/supersetNavigation.ts
 */

import {
  isInSuperset,
  getSupersetGroup,
  groupExercisesBySuperset,
  getGroupLabel,
  shouldRestAfterSet,
  getNextSupersetExerciseName,
} from '../utils/supersetNavigation';
import type { SessionExercise, SessionSet } from '../types/workout';
import { Timestamp } from 'firebase/firestore';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeSet(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    setNumber: 1,
    weight: 100,
    weightUnit: 'lbs',
    reps: 10,
    rpe: null,
    completed: false,
    completedAt: null,
    isPersonalRecord: false,
    ...overrides,
  };
}

function makeExercise(
  name: string,
  supersetGroup: number | null,
  sets: SessionSet[] = [makeSet()],
): SessionExercise {
  return {
    exerciseId: name.toLowerCase().replace(/\s/g, '_'),
    exerciseName: name,
    primaryMuscle: 'Chest',
    order: 0,
    supersetGroup,
    sets,
    notes: '',
    restSeconds: 90,
  };
}

// ─── isInSuperset ─────────────────────────────────────────────────────────────

describe('isInSuperset', () => {
  it('returns true when supersetGroup is a number', () => {
    const ex = makeExercise('Bench Press', 0);
    expect(isInSuperset(ex)).toBe(true);
  });

  it('returns false when supersetGroup is null', () => {
    const ex = makeExercise('Squat', null);
    expect(isInSuperset(ex)).toBe(false);
  });

  it('returns false when supersetGroup is undefined', () => {
    const ex = makeExercise('Deadlift', null);
    // Force undefined to test the guard
    (ex as any).supersetGroup = undefined;
    expect(isInSuperset(ex)).toBe(false);
  });
});

// ─── getSupersetGroup ─────────────────────────────────────────────────────────

describe('getSupersetGroup', () => {
  it('returns only the exercise when it is not in a superset', () => {
    const exercises = [makeExercise('Squat', null), makeExercise('Bench Press', 0)];
    const group = getSupersetGroup(exercises, 0);
    expect(group).toHaveLength(1);
    expect(group[0].exercise.exerciseName).toBe('Squat');
    expect(group[0].originalIndex).toBe(0);
  });

  it('returns all grouped members and preserves originalIndex', () => {
    const exercises = [
      makeExercise('Bench Press', 1),
      makeExercise('Squat', null),
      makeExercise('Tricep Extension', 1),
    ];
    const group = getSupersetGroup(exercises, 0);
    expect(group).toHaveLength(2);
    expect(group[0].originalIndex).toBe(0);
    expect(group[1].originalIndex).toBe(2);
  });

  it('returns empty array for out-of-bounds index', () => {
    const exercises = [makeExercise('Squat', null)];
    expect(getSupersetGroup(exercises, 99)).toHaveLength(0);
  });
});

// ─── groupExercisesBySuperset ─────────────────────────────────────────────────

describe('groupExercisesBySuperset', () => {
  it('returns standalone exercises as null-group entries', () => {
    const exercises = [makeExercise('Squat', null), makeExercise('Deadlift', null)];
    const groups = groupExercisesBySuperset(exercises);
    expect(groups).toHaveLength(2);
    expect(groups[0].groupNumber).toBeNull();
    expect(groups[1].groupNumber).toBeNull();
  });

  it('groups exercises with the same supersetGroup', () => {
    const exercises = [
      makeExercise('Bench Press', 0),
      makeExercise('Tricep Extension', 0),
    ];
    const groups = groupExercisesBySuperset(exercises);
    expect(groups).toHaveLength(1);
    expect(groups[0].groupNumber).toBe(0);
    expect(groups[0].exercises).toHaveLength(2);
  });

  it('handles mixed standalone and grouped exercises correctly', () => {
    const exercises = [
      makeExercise('Squat', null),
      makeExercise('Bench Press', 1),
      makeExercise('Tricep Extension', 1),
      makeExercise('Deadlift', null),
    ];
    const groups = groupExercisesBySuperset(exercises);
    expect(groups).toHaveLength(3);
    expect(groups[0].groupNumber).toBeNull();
    expect(groups[0].exercises[0].exercise.exerciseName).toBe('Squat');
    expect(groups[1].groupNumber).toBe(1);
    expect(groups[1].exercises).toHaveLength(2);
    expect(groups[2].groupNumber).toBeNull();
    expect(groups[2].exercises[0].exercise.exerciseName).toBe('Deadlift');
  });

  it('preserves the order of exercises within a group', () => {
    const exercises = [
      makeExercise('A', 0),
      makeExercise('B', 0),
      makeExercise('C', 0),
    ];
    const groups = groupExercisesBySuperset(exercises);
    expect(groups[0].exercises.map((g) => g.exercise.exerciseName)).toEqual(['A', 'B', 'C']);
  });

  it('handles multiple separate superset groups', () => {
    const exercises = [
      makeExercise('A', 0),
      makeExercise('B', 0),
      makeExercise('C', 2),
      makeExercise('D', 2),
    ];
    const groups = groupExercisesBySuperset(exercises);
    expect(groups).toHaveLength(2);
    expect(groups[0].groupNumber).toBe(0);
    expect(groups[1].groupNumber).toBe(2);
  });
});

// ─── getGroupLabel ────────────────────────────────────────────────────────────

describe('getGroupLabel', () => {
  it('converts 0 to "A"', () => {
    expect(getGroupLabel(0)).toBe('A');
  });

  it('converts 1 to "B"', () => {
    expect(getGroupLabel(1)).toBe('B');
  });

  it('converts 25 to "Z"', () => {
    expect(getGroupLabel(25)).toBe('Z');
  });

  it('wraps around after Z (26 → "A")', () => {
    expect(getGroupLabel(26)).toBe('A');
  });
});

// ─── shouldRestAfterSet ───────────────────────────────────────────────────────

describe('shouldRestAfterSet', () => {
  it('returns true for a normal (non-superset) exercise', () => {
    const exercises = [makeExercise('Squat', null)];
    expect(shouldRestAfterSet(exercises, 0, 0)).toBe(true);
  });

  it('returns true for a normal exercise regardless of setIndex', () => {
    const exercises = [
      makeExercise('Squat', null, [makeSet({ completed: true }), makeSet(), makeSet()]),
    ];
    expect(shouldRestAfterSet(exercises, 0, 1)).toBe(true);
  });

  it('returns false when superset first member has next member with incomplete set at same round', () => {
    // Group: Bench (idx 0), Tricep (idx 1)
    // Bench completes set 0 → Tricep has not completed set 0 yet → no rest
    const bench = makeExercise('Bench Press', 5, [makeSet({ completed: false })]);
    const tricep = makeExercise('Tricep Extension', 5, [makeSet({ completed: false })]);
    const exercises = [bench, tricep];
    expect(shouldRestAfterSet(exercises, 0, 0)).toBe(false);
  });

  it('returns true when superset last member completes the round', () => {
    // Group: Bench (idx 0, set 0 complete), Tricep (idx 1, completing set 0)
    const bench = makeExercise('Bench Press', 5, [makeSet({ completed: true })]);
    const tricep = makeExercise('Tricep Extension', 5, [makeSet({ completed: false })]);
    const exercises = [bench, tricep];
    // Tricep is the last member, so the round is done → rest
    expect(shouldRestAfterSet(exercises, 1, 0)).toBe(true);
  });

  it('returns false when middle member completes and last member has not gone yet', () => {
    // Three-way superset: A done, B completing, C not done
    const exA = makeExercise('A', 3, [makeSet({ completed: true })]);
    const exB = makeExercise('B', 3, [makeSet({ completed: false })]);
    const exC = makeExercise('C', 3, [makeSet({ completed: false })]);
    const exercises = [exA, exB, exC];
    expect(shouldRestAfterSet(exercises, 1, 0)).toBe(false);
  });

  it('returns true when a single exercise has supersetGroup set but is alone in its group', () => {
    const ex = makeExercise('Lone Ranger', 7, [makeSet()]);
    const exercises = [ex];
    expect(shouldRestAfterSet(exercises, 0, 0)).toBe(true);
  });

  it('returns true when superset last member completes round 1 (second set, 0-based idx 1)', () => {
    const bench = makeExercise('Bench Press', 5, [
      makeSet({ completed: true }),
      makeSet({ completed: true }),
    ]);
    const tricep = makeExercise('Tricep Extension', 5, [
      makeSet({ completed: true }),
      makeSet({ completed: false }),
    ]);
    const exercises = [bench, tricep];
    // Tricep completing set index 1, bench already done → rest
    expect(shouldRestAfterSet(exercises, 1, 1)).toBe(true);
  });

  it('returns false when first member of three completes round 1, others not done', () => {
    const exA = makeExercise('A', 2, [makeSet({ completed: true }), makeSet({ completed: false })]);
    const exB = makeExercise('B', 2, [makeSet({ completed: true }), makeSet({ completed: false })]);
    const exC = makeExercise('C', 2, [makeSet({ completed: true }), makeSet({ completed: false })]);
    const exercises = [exA, exB, exC];
    // exA completing set index 1, B and C not done yet
    expect(shouldRestAfterSet(exercises, 0, 1)).toBe(false);
  });
});

// ─── getNextSupersetExerciseName ─────────────────────────────────────────────

describe('getNextSupersetExerciseName', () => {
  it('returns null for an exercise not in a superset', () => {
    const exercises = [makeExercise('Squat', null)];
    expect(getNextSupersetExerciseName(exercises, 0)).toBeNull();
  });

  it('returns the next member name in a superset', () => {
    const exercises = [
      makeExercise('Bench Press', 0),
      makeExercise('Tricep Extension', 0),
    ];
    expect(getNextSupersetExerciseName(exercises, 0)).toBe('Tricep Extension');
  });

  it('wraps around from the last member to the first (new round)', () => {
    const exercises = [
      makeExercise('Bench Press', 0),
      makeExercise('Tricep Extension', 0),
    ];
    expect(getNextSupersetExerciseName(exercises, 1)).toBe('Bench Press');
  });

  it('returns null for a lone exercise in a supersetGroup', () => {
    const exercises = [makeExercise('Lone', 4)];
    expect(getNextSupersetExerciseName(exercises, 0)).toBeNull();
  });

  it('returns correct next for three-way superset', () => {
    const exercises = [
      makeExercise('A', 1),
      makeExercise('B', 1),
      makeExercise('C', 1),
    ];
    expect(getNextSupersetExerciseName(exercises, 0)).toBe('B');
    expect(getNextSupersetExerciseName(exercises, 1)).toBe('C');
    expect(getNextSupersetExerciseName(exercises, 2)).toBe('A'); // wraps
  });
});
