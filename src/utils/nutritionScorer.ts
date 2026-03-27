/**
 * nutritionScorer — v2 per-meal nutrition scoring (0-100).
 *
 * Score breakdown (max 100 + potential negative penalty):
 *   Protein Score  (0-25): per-meal protein vs daily target / 3
 *   Fiber Score    (0-25): meal fiber vs 8g target
 *   Balance Score  (0-25): macro ratio closeness to daily-target ratio
 *   Micro Bonus    (0-25): 5pts each for vitaminD, iron, calcium, potassium, magnesium
 *   Processed Penalty (0 to -15): if NOVA data present and >40% calories from NOVA 4 foods
 *
 * Final score = sum of above components, clamped to [0, 100].
 *
 * Null-safety rules:
 *   - fiber null/0 for all entries → fiberScore = 0 (not penalized further)
 *   - novaGroup null for all entries → processedPenalty = 0 (skip penalty)
 *   - When novaGroup is available for SOME entries, only those entries count
 *     toward the NOVA 4 calorie fraction.
 *
 * All functions are pure — no I/O, safe to call from useMemo.
 */

import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import { MEAL_SLOTS } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';
import type {
  NutritionScoreBreakdown,
  NutritionScoreResult,
  DailyNutritionScoreV2,
} from '../types/nutritionScore';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Target fiber per meal in grams. */
const FIBER_TARGET_G_PER_MEAL = 8;

/** NOVA 4 calorie fraction threshold above which penalty kicks in. */
const NOVA4_PENALTY_THRESHOLD = 0.40;

/** Maximum penalty for ultra-processed food dominance. */
const NOVA4_MAX_PENALTY = 15;

/** Micronutrients that earn 5pts each when present (non-null, > 0). */
const MICRO_BONUS_KEYS: (keyof NonNullable<FoodLogEntry['micronutrients']>)[] = [
  'vitaminD',
  'iron',
  'calcium',
  'potassium',
  'magnesium',
];

/** Points per micronutrient present. */
const MICRO_BONUS_PER_KEY = 5;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Clamps a value to [0, 25]. */
function clamp25(v: number): number {
  return Math.max(0, Math.min(25, v));
}

/** Clamps a value to [0, 100]. */
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Protein Score (0-25).
 * Per-meal protein target = daily proteinG / 3 (three main-meal assumption).
 * Score scales linearly: at or above target → 25. Zero protein → 0.
 */
function computeProteinScore(entries: FoodLogEntry[], targets: NutritionTargets): number {
  const mealTarget = targets.proteinG > 0 ? targets.proteinG / 3 : 0;
  if (mealTarget <= 0) return 25; // no target set, don't penalize
  const totalProtein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  return clamp25(25 * (totalProtein / mealTarget));
}

/**
 * Fiber Score (0-25).
 * Scales linearly to FIBER_TARGET_G_PER_MEAL (8g).
 * When all entries have null/0 fiber, returns 0 (no false penalty).
 */
function computeFiberScore(entries: FoodLogEntry[]): number {
  const totalFiber = entries.reduce((s, e) => s + (e.fiber ?? 0), 0);
  // If no fiber data at all (all null), return 0 — we don't know, so no bonus
  const anyFiberData = entries.some((e) => e.fiber != null);
  if (!anyFiberData) return 0;
  return clamp25(25 * (totalFiber / FIBER_TARGET_G_PER_MEAL));
}

/**
 * Balance Score (0-25).
 * Measures how close the meal's macro ratio is to the daily macro ratio target.
 * "Within 5%" of each macro ratio = full 25. Score decays beyond that.
 */
function computeBalanceScore(entries: FoodLogEntry[], targets: NutritionTargets): number {
  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  if (totalCal <= 0) return 0;

  const totalProtein = entries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);

  const targetTotal = targets.proteinG * 4 + targets.carbsG * 4 + targets.fatG * 9;
  if (targetTotal <= 0) return 25;

  // Target macro calorie fractions
  const targetProteinFrac = (targets.proteinG * 4) / targetTotal;
  const targetCarbsFrac = (targets.carbsG * 4) / targetTotal;
  const targetFatFrac = (targets.fatG * 9) / targetTotal;

  // Actual macro calorie fractions
  const actualProteinFrac = (totalProtein * 4) / totalCal;
  const actualCarbsFrac = (totalCarbs * 4) / totalCal;
  const actualFatFrac = (totalFat * 9) / totalCal;

  // Score each fraction: within 5% absolute deviation = 100 sub-score
  const scoreFor = (actual: number, target: number): number => {
    if (target <= 0) return 1;
    const deviation = Math.abs(actual - target);
    const TOLERANCE = 0.05; // 5 percentage points
    if (deviation <= TOLERANCE) return 1;
    // Decay linearly from TOLERANCE to 0.5 deviation (where score = 0)
    return Math.max(0, 1 - (deviation - TOLERANCE) / 0.45);
  };

  const avg =
    (scoreFor(actualProteinFrac, targetProteinFrac) +
      scoreFor(actualCarbsFrac, targetCarbsFrac) +
      scoreFor(actualFatFrac, targetFatFrac)) /
    3;

  return clamp25(25 * avg);
}

/**
 * Micro Bonus (0-25).
 * 5pts per key micronutrient present (non-null and > 0) in any entry.
 * Keys: vitaminD, iron, calcium, potassium, magnesium.
 */
function computeMicroBonus(entries: FoodLogEntry[]): number {
  let bonus = 0;
  for (const key of MICRO_BONUS_KEYS) {
    const present = entries.some(
      (e) => e.micronutrients != null && (e.micronutrients[key] ?? 0) > 0,
    );
    if (present) bonus += MICRO_BONUS_PER_KEY;
  }
  return clamp25(bonus);
}

/**
 * Processed Penalty (0 to -15).
 * Only applied when at least one entry has a non-null novaGroup.
 * If the fraction of calories from NOVA 4 entries exceeds 40%, apply a penalty
 * scaling up to -15 at 100% NOVA 4.
 */
function computeProcessedPenalty(entries: FoodLogEntry[]): number {
  const entriesWithNova = entries.filter((e) => e.novaGroup != null);
  if (entriesWithNova.length === 0) return 0; // no data — skip penalty

  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  if (totalCal <= 0) return 0;

  const nova4Cal = entriesWithNova
    .filter((e) => e.novaGroup === 4)
    .reduce((s, e) => s + (e.calories ?? 0), 0);

  const nova4Fraction = nova4Cal / totalCal;
  if (nova4Fraction <= NOVA4_PENALTY_THRESHOLD) return 0;

  // Linear from NOVA4_PENALTY_THRESHOLD (0 penalty) to 1.0 (max penalty)
  const excess = nova4Fraction - NOVA4_PENALTY_THRESHOLD;
  const range = 1 - NOVA4_PENALTY_THRESHOLD;
  const penalty = NOVA4_MAX_PENALTY * (excess / range);

  // Return as negative number
  return -Math.min(NOVA4_MAX_PENALTY, Math.round(penalty * 10) / 10);
}

/**
 * Generates a feedback string for the weakest scoring area.
 */
function generateFeedback(
  breakdown: NutritionScoreBreakdown,
  entries: FoodLogEntry[],
): string {
  if (entries.length === 0) return 'Log food to see your nutrition score.';

  // Find weakest (lowest) non-penalty component
  const components = [
    { label: 'protein', score: breakdown.proteinScore },
    { label: 'fiber', score: breakdown.fiberScore },
    { label: 'balance', score: breakdown.balanceScore },
    { label: 'micros', score: breakdown.microBonus },
  ].sort((a, b) => a.score - b.score);

  const weakest = components[0];

  if (breakdown.processedPenalty < -5) {
    return 'Reduce ultra-processed foods to improve your score.';
  }

  switch (weakest.label) {
    case 'protein':
      return 'Boost protein: aim for chicken, eggs, legumes, or Greek yogurt.';
    case 'fiber':
      return 'Add fiber: vegetables, beans, whole grains, or fruit.';
    case 'balance':
      return 'Balance your macros more evenly across protein, carbs, and fat.';
    case 'micros':
      return 'Include a variety of whole foods to unlock your micronutrient bonus.';
    default:
      return 'Great balanced meal! Keep it up.';
  }
}

/**
 * Generates actionable tip strings for v2 scores.
 */
function generateTips(
  breakdown: NutritionScoreBreakdown,
  entries: FoodLogEntry[],
  targets: NutritionTargets,
): string[] {
  if (entries.length === 0) return ['Log food to see your meal score.'];

  const tips: string[] = [];

  if (breakdown.proteinScore < 15) {
    const mealTarget = targets.proteinG > 0 ? Math.round(targets.proteinG / 3) : 0;
    const consumed = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0));
    if (mealTarget > 0) {
      tips.push(`Add ~${mealTarget - consumed}g more protein to hit your per-meal target.`);
    } else {
      tips.push('Include a protein source such as meat, eggs, or legumes.');
    }
  }

  if (breakdown.fiberScore < 15) {
    tips.push('Aim for 8g of fiber per meal — try vegetables, fruit, or whole grains.');
  }

  if (breakdown.processedPenalty < -5) {
    tips.push('Swap ultra-processed items for whole-food alternatives to reduce your penalty.');
  }

  if (breakdown.microBonus < 15) {
    tips.push('Eat a variety of colorful vegetables and dairy to earn your micronutrient bonus.');
  }

  if (breakdown.balanceScore < 15) {
    tips.push('Balance this meal by adjusting the ratio of protein, carbs, and fat.');
  }

  // Positive reinforcement when no tips
  if (tips.length === 0) {
    tips.push('Great meal! All components are on track.');
  }

  return tips.slice(0, 3);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scores a single meal slot using the v2 algorithm.
 *
 * @param entries - FoodLogEntry items for this meal slot (may include fiber and novaGroup).
 * @param targets - User's daily NutritionTargets.
 * @param mealSlot - The slot being scored (used for context in tips).
 * @returns NutritionScoreResult with score [0-100], full breakdown, feedback, and tips.
 */
export function scoreMealV2(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _mealSlot: MealSlot | string,
): NutritionScoreResult {
  if (entries.length === 0) {
    const emptyBreakdown: NutritionScoreBreakdown = {
      proteinScore: 0,
      fiberScore: 0,
      balanceScore: 0,
      microBonus: 0,
      processedPenalty: 0,
    };
    return {
      score: 0,
      breakdown: emptyBreakdown,
      feedback: 'Log food to see your nutrition score.',
      tips: ['Log some food to see your meal score.'],
    };
  }

  const proteinScore = computeProteinScore(entries, targets);
  const fiberScore = computeFiberScore(entries);
  const balanceScore = computeBalanceScore(entries, targets);
  const microBonus = computeMicroBonus(entries);
  const processedPenalty = computeProcessedPenalty(entries);

  const breakdown: NutritionScoreBreakdown = {
    proteinScore: Math.round(proteinScore * 10) / 10,
    fiberScore: Math.round(fiberScore * 10) / 10,
    balanceScore: Math.round(balanceScore * 10) / 10,
    microBonus: Math.round(microBonus * 10) / 10,
    processedPenalty: Math.round(processedPenalty * 10) / 10,
  };

  const rawScore = proteinScore + fiberScore + balanceScore + microBonus + processedPenalty;
  const score = clamp100(Math.round(rawScore));

  const feedback = generateFeedback(breakdown, entries);
  const tips = generateTips(breakdown, entries, targets);

  return { score, breakdown, feedback, tips };
}

/**
 * Scores all 4 default meal slots and returns a daily v2 aggregate.
 *
 * @param allEntries - All FoodLogEntry items for the day.
 * @param targets - User's daily NutritionTargets.
 * @returns DailyNutritionScoreV2 with per-slot results and averaged daily score.
 */
export function scoreDailyNutritionV2(
  allEntries: FoodLogEntry[],
  targets: NutritionTargets,
): DailyNutritionScoreV2 {
  const slotScores: Record<string, NutritionScoreResult> = {};

  for (const slot of MEAL_SLOTS) {
    const slotEntries = allEntries.filter((e) => e.mealSlot === slot);
    if (slotEntries.length === 0) continue;
    slotScores[slot] = scoreMealV2(slotEntries, targets, slot);
  }

  const scored = Object.values(slotScores);
  if (scored.length === 0) {
    return { dailyScore: null, slotScores };
  }

  const dailyScore = Math.round(
    scored.reduce((sum, r) => sum + r.score, 0) / scored.length,
  );

  return { dailyScore, slotScores };
}
