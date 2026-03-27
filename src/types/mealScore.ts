/**
 * Types for per-meal nutrition scoring (0-100).
 *
 * LIMITATION: Only the 4 default meal slots (breakfast, lunch, dinner, snacks)
 * receive per-meal scores. Custom slot entries are included in daily totals
 * but do not get scored individually — there is no calorie-split target defined
 * for arbitrary custom slots.
 */

import type { MealSlot } from './nutrition';

// ─── Calorie split per default meal slot ─────────────────────────────────────

/**
 * Fraction of daily calorie target allocated to each default meal slot.
 * Must sum to 1.0.
 */
export const MEAL_SLOT_CALORIE_SPLIT: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.35,
  snacks: 0.10,
};

// ─── Sub-score breakdown ──────────────────────────────────────────────────────

/**
 * Per-component scores, each in the range 0-100.
 * The weighted sum of all components equals the overall meal score.
 */
export type MealScoreBreakdown = {
  /** Macro balance (protein/carbs/fat vs. per-meal targets). Weight: 40% (or 50% when sodium data absent). */
  macroBalance: number;
  /** Protein density — protein calories as % of total meal calories. Weight: 25%. */
  proteinDensity: number;
  /** Calorie appropriateness — closeness to per-meal calorie split target. Weight: 25%. */
  calorieAppropriateness: number;
  /**
   * Sodium moderation — penalty when meal sodium exceeds 800 mg.
   * Weight: 10% when at least one entry has sodium data; 0% (redistributed) otherwise.
   */
  sodiumModeration: number;
  /**
   * Whether sodium data was available for at least one entry in this meal.
   * When false the 10% sodium weight is redistributed to macroBalance (50% total).
   */
  sodiumDataAvailable: boolean;
};

// ─── Per-meal result ──────────────────────────────────────────────────────────

export type MealScoreResult = {
  /** The default meal slot being scored. */
  mealSlot: MealSlot;
  /** Overall score 0-100 (weighted sum of breakdown components). */
  score: number;
  /** Granular component scores — used to generate actionable tips. */
  breakdown: MealScoreBreakdown;
  /** 1-2 actionable tip strings derived from the weakest breakdown components. */
  tips: string[];
  /** Total sodium consumed in this meal (mg). 0 when no data available. */
  sodiumMg: number;
};

// ─── Daily aggregate ─────────────────────────────────────────────────────────

export type DailyNutritionScore = {
  /**
   * Average of scored default slot scores for the day (0-100).
   * Null when no default slots have any entries.
   */
  dailyScore: number | null;
  /** Per-slot results, keyed by MealSlot. Only scored (non-empty) slots included. */
  slotScores: Partial<Record<MealSlot, MealScoreResult>>;
};

// ─── Recovery integration ─────────────────────────────────────────────────────

/**
 * Nutrition score shape consumed by the recovery readiness feature.
 * Intentionally minimal — only what recovery needs.
 */
export type NutritionScoreForRecovery = {
  dailyScore: number | null;
};
