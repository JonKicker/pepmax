/**
 * @deprecated Use nutritionScorer.ts (scoreMealV2 / scoreDailyNutritionV2) for new features.
 * mealScore.ts is retained for backward compatibility with existing callers and tests.
 * It will be removed in a future release once all callsites are migrated.
 *
 * mealScore — pure scoring functions for per-meal nutrition quality (0-100).
 *
 * Sub-score weights (Ray-approved):
 *   Macro balance          40%  (50% when sodium data is unavailable)
 *   Protein density        25%
 *   Calorie appropriateness 25%
 *   Sodium moderation      10%  (0% / redistributed when data absent)
 *
 * All functions are pure — no I/O, no side effects, safe to call from useMemo.
 *
 * SODIUM HANDLING:
 *   FoodLogEntry.micronutrients.sodium is mg per 100g.
 *   Actual mg consumed = (sodium_per_100g * servingSize) / 100
 *   Only computed when servingUnit is "g" or "ml" (gram-equivalent).
 *   When servingUnit is something else (e.g., "oz", "cup"), that entry is skipped
 *   for sodium scoring — we degrade gracefully rather than penalize missing data.
 *
 * LIMITATION:
 *   Only the 4 default meal slots (breakfast, lunch, dinner, snacks) are scored.
 *   Custom slot entries appear in daily totals but do not receive per-meal scores.
 */

import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import { MEAL_SLOTS } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';
import {
  MEAL_SLOT_CALORIE_SPLIT,
  MealScoreBreakdown,
  MealScoreResult,
  DailyNutritionScore,
} from '../types/mealScore';
import { generateMealTips } from './mealTips';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Sodium penalty threshold in mg. Meals above this lose sodium score points. */
const SODIUM_PENALTY_THRESHOLD_MG = 800;

/**
 * Gram-equivalent serving units where sodium conversion is valid.
 * "ml" is treated as gram-equivalent (density ~1 for most foods/liquids).
 */
export const GRAM_UNITS = new Set(['g', 'ml', 'gram', 'grams', 'milliliter', 'millilitre', 'milliliters', 'millilitres']);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Clamps a value to [0, 100].
 */
function clamp100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Computes actual sodium consumed (mg) for a single entry.
 * Returns null when sodium data is unavailable or unit is not gram-equivalent.
 */
function computeEntrySodiumMg(entry: FoodLogEntry): number | null {
  const sodiumPer100g = entry.micronutrients?.sodium;
  if (sodiumPer100g == null) return null;

  const unit = (entry.servingUnit ?? '').toLowerCase().trim();
  if (!GRAM_UNITS.has(unit)) return null;

  return (sodiumPer100g * entry.servingSize) / 100;
}

/**
 * Scores macro balance for a meal vs. per-meal macro targets.
 * Returns 0-100. Perfect match = 100. Score degrades as each macro deviates
 * from its per-meal target (scaled by MEAL_SLOT_CALORIE_SPLIT fraction).
 */
function scoreMacroBalance(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  mealSlot: MealSlot,
): number {
  const split = MEAL_SLOT_CALORIE_SPLIT[mealSlot];
  const targetProtein = targets.proteinG * split;
  const targetCarbs = targets.carbsG * split;
  const targetFat = targets.fatG * split;

  const totalProtein = entries.reduce((s, e) => s + e.protein, 0);
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0);
  const totalFat = entries.reduce((s, e) => s + e.fat, 0);

  // Score each macro: 100 when on target, decays toward 0 as deviation grows.
  // We use a proportional deviation capped at 100% off.
  const scoreFor = (consumed: number, target: number): number => {
    if (target <= 0) return 100; // no target set — don't penalize
    const deviation = Math.abs(consumed - target) / target;
    return clamp100(100 - deviation * 100);
  };

  const proteinScore = scoreFor(totalProtein, targetProtein);
  const carbsScore = scoreFor(totalCarbs, targetCarbs);
  const fatScore = scoreFor(totalFat, targetFat);

  // Simple average of the three macros
  return (proteinScore + carbsScore + fatScore) / 3;
}

/**
 * Scores protein density — protein calories as % of total meal calories.
 * Higher is better, up to 40% (where score = 100). Below 40% score scales linearly.
 */
function scoreProteinDensity(entries: FoodLogEntry[]): number {
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  if (totalCal <= 0) return 0;

  const proteinCal = entries.reduce((s, e) => s + e.protein * 4, 0);
  const proteinPct = proteinCal / totalCal; // 0.0 - 1.0+

  // 40% protein calories = score 100. Linear below 40%.
  const TARGET_PCT = 0.40;
  return clamp100((proteinPct / TARGET_PCT) * 100);
}

/**
 * Scores calorie appropriateness — how close total meal calories are to the
 * per-slot calorie target (based on MEAL_SLOT_CALORIE_SPLIT).
 * ±10% of target = 100. Score decays linearly beyond that.
 */
function scoreCalorieAppropriateness(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  mealSlot: MealSlot,
): number {
  const split = MEAL_SLOT_CALORIE_SPLIT[mealSlot];
  const targetCal = targets.calorieTarget * split;
  if (targetCal <= 0) return 100;

  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  const deviation = Math.abs(totalCal - targetCal) / targetCal;

  // ±10% = perfect (score 100). Beyond that, decay linearly. 50%+ deviation = 0.
  const TOLERANCE = 0.10;
  if (deviation <= TOLERANCE) return 100;
  const excess = deviation - TOLERANCE;
  // Full decay range is from TOLERANCE to 1.0 (90% deviation = score 0)
  return clamp100(100 - (excess / (1 - TOLERANCE)) * 100);
}

/**
 * Scores sodium moderation for the meal.
 * Returns { score, sodiumMg, dataAvailable }.
 * - score: 0-100. 100 when ≤ threshold. Decays as sodium exceeds threshold.
 * - sodiumMg: total meal sodium in mg (0 when no data).
 * - dataAvailable: true when at least one entry contributed sodium data.
 */
function scoreSodiumModeration(entries: FoodLogEntry[]): {
  score: number;
  sodiumMg: number;
  dataAvailable: boolean;
} {
  let totalSodiumMg = 0;
  let dataAvailable = false;

  for (const entry of entries) {
    const mg = computeEntrySodiumMg(entry);
    if (mg !== null) {
      totalSodiumMg += mg;
      dataAvailable = true;
    }
  }

  if (!dataAvailable) {
    return { score: 100, sodiumMg: 0, dataAvailable: false };
  }

  if (totalSodiumMg <= SODIUM_PENALTY_THRESHOLD_MG) {
    return { score: 100, sodiumMg: totalSodiumMg, dataAvailable: true };
  }

  // Linear decay above threshold: at 2x threshold → score 0
  const overage = totalSodiumMg - SODIUM_PENALTY_THRESHOLD_MG;
  const score = clamp100(100 - (overage / SODIUM_PENALTY_THRESHOLD_MG) * 100);
  return { score, sodiumMg: totalSodiumMg, dataAvailable: true };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scores a single meal slot (0-100) with a full breakdown.
 *
 * @param entries - All FoodLogEntry items for this meal slot.
 * @param targets - User's daily NutritionTargets.
 * @param mealSlot - One of the 4 default meal slots.
 * @returns MealScoreResult with score, breakdown, tips, and sodium data.
 */
export function scoreMeal(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  mealSlot: MealSlot,
): MealScoreResult {
  if (entries.length === 0) {
    const emptyBreakdown: MealScoreBreakdown = {
      macroBalance: 0,
      proteinDensity: 0,
      calorieAppropriateness: 0,
      sodiumModeration: 100,
      sodiumDataAvailable: false,
    };
    return {
      mealSlot,
      score: 0,
      breakdown: emptyBreakdown,
      tips: ['Log some food to see your meal score.'],
      sodiumMg: 0,
    };
  }

  const macroBalance = scoreMacroBalance(entries, targets, mealSlot);
  const proteinDensity = scoreProteinDensity(entries);
  const calorieAppropriateness = scoreCalorieAppropriateness(entries, targets, mealSlot);
  const { score: sodiumModeration, sodiumMg, dataAvailable: sodiumDataAvailable } =
    scoreSodiumModeration(entries);

  // Compute weighted total.
  // When sodium data is absent, redistribute 10% sodium weight to macroBalance.
  const macroWeight = sodiumDataAvailable ? 0.40 : 0.50;
  const sodiumWeight = sodiumDataAvailable ? 0.10 : 0.00;

  const score = clamp100(
    macroBalance * macroWeight +
    proteinDensity * 0.25 +
    calorieAppropriateness * 0.25 +
    sodiumModeration * sodiumWeight,
  );

  const breakdown: MealScoreBreakdown = {
    macroBalance,
    proteinDensity,
    calorieAppropriateness,
    sodiumModeration,
    sodiumDataAvailable,
  };

  const tips = generateMealTips(entries, targets, breakdown, mealSlot);

  return {
    mealSlot,
    score: Math.round(score),
    breakdown,
    tips,
    sodiumMg,
  };
}

/**
 * Scores all 4 default meal slots and returns a daily aggregate.
 * Custom slots are not scored — they are excluded by filtering on MEAL_SLOTS.
 *
 * @param allEntries - All FoodLogEntry items for the day (any slot).
 * @param targets - User's daily NutritionTargets.
 * @returns DailyNutritionScore with per-slot results and an averaged daily score.
 */
export function scoreDailyNutrition(
  allEntries: FoodLogEntry[],
  targets: NutritionTargets,
): DailyNutritionScore {
  const slotScores: Partial<Record<MealSlot, MealScoreResult>> = {};

  for (const slot of MEAL_SLOTS) {
    const slotEntries = allEntries.filter((e) => e.mealSlot === slot);
    if (slotEntries.length === 0) continue; // don't score empty slots
    slotScores[slot] = scoreMeal(slotEntries, targets, slot);
  }

  const scored = Object.values(slotScores) as MealScoreResult[];
  if (scored.length === 0) {
    return { dailyScore: null, slotScores };
  }

  const dailyScore = Math.round(
    scored.reduce((sum, r) => sum + r.score, 0) / scored.length,
  );

  return { dailyScore, slotScores };
}
