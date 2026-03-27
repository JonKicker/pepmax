/**
 * workoutSuggestion — pure algorithm for AI-Adaptive Workout Suggestions.
 *
 * No side effects. All functions accept data and return results.
 * Uses muscle readiness (days since last trained), recovery zone,
 * and available equipment to suggest the best workout.
 */
import type { MuscleGroup } from '../types/exercise';
import type { RecoveryZone } from '../types/recoveryScore';
import type {
  SuggestionIntensity,
  SuggestedExercise,
  SuggestedWorkout,
  SuggestionInputs,
} from '../types/workoutSuggestion';
import type { MuscleStats } from './muscleMapping';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum score (0-100) a template must reach to be preferred over generation. */
export const TEMPLATE_MATCH_THRESHOLD = 50;

/**
 * Maps ProfileEquipment values to Exercise equipment values.
 * ProfileEquipment uses plural/verbose names; Exercise.equipment uses singular/short names.
 */
export const PROFILE_TO_EXERCISE_EQUIPMENT: Record<string, string> = {
  'Barbell': 'Barbell',
  'Dumbbells': 'Dumbbell',
  'Kettlebells': 'Kettlebell',
  'Pull-up Bar': 'Pull-up Bar',
  'Dip Station': 'Bodyweight',
  'Flat Bench': 'Bench',
  'Adjustable Bench': 'Bench',
  'Squat Rack/Power Rack': 'Barbell', // Squat rack implies barbell access
  'Smith Machine': 'Smith Machine',
  'Cable Machine': 'Cable Machine',
  'Lat Pulldown': 'Cable Machine',
  'Leg Press': 'Machine',
  'Leg Curl/Extension': 'Machine',
  'Chest Fly Machine': 'Machine',
  'Rowing Machine': 'Machine',
  'Resistance Bands': 'Resistance Band',
  'TRX/Suspension Trainer': 'Bodyweight',
  'Medicine Ball': 'None',
  'Ab Wheel': 'None',
};

/** Valid MuscleGroup values — used for type guard. */
const VALID_MUSCLE_GROUPS = new Set<string>([
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core', 'Adductors', 'Abductors', 'Traps', 'Full Body',
]);

// ─── Type Guards ──────────────────────────────────────────────────────────────

/** Type guard: checks whether a string is a valid MuscleGroup. */
export function isMuscleGroup(value: string): value is MuscleGroup {
  return VALID_MUSCLE_GROUPS.has(value);
}

// ─── Equipment Helpers ────────────────────────────────────────────────────────

/**
 * Returns the set of exercise-layer equipment strings available given
 * the user's profile equipment list. Bodyweight is always available.
 */
export function buildExerciseEquipmentSet(profileEquipment: string[]): Set<string> {
  const result = new Set<string>(['Bodyweight', 'None']);
  for (const item of profileEquipment) {
    const mapped = PROFILE_TO_EXERCISE_EQUIPMENT[item];
    if (mapped) result.add(mapped);
  }
  return result;
}

/**
 * Returns true if the given exercise-layer equipment string is available
 * in the user's available equipment set.
 * Bodyweight and None are always available.
 */
export function isEquipmentAvailable(
  exerciseEquipment: string,
  availableEquipment: string[],
): boolean {
  if (exerciseEquipment === 'Bodyweight' || exerciseEquipment === 'None') return true;
  const available = buildExerciseEquipmentSet(availableEquipment);
  return available.has(exerciseEquipment);
}

// ─── Readiness & Intensity ────────────────────────────────────────────────────

/**
 * Compute a muscle's readiness score (0-100) from days since last trained.
 *
 * null  → 100  (never trained — fully rested)
 * 0     → 0    (trained today — needs rest)
 * 1     → 10   (trained yesterday — low readiness)
 * >=2   → min(days * 15, 100)  (scales up, capped at 100)
 */
export function computeMuscleReadiness(stats: MuscleStats): number {
  const days = stats.daysSinceTraining;
  if (days === null) return 100;
  if (days === 0) return 0;
  if (days === 1) return 10;
  return Math.min(days * 15, 100);
}

/** Map recovery zone to workout intensity recommendation. */
export function mapZoneToIntensity(zone: RecoveryZone): SuggestionIntensity {
  switch (zone) {
    case 'green': return 'heavy';
    case 'yellow': return 'moderate';
    case 'orange': return 'light';
    case 'red': return 'rest';
  }
}

/** Get set range for a given intensity level. */
export function getSetRange(intensity: SuggestionIntensity): { min: number; max: number } {
  switch (intensity) {
    case 'heavy': return { min: 3, max: 4 };
    case 'moderate': return { min: 2, max: 3 };
    case 'light': return { min: 2, max: 2 };
    case 'rest': return { min: 0, max: 0 };
  }
}

// ─── Template Scoring ─────────────────────────────────────────────────────────

/**
 * Score a template 0-100 based on:
 * - Average muscle readiness for the template's muscle groups
 * - Penalty for exercises with equipment not available
 *
 * Returns 0 if the template has no valid muscles.
 */
export function scoreTemplate(
  template: import('../types/template').WorkoutTemplate,
  muscleReadiness: Map<string, number>,
  availableEquipment: string[],
  library: import('../types/exercise').Exercise[],
): number {
  // Filter muscleGroups to valid MuscleGroup values
  const validMuscles = template.muscleGroups.filter(isMuscleGroup) as MuscleGroup[];
  if (validMuscles.length === 0) return 0;

  // Average readiness across template muscles
  let readinessSum = 0;
  for (const muscle of validMuscles) {
    readinessSum += muscleReadiness.get(muscle) ?? 100;
  }
  const avgReadiness = readinessSum / validMuscles.length;

  // Penalty for unavailable equipment
  const exerciseIds = new Set(template.exercises.map((e) => e.exerciseId));
  let unavailableCount = 0;
  let checkedCount = 0;

  for (const id of exerciseIds) {
    const exercise = library.find((ex) => ex.id === id);
    if (!exercise) continue;
    checkedCount++;
    if (!isEquipmentAvailable(exercise.equipment, availableEquipment)) {
      unavailableCount++;
    }
  }

  // Apply penalty: each unavailable exercise reduces score by 10 points
  const equipmentPenalty = checkedCount > 0 ? (unavailableCount / checkedCount) * 30 : 0;

  return Math.max(0, avgReadiness - equipmentPenalty);
}

/**
 * Find the best-matching template from inputs.
 * Returns null if no template meets the TEMPLATE_MATCH_THRESHOLD.
 */
export function matchTemplate(
  inputs: SuggestionInputs,
): { template: import('../types/template').WorkoutTemplate; score: number } | null {
  const { muscleStats, availableEquipment, templates, exerciseLibrary: library } = inputs;

  // Build readiness map
  const muscleReadiness = new Map<string, number>();
  for (const [muscle, stats] of muscleStats) {
    muscleReadiness.set(muscle, computeMuscleReadiness(stats));
  }

  let best: { template: import('../types/template').WorkoutTemplate; score: number } | null = null;

  for (const template of templates) {
    const score = scoreTemplate(template, muscleReadiness, availableEquipment, library);
    if (score >= TEMPLATE_MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { template, score };
    }
  }

  return best;
}

// ─── Workout Generation ───────────────────────────────────────────────────────

/**
 * Generate exercises from scratch by picking the top rested muscles
 * and finding suitable exercises for each, filtered by equipment.
 */
export function generateWorkout(inputs: SuggestionInputs): SuggestedExercise[] {
  const { muscleStats, availableEquipment, exerciseLibrary: library, recoveryZone } = inputs;
  const intensity = mapZoneToIntensity(recoveryZone);
  const setRange = getSetRange(intensity);

  // Rank muscles by readiness descending
  const rankedMuscles = Array.from(muscleStats.entries())
    .map(([muscle, stats]) => ({
      muscle,
      readiness: computeMuscleReadiness(stats),
    }))
    .filter((m) => isMuscleGroup(m.muscle) && m.muscle !== 'Full Body')
    .sort((a, b) => b.readiness - a.readiness);

  // Pick top 2-3 muscles, requiring readiness >= 30
  const targetMuscles = rankedMuscles
    .filter((m) => m.readiness >= 30)
    .slice(0, 3)
    .map((m) => m.muscle as MuscleGroup);

  if (targetMuscles.length === 0) return [];

  const exercises: SuggestedExercise[] = [];

  for (const muscle of targetMuscles) {
    // Find exercises for this muscle that have available equipment
    const candidates = library.filter(
      (ex) =>
        ex.primaryMuscles.includes(muscle) &&
        isEquipmentAvailable(ex.equipment, availableEquipment),
    );

    if (candidates.length === 0) continue;

    // Prefer compound exercises first
    const sorted = [...candidates].sort((a, b) => {
      const aIsCompound = a.category === 'Compound' ? 0 : 1;
      const bIsCompound = b.category === 'Compound' ? 0 : 1;
      return aIsCompound - bIsCompound;
    });

    // Pick top 1-2 exercises per muscle
    const picks = sorted.slice(0, intensity === 'heavy' ? 2 : 1);

    for (const ex of picks) {
      const targetSets = setRange.max;
      const targetReps = intensity === 'heavy' ? '4-6' : intensity === 'moderate' ? '8-12' : '12-15';
      exercises.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscle: ex.primaryMuscles[0] ?? muscle,
        targetSets,
        targetReps,
        equipment: ex.equipment,
      });
    }
  }

  return exercises;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generate an AI-adaptive workout suggestion.
 *
 * Returns null when:
 * - Recovery zone is 'red' (full rest recommended)
 * - Not enough data to make a meaningful suggestion
 */
export function generateSuggestion(inputs: SuggestionInputs): SuggestedWorkout | null {
  const { recoveryZone, recoveryScore } = inputs;
  const intensity = mapZoneToIntensity(recoveryZone);

  // Red zone: recommend full rest
  if (intensity === 'rest') return null;

  // Try template matching first
  const templateMatch = matchTemplate(inputs);

  if (templateMatch) {
    const { template } = templateMatch;
    const validMuscles = template.muscleGroups.filter(isMuscleGroup) as MuscleGroup[];

    const exercises: SuggestedExercise[] = template.exercises.map((te) => ({
      exerciseId: te.exerciseId,
      exerciseName: te.exerciseName,
      primaryMuscle: 'Core' as MuscleGroup, // fallback; actual muscle from library lookup
      targetSets: te.targetSets,
      targetReps: te.targetReps,
      equipment: '',
    })).map((se) => {
      const libEx = inputs.exerciseLibrary.find((ex) => ex.id === se.exerciseId);
      return {
        ...se,
        primaryMuscle: libEx?.primaryMuscles[0] ?? se.primaryMuscle,
        equipment: libEx?.equipment ?? se.equipment,
      };
    });

    const rationale = buildRationale(intensity, recoveryScore, validMuscles, 'template');

    return {
      source: 'template',
      templateId: template.id,
      templateName: template.name,
      exercises,
      targetMuscles: validMuscles,
      estimatedMinutes: template.estimatedDuration ?? estimateMinutes(exercises.length, intensity),
      rationale,
      intensity,
    };
  }

  // Fallback: generate from scratch
  const exercises = generateWorkout(inputs);
  if (exercises.length === 0) return null;

  const targetMuscles = Array.from(new Set(exercises.map((e) => e.primaryMuscle)));
  const rationale = buildRationale(intensity, recoveryScore, targetMuscles, 'generated');

  return {
    source: 'generated',
    exercises,
    targetMuscles,
    estimatedMinutes: estimateMinutes(exercises.length, intensity),
    rationale,
    intensity,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function estimateMinutes(exerciseCount: number, intensity: SuggestionIntensity): number {
  const setRange = getSetRange(intensity);
  const avgSets = (setRange.min + setRange.max) / 2;
  const minutesPerSet = 2.5; // avg set + rest
  return Math.round(exerciseCount * avgSets * minutesPerSet);
}

function buildRationale(
  intensity: SuggestionIntensity,
  recoveryScore: number,
  muscles: MuscleGroup[],
  source: 'template' | 'generated',
): string {
  const muscleList = muscles.slice(0, 3).join(', ');
  const scoreText = `Recovery at ${Math.round(recoveryScore)}`;

  switch (intensity) {
    case 'heavy':
      return `${scoreText} — peak performance day. ${source === 'template' ? 'Your best-matched template targets' : 'Focusing on'} ${muscleList}.`;
    case 'moderate':
      return `${scoreText} — solid training day. Moderate intensity recommended for ${muscleList}.`;
    case 'light':
      return `${scoreText} — active recovery session. Light work on ${muscleList} to promote blood flow.`;
    default:
      return `${scoreText} — workout suggested for ${muscleList}.`;
  }
}
