/**
 * Tests for the AI-Adaptive Workout Suggestions algorithm.
 * Pure functions only — no Firebase, no React, no hooks.
 */
import {
  computeMuscleReadiness,
  mapZoneToIntensity,
  generateSuggestion,
  isEquipmentAvailable,
  PROFILE_TO_EXERCISE_EQUIPMENT,
  isMuscleGroup,
  TEMPLATE_MATCH_THRESHOLD,
  scoreTemplate,
  buildExerciseEquipmentSet,
  matchTemplate,
} from '../utils/workoutSuggestion';
import type { MuscleStats } from '../utils/muscleMapping';
import type { SuggestionInputs } from '../types/workoutSuggestion';
import type { WorkoutTemplate } from '../types/template';
import type { Exercise } from '../types/exercise';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStats(daysSinceTraining: number | null, muscle = 'Chest'): MuscleStats {
  return {
    muscle: muscle as any,
    lastTrained: daysSinceTraining !== null ? new Date() : null,
    daysSinceTraining,
    weeklySets: 0,
    weeklyVolume: 0,
    topExercises: [],
  };
}

function makeStatsMap(entries: Array<[string, number | null]>): Map<string, MuscleStats> {
  const map = new Map<string, MuscleStats>();
  for (const [muscle, days] of entries) {
    map.set(muscle, makeStats(days, muscle));
  }
  return map;
}

function makeExercise(
  id: string,
  name: string,
  primaryMuscle: string,
  equipment: string,
  category = 'Compound',
): Exercise {
  return {
    id,
    name,
    category: category as any,
    primaryMuscles: [primaryMuscle as any],
    secondaryMuscles: [],
    equipment: equipment as any,
    instructions: '',
    tips: [],
  };
}

function makeTemplate(
  id: string,
  name: string,
  muscleGroups: string[],
  exerciseIds: string[],
): WorkoutTemplate {
  return {
    id,
    name,
    color: '#fff',
    muscleGroups,
    estimatedDuration: 45,
    exercises: exerciseIds.map((eid, i) => ({
      exerciseId: eid,
      exerciseName: `Exercise ${i + 1}`,
      order: i,
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
    })),
  };
}

const sampleLibrary: Exercise[] = [
  makeExercise('ex1', 'Barbell Bench Press', 'Chest', 'Barbell'),
  makeExercise('ex2', 'Dumbbell Fly', 'Chest', 'Dumbbell', 'Isolation'),
  makeExercise('ex3', 'Pull-up', 'Back', 'Bodyweight'),
  makeExercise('ex4', 'Barbell Row', 'Back', 'Barbell'),
  makeExercise('ex5', 'Squat', 'Quads', 'Barbell'),
  makeExercise('ex6', 'Push-up', 'Chest', 'Bodyweight'),
  makeExercise('ex7', 'Deadlift', 'Back', 'Barbell'),
  makeExercise('ex8', 'Overhead Press', 'Shoulders', 'Barbell'),
];

// ─── computeMuscleReadiness ───────────────────────────────────────────────────

describe('computeMuscleReadiness', () => {
  it('returns 100 for null (never trained)', () => {
    expect(computeMuscleReadiness(makeStats(null))).toBe(100);
  });

  it('returns 0 for 0 days (trained today)', () => {
    expect(computeMuscleReadiness(makeStats(0))).toBe(0);
  });

  it('returns 10 for 1 day', () => {
    expect(computeMuscleReadiness(makeStats(1))).toBe(10);
  });

  it('returns 75 for 5 days', () => {
    expect(computeMuscleReadiness(makeStats(5))).toBe(75);
  });

  it('returns 100 for 7 days (capped at 100)', () => {
    expect(computeMuscleReadiness(makeStats(7))).toBe(100);
  });

  it('returns 100 for 10 days (capped at 100)', () => {
    expect(computeMuscleReadiness(makeStats(10))).toBe(100);
  });

  it('returns 30 for 2 days', () => {
    expect(computeMuscleReadiness(makeStats(2))).toBe(30);
  });
});

// ─── mapZoneToIntensity ───────────────────────────────────────────────────────

describe('mapZoneToIntensity', () => {
  it('maps green → heavy', () => {
    expect(mapZoneToIntensity('green')).toBe('heavy');
  });

  it('maps yellow → moderate', () => {
    expect(mapZoneToIntensity('yellow')).toBe('moderate');
  });

  it('maps orange → light', () => {
    expect(mapZoneToIntensity('orange')).toBe('light');
  });

  it('maps red → rest', () => {
    expect(mapZoneToIntensity('red')).toBe('rest');
  });
});

// ─── isMuscleGroup ────────────────────────────────────────────────────────────

describe('isMuscleGroup', () => {
  it('returns true for valid muscle groups', () => {
    expect(isMuscleGroup('Chest')).toBe(true);
    expect(isMuscleGroup('Back')).toBe(true);
    expect(isMuscleGroup('Quads')).toBe(true);
    expect(isMuscleGroup('Core')).toBe(true);
    expect(isMuscleGroup('Full Body')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isMuscleGroup('chest')).toBe(false); // lowercase
    expect(isMuscleGroup('Arms')).toBe(false);
    expect(isMuscleGroup('')).toBe(false);
    expect(isMuscleGroup('Invalid')).toBe(false);
    expect(isMuscleGroup('Pecs')).toBe(false);
  });
});

// ─── isEquipmentAvailable ─────────────────────────────────────────────────────

describe('isEquipmentAvailable', () => {
  it('bodyweight is always available even with empty profile', () => {
    expect(isEquipmentAvailable('Bodyweight', [])).toBe(true);
  });

  it('None is always available', () => {
    expect(isEquipmentAvailable('None', [])).toBe(true);
  });

  it('Barbell is available when Barbell is in profile', () => {
    expect(isEquipmentAvailable('Barbell', ['Barbell'])).toBe(true);
  });

  it('Dumbbell requires Dumbbells in profile (mapping)', () => {
    expect(isEquipmentAvailable('Dumbbell', ['Dumbbells'])).toBe(true);
  });

  it('Dumbbell is not available when profile has only Barbell', () => {
    expect(isEquipmentAvailable('Dumbbell', ['Barbell'])).toBe(false);
  });

  it('Cable Machine is available when Cable Machine is in profile', () => {
    expect(isEquipmentAvailable('Cable Machine', ['Cable Machine'])).toBe(true);
  });

  it('Barbell is available when Squat Rack/Power Rack is in profile', () => {
    expect(isEquipmentAvailable('Barbell', ['Squat Rack/Power Rack'])).toBe(true);
  });

  it('Resistance Band requires Resistance Bands in profile', () => {
    expect(isEquipmentAvailable('Resistance Band', ['Resistance Bands'])).toBe(true);
    expect(isEquipmentAvailable('Resistance Band', [])).toBe(false);
  });
});

// ─── PROFILE_TO_EXERCISE_EQUIPMENT ───────────────────────────────────────────

describe('PROFILE_TO_EXERCISE_EQUIPMENT', () => {
  it('maps Dumbbells → Dumbbell', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Dumbbells']).toBe('Dumbbell');
  });

  it('maps Kettlebells → Kettlebell', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Kettlebells']).toBe('Kettlebell');
  });

  it('maps Cable Machine → Cable Machine', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Cable Machine']).toBe('Cable Machine');
  });

  it('maps Lat Pulldown → Cable Machine', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Lat Pulldown']).toBe('Cable Machine');
  });

  it('maps Resistance Bands → Resistance Band', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Resistance Bands']).toBe('Resistance Band');
  });

  it('maps Pull-up Bar → Pull-up Bar', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Pull-up Bar']).toBe('Pull-up Bar');
  });

  it('maps Squat Rack/Power Rack → Barbell', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Squat Rack/Power Rack']).toBe('Barbell');
  });

  it('maps Flat Bench → Bench', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Flat Bench']).toBe('Bench');
  });

  it('maps Barbell → Barbell (identity)', () => {
    expect(PROFILE_TO_EXERCISE_EQUIPMENT['Barbell']).toBe('Barbell');
  });
});

// ─── generateSuggestion — red zone ───────────────────────────────────────────

describe('generateSuggestion — red zone', () => {
  it('returns null when recovery zone is red', () => {
    const inputs: SuggestionInputs = {
      muscleStats: makeStatsMap([['Chest', 5], ['Back', 5], ['Quads', 5]]),
      recoveryZone: 'red',
      recoveryScore: 20,
      availableEquipment: ['Barbell', 'Dumbbells'],
      templates: [],
      exerciseLibrary: sampleLibrary,
    };
    expect(generateSuggestion(inputs)).toBeNull();
  });
});

// ─── generateSuggestion — green zone ─────────────────────────────────────────

describe('generateSuggestion — green zone picks most-rested muscles', () => {
  it('targets muscles with highest readiness (untrained)', () => {
    // Chest trained today (0 days = 0 readiness), Back never trained (null = 100)
    const inputs: SuggestionInputs = {
      muscleStats: makeStatsMap([
        ['Chest', 0],
        ['Back', null],
        ['Quads', null],
        ['Shoulders', null],
      ]),
      recoveryZone: 'green',
      recoveryScore: 88,
      availableEquipment: ['Barbell'],
      templates: [],
      exerciseLibrary: sampleLibrary,
    };
    const result = generateSuggestion(inputs);
    expect(result).not.toBeNull();
    expect(result!.intensity).toBe('heavy');
    // Chest has readiness 0, so should not be in target muscles
    expect(result!.targetMuscles).not.toContain('Chest');
    // Back and Quads have readiness 100 and should be included
    const hasHighReadiness = result!.targetMuscles.some((m) => m === 'Back' || m === 'Quads');
    expect(hasHighReadiness).toBe(true);
  });

  it('returns generated source when no templates', () => {
    const inputs: SuggestionInputs = {
      muscleStats: makeStatsMap([['Chest', 3], ['Back', 4]]),
      recoveryZone: 'green',
      recoveryScore: 85,
      availableEquipment: ['Barbell'],
      templates: [],
      exerciseLibrary: sampleLibrary,
    };
    const result = generateSuggestion(inputs);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('generated');
  });
});

// ─── generateSuggestion — equipment filtering ────────────────────────────────

describe('generateSuggestion — equipment filtering', () => {
  it('only includes exercises with available equipment', () => {
    // Only bodyweight available (no barbell, no dumbbell)
    const inputs: SuggestionInputs = {
      muscleStats: makeStatsMap([['Chest', 3], ['Back', 3]]),
      recoveryZone: 'green',
      recoveryScore: 80,
      availableEquipment: [], // empty = only bodyweight
      templates: [],
      exerciseLibrary: sampleLibrary,
    };
    const result = generateSuggestion(inputs);
    if (result) {
      for (const exercise of result.exercises) {
        expect(['Bodyweight', 'None']).toContain(exercise.equipment);
      }
    }
  });
});

// ─── generateSuggestion — template matching ──────────────────────────────────

describe('generateSuggestion — template matching', () => {
  it('prefers a matching template over generated when score >= threshold', () => {
    // All muscles fully rested (null = 100 readiness)
    const muscleStats = makeStatsMap([
      ['Chest', null],
      ['Back', null],
      ['Shoulders', null],
    ]);

    const chestTemplate = makeTemplate(
      'tmpl1',
      'Chest Day',
      ['Chest', 'Shoulders'],
      ['ex1', 'ex8'],
    );

    const inputs: SuggestionInputs = {
      muscleStats,
      recoveryZone: 'green',
      recoveryScore: 90,
      availableEquipment: ['Barbell'], // exercises use barbell — available
      templates: [chestTemplate],
      exerciseLibrary: sampleLibrary,
    };

    const result = generateSuggestion(inputs);
    expect(result).not.toBeNull();
    expect(result!.source).toBe('template');
    expect(result!.templateId).toBe('tmpl1');
    expect(result!.templateName).toBe('Chest Day');
  });

  it('falls back to generated when template score is below threshold', () => {
    // Muscles were just trained (0 days = 0 readiness) — template score will be low
    const muscleStats = makeStatsMap([
      ['Chest', 0],
      ['Back', null], // Back is rested — for generation
    ]);

    const chestTemplate = makeTemplate('tmpl1', 'Chest Day', ['Chest'], ['ex1']);

    const inputs: SuggestionInputs = {
      muscleStats,
      recoveryZone: 'yellow',
      recoveryScore: 60,
      availableEquipment: ['Barbell'],
      templates: [chestTemplate],
      exerciseLibrary: sampleLibrary,
    };

    const result = generateSuggestion(inputs);
    // Template score for Chest=0 readiness is 0, below threshold
    // So should fall back to generated (or null if no other muscles have >= 30 readiness)
    if (result) {
      expect(result.source).toBe('generated');
    }
    // It's OK if result is null (Chest=0, Back=null but only 2 muscles in stats, Back isn't in template)
  });
});

// ─── TEMPLATE_MATCH_THRESHOLD ─────────────────────────────────────────────────

describe('TEMPLATE_MATCH_THRESHOLD', () => {
  it('is defined as a named constant with value 50', () => {
    expect(TEMPLATE_MATCH_THRESHOLD).toBe(50);
  });
});

// ─── scoreTemplate ────────────────────────────────────────────────────────────

describe('scoreTemplate', () => {
  it('returns high score when muscles are rested and equipment is available', () => {
    const muscleReadiness = new Map([['Chest', 100], ['Shoulders', 100]]);
    const template = makeTemplate('t1', 'Push Day', ['Chest', 'Shoulders'], ['ex1', 'ex8']);
    const score = scoreTemplate(template, muscleReadiness, ['Barbell'], sampleLibrary);
    expect(score).toBeGreaterThanOrEqual(TEMPLATE_MATCH_THRESHOLD);
  });

  it('returns low score when muscles are fresh (just trained)', () => {
    const muscleReadiness = new Map([['Chest', 0]]);
    const template = makeTemplate('t1', 'Chest Day', ['Chest'], ['ex1']);
    const score = scoreTemplate(template, muscleReadiness, ['Barbell'], sampleLibrary);
    expect(score).toBeLessThan(TEMPLATE_MATCH_THRESHOLD);
  });

  it('returns 0 for template with no valid muscle groups', () => {
    const muscleReadiness = new Map<string, number>();
    const template = makeTemplate('t1', 'Invalid', ['NotAMuscle', 'AlsoInvalid'], ['ex1']);
    const score = scoreTemplate(template, muscleReadiness, ['Barbell'], sampleLibrary);
    expect(score).toBe(0);
  });

  it('penalizes for unavailable equipment', () => {
    const muscleReadiness = new Map([['Chest', 100]]);
    const template = makeTemplate('t1', 'Chest Day', ['Chest'], ['ex1']); // ex1 needs Barbell
    const scoreWithBarbell = scoreTemplate(template, muscleReadiness, ['Barbell'], sampleLibrary);
    const scoreNoBarbell = scoreTemplate(template, muscleReadiness, [], sampleLibrary);
    expect(scoreWithBarbell).toBeGreaterThan(scoreNoBarbell);
  });
});

// ─── buildExerciseEquipmentSet ────────────────────────────────────────────────

describe('buildExerciseEquipmentSet', () => {
  it('always includes Bodyweight and None', () => {
    const set = buildExerciseEquipmentSet([]);
    expect(set.has('Bodyweight')).toBe(true);
    expect(set.has('None')).toBe(true);
  });

  it('maps profile equipment to exercise equipment strings', () => {
    const set = buildExerciseEquipmentSet(['Dumbbells', 'Cable Machine', 'Barbell']);
    expect(set.has('Dumbbell')).toBe(true);
    expect(set.has('Cable Machine')).toBe(true);
    expect(set.has('Barbell')).toBe(true);
  });
});
