import { Timestamp } from 'firebase/firestore';
import type { MuscleGroup } from './exercise';

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
  order: number;
  supersetGroup: number | null;
  sets: SessionSet[];
  notes: string;
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WorkoutSessionInput = Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>;
