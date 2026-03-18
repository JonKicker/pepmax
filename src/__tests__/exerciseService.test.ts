// Mock Firestore to avoid ESM import issues in Jest
jest.mock('../services/firebase/firestore', () => ({
  COLLECTIONS: { CUSTOM_EXERCISES: 'customExercises' },
  addDocument: jest.fn(),
  queryDocuments: jest.fn(),
  deleteDocument: jest.fn(),
}));

import { getAllExercises, applyFilters, findExerciseById } from '../services/exerciseService';
import { exerciseLibrary } from '../data/exerciseLibrary';
import type { Exercise, MuscleGroup, ExerciseCategory } from '../types/exercise';

const custom: Exercise = {
  id: 'custom_1',
  name: 'My Special Press',
  category: 'Compound',
  primaryMuscles: ['Chest', 'Shoulders'],
  secondaryMuscles: ['Triceps'],
  equipment: 'Barbell',
  instructions: 'Press it.',
  tips: ['Be strong'],
  isCustom: true,
};

// ─── getAllExercises ──────────────────────────────────────────────────────────

describe('getAllExercises', () => {
  it('returns the full static library when custom is empty', () => {
    const result = getAllExercises([]);
    expect(result.length).toBe(exerciseLibrary.length);
  });

  it('appends custom exercises after static ones', () => {
    const result = getAllExercises([custom]);
    expect(result.length).toBe(exerciseLibrary.length + 1);
    expect(result[result.length - 1].id).toBe('custom_1');
  });

  it('does not mutate the static library', () => {
    const before = exerciseLibrary.length;
    getAllExercises([custom]);
    expect(exerciseLibrary.length).toBe(before);
  });
});

// ─── applyFilters ────────────────────────────────────────────────────────────

describe('applyFilters', () => {
  const exercises: Exercise[] = [
    {
      id: '1', name: 'Bench Press', category: 'Compound',
      primaryMuscles: ['Chest'], secondaryMuscles: ['Triceps'],
      equipment: 'Barbell', instructions: '', tips: [],
    },
    {
      id: '2', name: 'Bicep Curl', category: 'Isolation',
      primaryMuscles: ['Biceps'], secondaryMuscles: [],
      equipment: 'Dumbbell', instructions: '', tips: [],
    },
    {
      id: '3', name: 'Pull-up', category: 'Bodyweight',
      primaryMuscles: ['Back', 'Biceps'], secondaryMuscles: [],
      equipment: 'Pull-up Bar', instructions: '', tips: [],
    },
    {
      id: '4', name: 'Lat Pulldown', category: 'Cable',
      primaryMuscles: ['Back'], secondaryMuscles: ['Biceps'],
      equipment: 'Cable Machine', instructions: '', tips: [],
    },
  ];

  it('returns all exercises when no filters applied', () => {
    expect(applyFilters(exercises, '', [], [])).toHaveLength(4);
  });

  it('treats whitespace-only search as no search', () => {
    expect(applyFilters(exercises, '   ', [], [])).toHaveLength(4);
  });

  it('filters by name (case-insensitive)', () => {
    const result = applyFilters(exercises, 'bench', [], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by muscle name in search', () => {
    const result = applyFilters(exercises, 'biceps', [], []);
    expect(result).toHaveLength(2); // Bicep Curl (primary) + Pull-up (primary)
  });

  it('filters by equipment in search', () => {
    const result = applyFilters(exercises, 'dumbbell', [], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by single muscle group', () => {
    const result = applyFilters(exercises, '', ['Chest' as MuscleGroup], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by multiple muscles (OR)', () => {
    const result = applyFilters(exercises, '', ['Chest', 'Back'] as MuscleGroup[], []);
    expect(result).toHaveLength(3); // Bench Press, Pull-up, Lat Pulldown
  });

  it('filters by category', () => {
    const result = applyFilters(exercises, '', [], ['Isolation' as ExerciseCategory]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('combines search + muscle + category (AND)', () => {
    const result = applyFilters(exercises, 'pull', ['Back'] as MuscleGroup[], ['Bodyweight' as ExerciseCategory]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns empty array when nothing matches', () => {
    expect(applyFilters(exercises, 'zzzzz', [], [])).toHaveLength(0);
  });
});

// ─── findExerciseById ────────────────────────────────────────────────────────

describe('findExerciseById', () => {
  const exercises: Exercise[] = [
    {
      id: 'ex1', name: 'Squat', category: 'Compound',
      primaryMuscles: ['Quads'], secondaryMuscles: ['Glutes'],
      equipment: 'Barbell', instructions: '', tips: [],
    },
  ];

  it('returns matching exercise', () => {
    expect(findExerciseById(exercises, 'ex1')?.name).toBe('Squat');
  });

  it('returns undefined for unknown ID', () => {
    expect(findExerciseById(exercises, 'nope')).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(findExerciseById([], 'ex1')).toBeUndefined();
  });
});
