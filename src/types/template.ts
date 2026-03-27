import { Timestamp } from 'firebase/firestore';

export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
  restSeconds: number;
  notes?: string;
  supersetGroup?: number;
  setType?: 'normal' | 'warmup' | 'dropset' | 'failure';
  circuitRounds?: number; // only meaningful on first exercise of a superset group
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  exercises: TemplateExercise[];
  muscleGroups: string[];
  estimatedDuration: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type WorkoutTemplateInput = Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>;

export const TEMPLATE_COLORS = [
  '#8E44AD',
  '#2E86C1',
  '#27AE60',
  '#E74C3C',
  '#F39C12',
  '#1ABC9C',
  '#E91E63',
  '#3F51B5',
];
