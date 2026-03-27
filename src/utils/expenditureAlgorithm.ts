/**
 * Adaptive TDEE estimation — pure functions, no side effects, no Firebase.
 *
 * The core insight: instead of estimating TDEE from formulas, we infer it
 * from reality. If a user eats 2000 kcal/day and loses 1 lb/week, their TDEE
 * must be ~2500 (2000 + 500 deficit). This removes the uncertainty of activity
 * multipliers and individual metabolic variation.
 *
 * Formula:
 *   actualDeficit = (weightLost_lbs × 3500) / numDays
 *   estimatedTDEE = avgDailyCalories + actualDeficit
 *
 * Weight is smoothed with an exponential moving average (alpha = 0.1) to
 * filter out daily water weight fluctuations before calculating the trend.
 */
import { kgToLbs } from './tdee';
import type { MacroTargets, Sex } from '../types/profile';
import type {
  WeightTrendPoint,
  AdaptiveTDEEResult,
  AdaptiveTargets,
  DataReadiness,
} from '../types/adaptiveCoaching';
import { applyGlp1Adjustments } from './glp1Nutrition';
import type { Glp1AdjustedTargets } from '../types/glp1Nutrition';

// ─── Safety floors ─────────────────────────────────────────────────────────
// Per blueprint requirements — never suggest below these thresholds.
const CALORIE_FLOOR_MALE = 1500;
const CALORIE_FLOOR_FEMALE = 1200;

// ─── EMA smoothing ─────────────────────────────────────────────────────────

/**
 * Smooth a weight series using exponential moving average.
 *
 * Alpha = 0.1 is intentionally low — it prioritises the established trend
 * over any single day's reading, which is important when water retention can
 * cause 2-3 lb swings overnight.
 *
 * @param entries  Weight entries sorted by date ascending, weight in kg.
 * @param alpha    Smoothing factor 0–1. Higher = more reactive to new data.
 */
export function smoothWeight(
  entries: { date: string; kg: number }[],
  alpha = 0.1,
): WeightTrendPoint[] {
  if (entries.length === 0) return [];

  const result: WeightTrendPoint[] = [];
  let prevSmoothed = entries[0].kg; // seed with the first raw value

  for (const entry of entries) {
    const smoothed = alpha * entry.kg + (1 - alpha) * prevSmoothed;
    result.push({ date: entry.date, rawKg: entry.kg, smoothedKg: smoothed });
    prevSmoothed = smoothed;
  }

  return result;
}

// ─── Adaptive TDEE calculation ─────────────────────────────────────────────

/**
 * Estimate the user's true TDEE from their real weight and calorie data.
 *
 * Requires at least 7 days of data where BOTH a weight entry and a food log
 * entry exist. Uses the last `periodDays` of overlap for the calculation.
 */
export function calculateAdaptiveTDEE(
  weightTrend: WeightTrendPoint[],
  dailyCalories: { date: string; calories: number }[],
  periodDays = 14,
): AdaptiveTDEEResult | null {
  // Build a lookup of dates that have calorie data
  const calLookup = new Map(dailyCalories.map((d) => [d.date, d.calories]));

  // Keep only trend points that also have calorie data
  const overlapping = weightTrend.filter((p) => calLookup.has(p.date));

  if (overlapping.length < 7) return null;

  // Take the most recent `periodDays` qualifying days
  const window = overlapping.slice(-Math.min(periodDays, overlapping.length));
  const numDays = window.length;

  // Weight change over the window (smoothed to remove noise)
  const firstSmoothed = window[0].smoothedKg;
  const lastSmoothed = window[numDays - 1].smoothedKg;
  const weightChangeLbs = kgToLbs(lastSmoothed - firstSmoothed);
  const weightChangeKgPerWeek = ((lastSmoothed - firstSmoothed) / numDays) * 7;

  // Total caloric deficit implied by weight change.
  // 3500 kcal ≈ 1 lb body mass (conventional approximation).
  // weightChangeLbs is negative when losing (last - first), so we negate it:
  // weight loss → positive deficit → TDEE > intake.
  // weight gain → negative deficit → TDEE < intake.
  const actualDeficit = (-weightChangeLbs * 3500) / numDays;

  const avgDailyCalories =
    window.reduce((sum, p) => sum + (calLookup.get(p.date) ?? 0), 0) / numDays;

  let estimatedTDEE = Math.round(avgDailyCalories + actualDeficit);

  // Clamp to physiologically plausible range.
  // Outside 800–6000 almost certainly indicates data quality issues.
  estimatedTDEE = Math.max(800, Math.min(6000, estimatedTDEE));

  const confidence: AdaptiveTDEEResult['confidence'] =
    numDays >= 14 ? 'high' : numDays >= 10 ? 'medium' : 'low';

  return {
    estimatedTDEE,
    avgDailyCalories: Math.round(avgDailyCalories),
    weightChangeKgPerWeek,
    confidence,
    daysOfData: numDays,
  };
}

// ─── Target generation ─────────────────────────────────────────────────────

/**
 * GLP-1 override shape passed to generateTargets when an active GLP-1 cycle
 * is detected. The hook resolves this from the user profile; the service
 * passes it through transparently.
 */
export type Glp1Override = {
  /** Minimum protein floor in grams (from calculateProteinFloorG) */
  proteinFloorG: number;
};

/**
 * Convert an estimated TDEE into a concrete calorie + macro target.
 *
 * Goal offsets match what the user selected in Nutrition Settings:
 *   lose     → −500 kcal/day (~1 lb/week loss)
 *   maintain → ±0
 *   gain     → +250 kcal/day (~0.5 lb/week gain)
 *
 * Hard floors are enforced after the offset to prevent dangerous deficits.
 * If the floor kicks in, we surface a warning so the UI can inform the user.
 *
 * When `glp1Override` is provided, GLP-1-specific protein and calorie floors
 * are applied on top of the standard logic. This param is optional and
 * undefined by default — all existing call sites are unaffected.
 */
export function generateTargets(
  estimatedTDEE: number,
  goalType: 'lose' | 'maintain' | 'gain',
  sex: Sex,
  macroPcts?: { proteinPct: number; carbsPct: number; fatPct: number },
  glp1Override?: Glp1Override,
): AdaptiveTargets {
  const GOAL_OFFSETS: Record<typeof goalType, number> = {
    lose: -500,
    maintain: 0,
    gain: 250,
  };

  const floor = sex === 'male' ? CALORIE_FLOOR_MALE : CALORIE_FLOOR_FEMALE;

  let calorieTarget = estimatedTDEE + GOAL_OFFSETS[goalType];

  let floorApplied = false;
  let floorWarning: string | undefined;

  // The sex-based minimum floor is the only guardrail needed for the current goal
  // offsets (lose = -500 = MAX_DEFICIT, maintain = 0, gain = +250). If new goal
  // types with larger offsets are added in future, add a MAX_DEFICIT clamp here.
  if (calorieTarget < floor) {
    calorieTarget = floor;
    floorApplied = true;
    floorWarning = `Target raised to ${floor} kcal — the recommended minimum for ${sex === 'male' ? 'men' : 'women'}.`;
  }

  const macros = buildMacros(calorieTarget, macroPcts);

  // Apply GLP-1 guardrails when an active cycle was detected upstream.
  // This runs AFTER the standard floor clamp so we layer the adjustments.
  if (glp1Override) {
    const glp1: Glp1AdjustedTargets = applyGlp1Adjustments(
      calorieTarget,
      macros.proteinG,
      macros.carbsG,
      macros.fatG,
      glp1Override.proteinFloorG,
      sex,
    );

    const adjustedMacros: MacroTargets = {
      ...macros,
      proteinG: glp1.proteinG,
      carbsG: glp1.carbsG,
      fatG: glp1.fatG,
    };

    return {
      calorieTarget: glp1.calorieTarget,
      macros: adjustedMacros,
      tdee: estimatedTDEE,
      floorApplied: floorApplied || glp1.calorieFloorApplied,
      floorWarning: glp1.calorieFloorApplied
        ? `GLP-1 calorie floor applied (${sex === 'male' ? 1600 : 1400} kcal).`
        : floorWarning,
      glp1ProteinFloorApplied: glp1.proteinFloorApplied,
      glp1CalorieFloorApplied: glp1.calorieFloorApplied,
      glp1ProteinFloorG: glp1Override.proteinFloorG,
    };
  }

  return { calorieTarget, macros, tdee: estimatedTDEE, floorApplied, floorWarning };
}

function buildMacros(
  calorieTarget: number,
  pcts?: { proteinPct: number; carbsPct: number; fatPct: number },
): MacroTargets {
  // Use user's current percentage split if available, else fall back to 30/40/30.
  const proteinPct = pcts?.proteinPct ?? 30;
  const carbsPct = pcts?.carbsPct ?? 40;
  const fatPct = pcts?.fatPct ?? 30;

  return {
    proteinG: Math.round((calorieTarget * (proteinPct / 100)) / 4),
    carbsG: Math.round((calorieTarget * (carbsPct / 100)) / 4),
    fatG: Math.round((calorieTarget * (fatPct / 100)) / 9),
    proteinPct,
    carbsPct,
    fatPct,
  };
}

// ─── Utility helpers ────────────────────────────────────────────────────────

/**
 * How many days until the next scheduled check-in.
 * Returns 0 or negative when a check-in is due.
 *
 * Uses YYYY-MM-DD string comparison to avoid the UTC-vs-local pitfall:
 * `new Date("2026-03-23")` parses as UTC midnight, making day-diff calculations
 * wrong for users in non-UTC timezones. We add `intervalDays` calendar days to
 * the last check-in date string and compare against today's local date string.
 */
export function daysUntilNextCheckIn(
  lastCheckInDate: string | null,
  intervalDays: number,
): number {
  if (!lastCheckInDate) return 0; // Never had a check-in → due immediately

  // Add intervalDays to the last check-in date (YYYY-MM-DD + N days)
  const [year, month, day] = lastCheckInDate.split('-').map(Number);
  const nextCheckIn = new Date(year, month - 1, day + intervalDays); // local time
  const today = new Date();

  // Strip time — compare calendar days in local timezone
  today.setHours(0, 0, 0, 0);
  nextCheckIn.setHours(0, 0, 0, 0);

  const diffMs = nextCheckIn.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if the user has enough overlapping weight + nutrition data to run
 * the adaptive algorithm.
 *
 * A "qualifying day" requires BOTH a weight entry AND at least one food log.
 */
export function hasEnoughData(
  weightDates: string[],
  nutritionDates: string[],
  minDays = 7,
): DataReadiness {
  const nutritionSet = new Set(nutritionDates);
  const daysWithBothData = weightDates.filter((d) => nutritionSet.has(d)).length;

  return {
    ready: daysWithBothData >= minDays,
    daysWithBothData,
    daysNeeded: minDays,
  };
}
