import { Timestamp } from 'firebase/firestore';
import type { MuscleGroup, ExerciseCategory } from './exercise';

// ─── Live Session types ──────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type SessionSet = {
  setNumber: number;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  reps: number;
  rpe: number | null;
  completed: boolean;
  completedAt: Timestamp | null;
  isPersonalRecord: boolean;
};

export type SessionExercise = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  category?: ExerciseCategory;
  order: number;
  supersetGroup: number | null;
  sets: SessionSet[];
  notes: string;
  restSeconds: number; // per-exercise rest timer duration; defaults to 90 if not set
};

export type WorkoutSession = {
  id: string;
  templateId: string | null;
  templateName: string;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: SessionStatus;
  exercises: SessionExercise[];
  totalVolume: number;
  totalSets: number;
  duration: number;
  notes: string;
  rating: number | null;
  isBareMinimum?: boolean;
  bareMinimumTimeCap?: number;
  originalTotalSets?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WorkoutSessionInput = Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>;
