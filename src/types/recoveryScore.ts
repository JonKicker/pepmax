/**
 * Recovery Readiness Score types.
 *
 * The score system synthesizes HealthKit data (sleep, HRV, RHR),
 * training load, nutrition adherence, and a subjective morning check-in
 * into a 0–100 composite score with zone-based recommendations.
 */
import type { Timestamp } from 'firebase/firestore';

// ─── Zones ──────────────────────────────────────────────────────────────────

export type RecoveryZone = 'green' | 'yellow' | 'orange' | 'red';

// ─── Sub-scores & weights ───────────────────────────────────────────────────

export type RecoverySubScores = {
  sleep: number | null;         // 0–100, null if no sleep data
  hrv: number | null;           // 0–100, null if no HRV/RHR data
  trainingLoad: number;         // 0–100 (always available; 0 ratio → 70)
  nutrition: number | null;     // 0–100, null if no nutrition data
  subjective: number;           // 0–100 (always available after check-in)
};

export type RecoverySubScoreWeights = {
  sleep: number;
  hrv: number;
  trainingLoad: number;
  nutrition: number;
  subjective: number;
};

// ─── Breakdown entry (for display) ──────────────────────────────────────────

export type ScoreBreakdownEntry = {
  category: string;
  subScore: number;
  weight: number;
  available: boolean;
};

// ─── Result ─────────────────────────────────────────────────────────────────

export type RecoveryScoreResult = {
  score: number;                       // 0–100 composite
  zone: RecoveryZone;
  label: string;                       // "High Recovery" | "Moderate" | etc.
  subScores: RecoverySubScores;
  weights: RecoverySubScoreWeights;
  breakdown: ScoreBreakdownEntry[];
  recommendations: string[];
  recoveryMultiplier: number;          // 0.5–1.5, derived from score
};

// ─── Morning check-in input ─────────────────────────────────────────────────

export type MorningCheckInInput = {
  feelingRating: number;   // 1–5
  stress?: number;         // 1 (Low), 2 (Medium), 3 (High)
  notes?: string;
};

// ─── Score computation inputs ───────────────────────────────────────────────

export type RecoveryScoreInputs = {
  sleep?: { durationHours: number; deepSleepPct: number };
  hrv?: { value: number; thirtyDayAvg: number };
  restingHR?: { value: number; thirtyDayAvg: number };
  trainingLoad?: { acuteLoad: number; chronicLoad: number };
  nutrition?: { proteinHit: boolean; caloriesInRange: boolean };
  subjective?: { rating: number; stress?: number };
};

// ─── Firestore document shape ───────────────────────────────────────────────

export type RecoveryScoreDoc = {
  // New score fields
  recoveryScore: number;
  subScores: RecoverySubScores;
  weights: RecoverySubScoreWeights;
  zone: RecoveryZone;
  label: string;
  recommendations: string[];
  feelingRating: number;

  // HRV/RHR baseline tracking (EMA)
  hrvBaseline30d?: number;
  rhrBaseline30d?: number;

  // Preserved for Body Model backward compat
  recoveryMultiplier: number;
  notes: string;
  healthKitSynced: boolean;
  restingHR?: number;
  hrv?: number;
  timestamp: Timestamp;
  date: string;

  // Old fields (optional — absent on new-style check-ins)
  sleepHours?: number;
  sleepQuality?: number;
  soreness?: number;
  stress?: number;
  readiness?: number;
};
