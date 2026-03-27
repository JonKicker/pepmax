/**
 * Body Model constants — zone definitions, mapping tables, and scoring parameters.
 *
 * Design decisions (for Ray):
 * - DEFAULT_RECOVERY_MULTIPLIER = 1.0 (neutral): used when no recovery check-in exists
 *   for the target date. Prevents division-by-zero in the recovery curve formula
 *   (effectiveHours = baseHours / multiplier).
 * - BASE_FATIGUE_PER_SET = 6: midpoint of spec range "5–7 points at RPE 8 on primary muscle"
 * - MUSCLE_GROUP_TO_ZONES: maps the 12 existing MuscleGroup tags to the 13 spec zones.
 *   Back splits 60/40 (lats dominate most back exercises), Shoulders splits 60/40 (front
 *   delts are typically heavier loaded). Full Body distributes across 5 major zones at 20% each.
 * - ZONE_WEIGHTS sum to exactly 1.000: verified below.
 *   Systems: 0.55 total (CNS 0.15 + Cardio 0.12 + Metabolic 0.10 + Immune 0.10 + GI 0.08)
 *   Muscles: 0.45 total (major ×5 = 0.225, standard ×6 = 0.210, minor ×2 = 0.015)
 */

import type { MuscleGroup } from '../types/exercise';
import type { MusculoskeletalZone, SystemZone } from '../types/bodyModel';

// ─── Recovery defaults ────────────────────────────────────────────────────────

/** Neutral recovery multiplier — used when the user has no check-in for the target date. */
export const DEFAULT_RECOVERY_MULTIPLIER = 1.0;

/** Extra fatigue applied to compound exercises (multi-joint, high systemic demand). */
export const COMPOUND_EXERCISE_MODIFIER = 1.2;

// ─── Lookback windows ─────────────────────────────────────────────────────────

/** Days of workout history to include in fatigue accumulation. */
export const FATIGUE_LOOKBACK_DAYS = 14;

/** Maximum date range allowed by getBodyModelRange to prevent large reads. */
export const BODY_MODEL_MAX_RANGE_DAYS = 90;

// ─── Fatigue parameters ───────────────────────────────────────────────────────

/**
 * Base score drop per completed set at RPE 8 on a primary muscle (spec midpoint).
 * Combined with rpeMultiplier and zone contribution weight per set.
 */
export const BASE_FATIGUE_PER_SET = 6;

/**
 * RPE → fatigue multiplier table (spec §3.1).
 * Null / missing RPE falls back to 1.0 (RPE 8 equivalent) in rpeMultiplier().
 */
export const RPE_MULTIPLIERS: Record<number, number> = {
  6: 0.7,
  7: 0.85,
  8: 1.0,
  9: 1.2,
  10: 1.5,
};

// ─── Recovery time constants ──────────────────────────────────────────────────

/**
 * Base hours for each zone to reach ~63% recovery (exponential time constant τ).
 * Modified by recoveryMultiplier: effectiveHours = baseHours / recoveryMultiplier.
 * Higher multiplier → faster recovery. Lower → slower.
 */
export const BASE_RECOVERY_HOURS: Record<MusculoskeletalZone, number> = {
  chest: 48,
  frontDelts: 48,
  rearDeltsTraps: 48,
  latsUpperBack: 60,
  biceps: 36,
  triceps: 36,
  forearms: 24,
  coreAbs: 24,
  lowerBackErectors: 72,   // slowest-recovering zone (spinal erectors)
  quads: 72,
  hamstrings: 72,
  glutes: 60,
  calves: 36,
};

// ─── MuscleGroup → zone contributions ────────────────────────────────────────

export type ZoneContribution = {
  zone: MusculoskeletalZone;
  /** Proportion of set fatigue allocated to this zone (weights sum to 1.0 per MuscleGroup). */
  weight: number;
};

/**
 * Maps existing MuscleGroup tags to Body Model zones.
 * Where a MuscleGroup spans multiple zones, fatigue is split by weight.
 */
export const MUSCLE_GROUP_TO_ZONES: Record<MuscleGroup, ZoneContribution[]> = {
  Chest: [{ zone: 'chest', weight: 1.0 }],
  Back: [
    { zone: 'latsUpperBack', weight: 0.6 },
    { zone: 'lowerBackErectors', weight: 0.4 },
  ],
  Shoulders: [
    { zone: 'frontDelts', weight: 0.6 },
    { zone: 'rearDeltsTraps', weight: 0.4 },
  ],
  Biceps: [{ zone: 'biceps', weight: 1.0 }],
  Triceps: [{ zone: 'triceps', weight: 1.0 }],
  Forearms: [{ zone: 'forearms', weight: 1.0 }],
  Quads: [{ zone: 'quads', weight: 1.0 }],
  Hamstrings: [{ zone: 'hamstrings', weight: 1.0 }],
  Glutes: [{ zone: 'glutes', weight: 1.0 }],
  Calves: [{ zone: 'calves', weight: 1.0 }],
  Core: [{ zone: 'coreAbs', weight: 1.0 }],
  Traps: [{ zone: 'rearDeltsTraps', weight: 1.0 }],
  Adductors: [{ zone: 'hamstrings', weight: 0.5 }, { zone: 'glutes', weight: 0.5 }],
  Abductors: [{ zone: 'glutes', weight: 0.6 }, { zone: 'hamstrings', weight: 0.4 }],
  'Full Body': [
    // Distribute across the 5 largest muscle groups at equal weight
    { zone: 'chest', weight: 0.2 },
    { zone: 'latsUpperBack', weight: 0.2 },
    { zone: 'quads', weight: 0.2 },
    { zone: 'hamstrings', weight: 0.2 },
    { zone: 'coreAbs', weight: 0.2 },
  ],
};

// ─── Synergy Score zone weights ───────────────────────────────────────────────

/**
 * Weights for the weighted-average Synergy Score (spec §4.2).
 * Sum = 1.000 exactly:
 *   Systems:  0.15 + 0.12 + 0.10 + 0.10 + 0.08 = 0.55
 *   Muscles:  (chest + latsUpperBack + quads + hamstrings + glutes) × 0.045 = 0.225
 *             (frontDelts + rearDeltsTraps + triceps + biceps + coreAbs + lowerBack) × 0.035 = 0.210
 *             (forearms + calves) × 0.0075 = 0.015
 *   Total:    0.55 + 0.225 + 0.210 + 0.015 = 1.000
 */
export const ZONE_WEIGHTS: Record<MusculoskeletalZone | SystemZone, number> = {
  // Body systems (55% — systems affect whole-body performance; one depleted system affects everything)
  nervousSystem: 0.15,
  cardiovascular: 0.12,
  metabolic: 0.10,
  immune: 0.10,
  gastrointestinal: 0.08,

  // Major muscle groups: large, frequently trained, strongly influence overall readiness (0.045 each)
  chest: 0.045,
  latsUpperBack: 0.045,
  quads: 0.045,
  hamstrings: 0.045,
  glutes: 0.045,

  // Standard muscle groups (0.035 each)
  frontDelts: 0.035,
  rearDeltsTraps: 0.035,
  triceps: 0.035,
  biceps: 0.035,
  coreAbs: 0.035,
  lowerBackErectors: 0.035,

  // Minor muscle groups: smaller, faster-recovering, lower overall impact (0.0075 each)
  forearms: 0.0075,
  calves: 0.0075,
};
