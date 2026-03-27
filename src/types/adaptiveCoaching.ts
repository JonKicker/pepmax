import type { MacroTargets } from './profile';

// ─── Persistent coaching state (stored on UserProfile.adaptiveCoaching) ──────

export type AdaptiveCoachingState = {
  enabled: boolean;
  estimatedTDEE: number | null;
  lastCheckInDate: string | null;    // YYYY-MM-DD
  checkInIntervalDays: number;       // default 7
  dataStartDate: string | null;      // YYYY-MM-DD when user first enabled
  checkInHistory: AdaptiveCheckIn[]; // capped at 12 entries (FIFO)
};

// One record per completed check-in (accept or dismiss)
export type AdaptiveCheckIn = {
  date: string;                  // YYYY-MM-DD
  estimatedTDEE: number;
  recommendedTarget: number;
  accepted: boolean;
  weightTrendKgPerWeek: number;  // smoothed rate (negative = losing)
};

// ─── Algorithm data shapes ────────────────────────────────────────────────────

// One point in the smoothed weight trend series
export type WeightTrendPoint = {
  date: string;      // YYYY-MM-DD
  rawKg: number;
  smoothedKg: number;
};

// Output of calculateAdaptiveTDEE — describes what the algorithm found
export type AdaptiveTDEEResult = {
  estimatedTDEE: number;
  avgDailyCalories: number;
  weightChangeKgPerWeek: number; // negative = weight loss
  confidence: 'low' | 'medium' | 'high';
  daysOfData: number;
};

// Output of generateTargets — calorie + macro targets with guardrail metadata
export type AdaptiveTargets = {
  calorieTarget: number;
  macros: MacroTargets;
  tdee: number;
  floorApplied: boolean;    // true when a safety floor clamped the target
  floorWarning?: string;    // human-readable explanation shown in UI

  // ── GLP-1 context ──────────────────────────────────────────────────────────
  // Present when generateTargets was called with glp1Override. The UI uses
  // these to show which adjustments were applied and communicate the reasoning.
  glp1ProteinFloorApplied?: boolean;   // protein was raised to the GLP-1 floor
  glp1CalorieFloorApplied?: boolean;   // calories were raised to the GLP-1 floor
  glp1ProteinFloorG?: number;          // the floor value that was applied (g)
};

// ─── Readiness check ─────────────────────────────────────────────────────────

export type DataReadiness = {
  ready: boolean;
  daysWithBothData: number; // days with both weight + food log entry
  daysNeeded: number;       // 7
};
