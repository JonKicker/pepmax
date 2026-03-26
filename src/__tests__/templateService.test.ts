// Mock Firestore to avoid ESM import issues in Jest
jest.mock('../services/firebase/firestore', () => ({
  COLLECTIONS: { WORKOUT_TEMPLATES: 'workoutTemplates' },
  addDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocument: jest.fn(),
  queryDocuments: jest.fn(),
  updateDocument: jest.fn(),
}));

import { computeEstimatedDuration, computeMuscleGroups } from '../services/templateService';
import { exerciseLibrary } from '../data/exerciseLibrary';
import type { TemplateExercise } from '../types/template';

// ─── computeEstimatedDuration ────────────────────────────────────────────────

describe('computeEstimatedDuration', () => {
  it('returns 0 for empty array', () => {
    expect(computeEstimatedDuration([])).toBe(0);
  });

  it('calculates single exercise correctly', () => {
    const ex: TemplateExercise = {
      exerciseId: 'x', exerciseName: 'Test', order: 0,
      targetSets: 4, targetReps: '8-12', restSeconds: 90,
    };
    // setTime = 4 * 1.5 = 6 min
    // restTime = (4-1) * 90 / 60 = 4.5 min
    // total = 10.5 → rounded = 11
    expect(computeEstimatedDuration([ex])).toBe(11);
  });

  it('sums across multiple exercises', () => {
    const exercises: TemplateExercise[] = [
      { exerciseId: 'a', exerciseName: 'A', order: 0, targetSets: 3, targetReps: '10', restSeconds: 60 },
      { exerciseId: 'b', exerciseName: 'B', order: 1, targetSets: 3, targetReps: '10', restSeconds: 60 },
    ];
    // Each: setTime = 3*1.5 = 4.5, restTime = 2*60/60 = 2 → 6.5 each
    // Total = 13 → rounded = 13
    expect(computeEstimatedDuration(exercises)).toBe(13);
  });

  it('handles 1 set (0 rest periods)', () => {
    const ex: TemplateExercise = {
      exerciseId: 'x', exerciseName: 'T', order: 0,
      targetSets: 1, targetReps: '5', restSeconds: 120,
    };
    // setTime = 1 * 1.5 = 1.5, restTime = 0 * 120/60 = 0 → 1.5 → rounded = 2
    expect(computeEstimatedDuration([ex])).toBe(2);
  });
});

// ─── computeMuscleGroups ─────────────────────────────────────────────────────

describe('computeMuscleGroups', () => {
  it('returns empty array for empty exercises', () => {
    expect(computeMuscleGroups([], exerciseLibrary)).toEqual([]);
  });

  it('returns primary muscles from matched exercises', () => {
    const exercises: TemplateExercise[] = [
      { exerciseId: 'static_bench_press', exerciseName: 'Bench Press', order: 0, targetSets: 4, targetReps: '8', restSeconds: 90 },
    ];
    const result = computeMuscleGroups(exercises, exerciseLibrary);
    expect(result).toContain('Chest');
  });

  it('deduplicates muscles across exercises', () => {
    const exercises: TemplateExercise[] = [
      { exerciseId: 'static_bench_press', exerciseName: 'Bench', order: 0, targetSets: 4, targetReps: '8', restSeconds: 90 },
      { exerciseId: 'static_incline_bench_press', exerciseName: 'Incline', order: 1, targetSets: 3, targetReps: '10', restSeconds: 90 },
    ];
    const result = computeMuscleGroups(exercises, exerciseLibrary);
    // Both have Chest as primary — should appear only once
    const chestCount = result.filter((m) => m === 'Chest').length;
    expect(chestCount).toBe(1);
  });

  it('skips exercises not found in library', () => {
    const exercises: TemplateExercise[] = [
      { exerciseId: 'nonexistent_id', exerciseName: 'Fake', order: 0, targetSets: 3, targetReps: '10', restSeconds: 60 },
    ];
    expect(computeMuscleGroups(exercises, exerciseLibrary)).toEqual([]);
  });
});
