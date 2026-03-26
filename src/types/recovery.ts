import type { Timestamp } from 'firebase/firestore';

export type RecoveryInput = {
  sleepHours: number;          // 0–12, 0.5 increments
  sleepQuality: number;        // 1–5
  soreness: number;            // 1–5 (1=None, 5=Very Severe)
  stress: number;              // 1–5 (1=None, 5=Very High) — inverted in scoring
  readiness: number;           // 1–5 (1=Very Low, 5=Very High)
  notes: string;               // max 500 chars, truncated in service
  healthKitSynced: boolean;    // always false until HealthKit milestone
  restingHR?: number;          // HealthKit-sourced (future)
  hrv?: number;                // HealthKit-sourced (future)
  recoveryMultiplier: number;  // 0.5–1.5, feeds Body Model zone recovery curve
  timestamp: Timestamp;
  date: string;                // YYYY-MM-DD
};
