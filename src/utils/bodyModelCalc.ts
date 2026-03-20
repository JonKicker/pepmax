/**
 * Body Model calculation — pure functions only.
 * No Firebase imports, no React imports, no side effects.
 *
 * Scoring overview:
 *  - Musculoskeletal zones: fatigue-and-recovery model (spec §3.1)
 *    Each logged set subtracts points from the zone. Recovery curve restores points over time.
 *    Formula: recoveryProgress = 1 - e^(-hoursElapsed / (baseHours / recoveryMultiplier))
 *  - Body systems: Phase 1 approximations from available data (spec §3.2)
 *    Each system has inline comments marking enhancement targets for future milestones.
 *  - Synergy Score: weighted average of all 18 zones + spec §4.4 bonuses/penalties
 *
 * Ray's conditional approval design decisions baked in:
 *  1. DEFAULT_RECOVERY_MULTIPLIER = 1.0 used when no check-in exists — prevents division by zero.
 *  2. All data-source failures are handled upstream (bodyModelService) — this file receives
 *     safe defaults and never needs to handle null inputs.
 */

import type { MuscleGroup } from '../types/exercise';
import type { WorkoutSession } from '../types/workout';
import type { CardioSession } from '../types/cardio';
import type {
  MuscleZoneScores,
  SystemZoneScores,
  BodyModelBonuses,
  MusculoskeletalZone,
} from '../types/bodyModel';
import {
  BASE_RECOVERY_HOURS,
  BASE_FATIGUE_PER_SET,
  RPE_MULTIPLIERS,
  MUSCLE_GROUP_TO_ZONES,
  DEFAULT_RECOVERY_MULTIPLIER,
  FATIGUE_LOOKBACK_DAYS,
  ZONE_WEIGHTS,
} from '../constants/bodyModel';

// ─── RPE multiplier ───────────────────────────────────────────────────────────

/**
 * Convert RPE to fatigue multiplier per spec §3.1.
 * Clamps to [6, 10] range; null/missing RPE defaults to 1.0 (RPE 8 equivalent).
 */
function rpeMultiplier(rpe: number | null): number {
  if (rpe === null || !isFinite(rpe)) return 1.0;
  const clamped = Math.max(6, Math.min(10, Math.round(rpe)));
  return RPE_MULTIPLIERS[clamped] ?? 1.0;
}

// ─── Fatigue events ───────────────────────────────────────────────────────────

type FatigueEvent = {
  trainedAt: Date;
  fatigueDrop: number; // raw points before recovery applied
};

/**
 * Extract fatigue events for a single zone from workout sessions.
 * Only sessions within the lookback window and before referenceDate are included.
 * Only completed sets contribute fatigue.
 */
function buildFatigueEvents(
  sessions: WorkoutSession[],
  zone: MusculoskeletalZone,
  referenceDate: Date,
): FatigueEvent[] {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - FATIGUE_LOOKBACK_DAYS);

  const events: FatigueEvent[] = [];

  for (const session of sessions) {
    const sessionDate = session.startedAt.toDate();
    if (sessionDate < cutoff || sessionDate > referenceDate) continue;

    for (const ex of session.exercises) {
      const contributions = MUSCLE_GROUP_TO_ZONES[ex.primaryMuscle as MuscleGroup];
      if (!contributions) continue;

      const zoneContrib = contributions.find((c) => c.zone === zone);
      if (!zoneContrib) continue;

      for (const set of ex.sets) {
        if (!set.completed) continue;
        const drop = BASE_FATIGUE_PER_SET * rpeMultiplier(set.rpe) * zoneContrib.weight;
        events.push({ trainedAt: sessionDate, fatigueDrop: drop });
      }
    }
  }

  return events;
}

// ─── Recovery curve ───────────────────────────────────────────────────────────

/**
 * Fraction of fatigue recovered after hoursElapsed, given zone base hours and recovery multiplier.
 *
 * Formula (spec §3.1):
 *   recoveryProgress = 1 - e^(-hoursElapsed / effectiveHours)
 *   effectiveHours = baseHours / recoveryMultiplier
 *
 * Higher multiplier → smaller effectiveHours → faster recovery.
 * Uses DEFAULT_RECOVERY_MULTIPLIER if multiplier is zero/invalid (prevents division by zero).
 */
function recoveryFraction(hoursElapsed: number, baseHours: number, recoveryMultiplier: number): number {
  const safeMult = recoveryMultiplier > 0 ? recoveryMultiplier : DEFAULT_RECOVERY_MULTIPLIER;
  const effectiveHours = baseHours / safeMult;
  return 1 - Math.exp(-hoursElapsed / effectiveHours);
}

// ─── Single zone score ────────────────────────────────────────────────────────

/**
 * Compute 0–100 score for one muscle zone.
 * Score = 100 − remaining fatigue (fatigue still not yet recovered from all events).
 * No sessions in the lookback window → score is 100 (fully rested).
 */
function computeZoneScore(
  events: FatigueEvent[],
  referenceDate: Date,
  baseHours: number,
  recoveryMultiplier: number,
): number {
  let remainingFatigue = 0;
  for (const event of events) {
    const hoursElapsed = (referenceDate.getTime() - event.trainedAt.getTime()) / 3_600_000;
    const recovered = recoveryFraction(hoursElapsed, baseHours, recoveryMultiplier);
    remainingFatigue += event.fatigueDrop * (1 - recovered);
  }
  return Math.max(0, Math.min(100, Math.round(100 - remainingFatigue)));
}

// ─── All 13 muscle zones ──────────────────────────────────────────────────────

/**
 * Compute scores for all 13 musculoskeletal zones.
 * Sessions with no overlap with a zone leave that zone at 100.
 */
export function computeAllMuscleZones(
  sessions: WorkoutSession[],
  recoveryMultiplier: number,
  referenceDate: Date,
): MuscleZoneScores {
  const zones = Object.keys(BASE_RECOVERY_HOURS) as MusculoskeletalZone[];
  const result = {} as MuscleZoneScores;
  for (const zone of zones) {
    const events = buildFatigueEvents(sessions, zone, referenceDate);
    result[zone] = computeZoneScore(
      events,
      referenceDate,
      BASE_RECOVERY_HOURS[zone],
      recoveryMultiplier,
    );
  }
  return result;
}

// ─── System score inputs ──────────────────────────────────────────────────────

export type SystemScoreInputs = {
  recoveryMultiplier: number;        // from today's recovery check-in (or DEFAULT_RECOVERY_MULTIPLIER)
  sleepHours: number;                // from today's recovery check-in (or 7 as neutral default)
  stressLevel: number;               // 1–5 from today's check-in (or 1 as neutral default)
  recentCardioSessions: CardioSession[];   // completed cardio sessions (unfiltered; date window applied internally)
  recentWorkoutSessions: WorkoutSession[]; // completed workout sessions (unfiltered; date window applied internally)
  nutritionAdherence: number | null; // 0–1 fraction of calorie target met; null if no nutrition data
  referenceDate: Date;               // target date for computation — use instead of Date.now() for historical correctness
};

// ─── CNS score ────────────────────────────────────────────────────────────────

/**
 * CNS / nervous system score — Phase 1.
 * Reflects accumulated CNS fatigue from recent training load, stress, and recovery quality.
 *
 * Enhancement target: incorporate HRV trend from HealthKit (currently in recoveryInput.hrv
 * but not yet wired into system scoring).
 */
export function computeCNSScore(inputs: SystemScoreInputs): number {
  const { recoveryMultiplier, stressLevel, recentWorkoutSessions, referenceDate } = inputs;

  // Only sessions from the past 7 days relative to referenceDate matter for acute CNS load
  const acuteSessions = recentWorkoutSessions.filter((s) => {
    const daysAgo = (referenceDate.getTime() - s.startedAt.toDate().getTime()) / 86_400_000;
    return daysAgo >= 0 && daysAgo <= 7;
  });

  const totalSets = acuteSessions.reduce((sum, s) => sum + (s.totalSets ?? 0), 0);
  // Each set contributes ~0.8 CNS load points; deduction capped at 50
  const loadDeduction = Math.min(50, totalSets * 0.8);

  // Stress: 1 (none) → 0 deduction; 5 (very high) → 20 deduction
  const stressDeduction = (Math.min(5, Math.max(1, stressLevel)) - 1) * 5;

  // Recovery multiplier: 1.5 (great) → +15 bonus; 0.5 (poor) → −15 penalty
  const recoveryBonus = (recoveryMultiplier - 1.0) * 30;

  return Math.max(0, Math.min(100, Math.round(100 - loadDeduction - stressDeduction + recoveryBonus)));
}

// ─── Cardiovascular score ─────────────────────────────────────────────────────

/**
 * Cardiovascular score — Phase 1.
 * Reflects recent aerobic activity. No cardio data → neutral 70.
 *
 * Enhancement target: incorporate resting HR trend from HealthKit and
 * pace-at-HR efficiency metric (spec §6.4).
 */
export function computeCardiovascularScore(inputs: SystemScoreInputs): number {
  const { recentCardioSessions, recoveryMultiplier, referenceDate } = inputs;

  // Filter to the 14-day window relative to referenceDate (not wall-clock time)
  const msPerDay = 86_400_000;
  const windowSessions = recentCardioSessions.filter((s) => {
    const endedAt = s.endedAt?.toDate();
    if (!endedAt) return false;
    const daysAgo = (referenceDate.getTime() - endedAt.getTime()) / msPerDay;
    return daysAgo >= 0 && daysAgo <= 14;
  });

  if (windowSessions.length === 0) return 70; // neutral: no cardio in the window

  // Each session contributes points based on duration; cap per session at 18pts
  const totalPoints = windowSessions.reduce((sum, s) => {
    const minutes = (s.duration ?? 0) / 60;
    return sum + Math.min(18, Math.round(minutes * 0.25));
  }, 0);

  const base = Math.min(100, 60 + totalPoints);
  const recoveryBonus = (recoveryMultiplier - 1.0) * 10;
  return Math.max(0, Math.min(100, Math.round(base + recoveryBonus)));
}

// ─── Metabolic score ─────────────────────────────────────────────────────────

/**
 * Metabolic score — Phase 1.
 * Reflects calorie adherence. No nutrition data → neutral 70.
 *
 * Enhancement target: incorporate protein adherence and meal timing (spec §6.3).
 */
export function computeMetabolicScore(inputs: SystemScoreInputs): number {
  const { nutritionAdherence } = inputs;
  if (nutritionAdherence === null) return 70; // neutral: no nutrition logged
  // Adherence 0.0 → 40, 1.0 → 100 (linear)
  return Math.max(0, Math.min(100, Math.round(40 + nutritionAdherence * 60)));
}

// ─── GI score ────────────────────────────────────────────────────────────────

/**
 * GI / gastrointestinal score — Phase 1 placeholder.
 * Hardcoded to 90 (healthy baseline) until side-effect log integration.
 *
 * Enhancement target: subtract points for GI-type entries in sideEffectsService
 * (nausea, bloating, cramping) correlated with peptide injection timing (spec §6.1).
 */
export function computeGIScore(_inputs: SystemScoreInputs): number {
  return 90;
}

// ─── Immune score ─────────────────────────────────────────────────────────────

/**
 * Immune / inflammation score — Phase 1.
 * Inferred from sleep and stress (best proxies available without blood markers).
 *
 * Enhancement target: incorporate micronutrient averages from nutrition module (spec §6.3).
 */
export function computeImmuneScore(inputs: SystemScoreInputs): number {
  const { sleepHours, stressLevel, recoveryMultiplier } = inputs;

  // Sleep: optimal ~8h. Each hour below 8 deducts, each above adds (up to +10)
  const sleepFactor = Math.min(10, Math.max(-20, (sleepHours - 8) * 4));

  // Stress: 1 (none) → 0 deduction; 5 (very high) → −15
  const stressFactor = -(Math.min(5, Math.max(1, stressLevel)) - 1) * 3.75;

  // Recovery multiplier: 1.5 → +10 bonus; 0.5 → −10
  const recoveryBonus = (recoveryMultiplier - 1.0) * 20;

  return Math.max(0, Math.min(100, Math.round(75 + sleepFactor + stressFactor + recoveryBonus)));
}

// ─── All 5 system scores ──────────────────────────────────────────────────────

export function computeAllSystemScores(inputs: SystemScoreInputs): SystemZoneScores {
  return {
    nervousSystem: computeCNSScore(inputs),
    cardiovascular: computeCardiovascularScore(inputs),
    metabolic: computeMetabolicScore(inputs),
    gastrointestinal: computeGIScore(inputs),
    immune: computeImmuneScore(inputs),
  };
}

// ─── Bonuses and penalties (spec §4.4) ───────────────────────────────────────

/**
 * Compute Synergy Score modifier bonuses/penalties.
 *
 * @param systems - Computed system zone scores
 * @param hasConsistencyBonus - True if user logged data on 5+ of last 7 days
 * @param acuteChronicRatio - Combined gym + cardio acute:chronic workload ratio
 */
export function computeBonuses(
  systems: SystemZoneScores,
  hasConsistencyBonus: boolean,
  acuteChronicRatio: number,
): BodyModelBonuses {
  const systemScores = Object.values(systems);
  const minSystem = Math.min(...systemScores);
  // Balance bonus: no system below 30, and at least 4 of 5 systems above 70
  const systemsAbove70 = systemScores.filter((s) => s > 70).length;
  const hasBalance = minSystem >= 30 && systemsAbove70 >= 4;

  return {
    consistency: hasConsistencyBonus ? 5 : 0,
    balance: hasBalance ? 3 : 0,
    bottleneck: minSystem < 20 ? -5 : 0,
    overtraining: acuteChronicRatio > 1.5 ? -3 : 0,
  };
}

// ─── Synergy Score ────────────────────────────────────────────────────────────

/**
 * Compute the composite Synergy Score (0–100) from all zone scores and bonuses.
 * Uses ZONE_WEIGHTS from constants (summing to exactly 1.0).
 */
export function computeSynergyScore(
  muscles: MuscleZoneScores,
  systems: SystemZoneScores,
  bonuses: BodyModelBonuses,
): number {
  const allZones: Record<string, number> = { ...muscles, ...systems };

  let weighted = 0;
  for (const [zone, weight] of Object.entries(ZONE_WEIGHTS)) {
    const score = allZones[zone] ?? 70; // defensive fallback for any unexpected missing zone
    weighted += score * weight;
  }

  const bonusTotal =
    bonuses.consistency + bonuses.balance + bonuses.bottleneck + bonuses.overtraining;

  return Math.max(0, Math.min(100, Math.round(weighted + bonusTotal)));
}

// ─── Acute:chronic workload ratio ────────────────────────────────────────────

/**
 * Compute the acute:chronic workload ratio for the overtraining penalty.
 * Acute = total sets in last 7 days.
 * Chronic = average weekly sets over last 28 days.
 * Returns 0 when chronic load is zero (no training history) — avoids division by zero.
 */
export function computeAcuteChronicRatio(
  workoutSessions: WorkoutSession[],
  cardioSessions: CardioSession[],
  referenceDate: Date,
): number {
  const msPerDay = 86_400_000;

  // Gym load: total sets per window
  const gymAcute = workoutSessions
    .filter((s) => { const d = (referenceDate.getTime() - s.startedAt.toDate().getTime()) / msPerDay; return d >= 0 && d <= 7; })
    .reduce((sum, s) => sum + (s.totalSets ?? 0), 0);

  const gymChronic28 = workoutSessions
    .filter((s) => { const d = (referenceDate.getTime() - s.startedAt.toDate().getTime()) / msPerDay; return d >= 0 && d <= 28; })
    .reduce((sum, s) => sum + (s.totalSets ?? 0), 0);

  // Cardio load: each minute of cardio = 1 "set equivalent" for ratio purposes
  const cardioAcute = cardioSessions
    .filter((s) => {
      const endedAt = s.endedAt?.toDate();
      if (!endedAt) return false;
      const d = (referenceDate.getTime() - endedAt.getTime()) / msPerDay;
      return d >= 0 && d <= 7;
    })
    .reduce((sum, s) => sum + Math.round((s.duration ?? 0) / 60), 0);

  const cardioChronic28 = cardioSessions
    .filter((s) => {
      const endedAt = s.endedAt?.toDate();
      if (!endedAt) return false;
      const d = (referenceDate.getTime() - endedAt.getTime()) / msPerDay;
      return d >= 0 && d <= 28;
    })
    .reduce((sum, s) => sum + Math.round((s.duration ?? 0) / 60), 0);

  const acute = gymAcute + cardioAcute;
  const chronicWeeklyAvg = (gymChronic28 + cardioChronic28) / 4; // 28 days / 4 weeks

  if (chronicWeeklyAvg === 0) return 0; // no training history — no overtraining possible
  return acute / chronicWeeklyAvg;
}

// ─── Consistency bonus check ──────────────────────────────────────────────────

/**
 * Returns true if the user has logged any activity on 5 or more of the past 7 days
 * (relative to referenceDate). Activity = any completed workout or cardio session.
 * Used for the +5 Synergy Score consistency bonus (spec §4.4).
 */
export function hasConsistencyBonus(
  workoutSessions: WorkoutSession[],
  cardioSessions: CardioSession[],
  referenceDate: Date,
): boolean {
  const msPerDay = 86_400_000;
  const activeDays = new Set<string>();

  for (const s of workoutSessions) {
    const daysAgo = (referenceDate.getTime() - s.startedAt.toDate().getTime()) / msPerDay;
    if (daysAgo >= 0 && daysAgo <= 7) {
      activeDays.add(s.startedAt.toDate().toDateString());
    }
  }
  for (const s of cardioSessions) {
    const endedAt = s.endedAt?.toDate();
    if (!endedAt) continue;
    const daysAgo = (referenceDate.getTime() - endedAt.getTime()) / msPerDay;
    if (daysAgo >= 0 && daysAgo <= 7) {
      activeDays.add(endedAt.toDateString());
    }
  }

  return activeDays.size >= 5;
}
