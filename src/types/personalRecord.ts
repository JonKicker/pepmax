import type { MuscleGroup } from './exercise';

// ─── PR Types ───────────────────────────────────────────────────────────────

export type PRType = 'weight' | 'volume' | 'reps' | 'estimated1RM';

export type PREntry = {
  value: number;
  unit: 'lbs' | 'kg';
  reps?: number;
  date: string;         // YYYY-MM-DD via toLocalDateKey()
  sessionId: string;
};

export type RepPREntry = {
  reps: number;
  unit: 'lbs' | 'kg';
  date: string;
  sessionId: string;
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  weightPR: PREntry | null;
  volumePR: PREntry | null;
  repPRs: Record<string, RepPREntry>;  // key = weight as string (e.g., "135")
  estimated1RM: PREntry | null;
  updatedAt?: any;
};

export type PRDetectionResult = {
  isAnyPR: boolean;
  newRecords: PRType[];
  details: string[];    // human-readable: "New Weight PR: 185 lbs!"
};
