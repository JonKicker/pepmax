import type { MuscleGroup } from './exercise';
import type { RecoveryZone } from './recoveryScore';

export type SuggestionIntensity = 'heavy' | 'moderate' | 'light' | 'rest';

export type SuggestedExercise = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
  equipment: string;
};

export type SuggestedWorkout = {
  source: 'template' | 'generated';
  templateId?: string;
  templateName?: string;
  exercises: SuggestedExercise[];
  targetMuscles: MuscleGroup[];
  estimatedMinutes: number;
  rationale: string;
  intensity: SuggestionIntensity;
};

export type SuggestionInputs = {
  muscleStats: Map<string, import('../utils/muscleMapping').MuscleStats>;
  recoveryZone: RecoveryZone;
  recoveryScore: number;
  availableEquipment: string[];
  templates: import('./template').WorkoutTemplate[];
  exerciseLibrary: import('./exercise').Exercise[];
};
