import { Timestamp } from 'firebase/firestore';

export type ExerciseSet = {
  name: string;
  sets: number;
  reps?: number;
  weightKg?: number;
  durationMin?: number;
  notes?: string;
};

export type WorkoutLog = {
  id: string;
  date: string; // YYYY-MM-DD local — always via toLocalDateKey(), never toISOString()
  exercises: ExerciseSet[];
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WorkoutLogInput = Omit<WorkoutLog, 'id' | 'createdAt' | 'updatedAt'>;
