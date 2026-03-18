export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Full Body';

export type ExerciseCategory =
  | 'Compound'
  | 'Isolation'
  | 'Bodyweight'
  | 'Machine'
  | 'Cable'
  | 'Cardio';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable Machine'
  | 'Smith Machine'
  | 'Machine'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Resistance Band'
  | 'EZ Bar'
  | 'Pull-up Bar'
  | 'Bench'
  | 'None';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  instructions: string;
  tips: string[];
  isCustom?: boolean;
}
