import type { Timestamp } from 'firebase/firestore';

export type RecoveryInput = {
  sleepHours: number;          // 0–12, 0.5 increments
  sleepQuality: number;        // 1–5
  muscleSoreness: number;      // 1–5 (1=None, 5=Very Severe)
  stressLevel: number;         // 1–5 (1=None, 5=Very High) — inverted in scoring
  overallReadiness: number;    // 0–10 (spec §8)
  notes: string;               // max 500 chars, truncated in service
  healthKitSynced: boolean;    // always false until HealthKit milestone
  restingHR?: number;          // HealthKit-sourced (future)
  hrv?: number;                // HealthKit-sourced (future)
  recoveryMultiplier: number;  // 0.5–1.5, feeds Body Model zone recovery curve
  readinessScore: number;      // 0–100, derived from multiplier for UI display
  timestamp: Timestamp;
  date: string;                // YYYY-MM-DD
};
