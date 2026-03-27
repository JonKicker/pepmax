/**
 * Types for GLP-1-aware nutrition intelligence.
 *
 * GLP-1 agonists suppress appetite significantly — users often eat far too
 * little protein, risking muscle loss. These types drive the guardrail system
 * that detects active GLP-1 cycles and enforces protein floors.
 */

// ─── GLP-1 category detection ────────────────────────────────────────────────

/**
 * The exact category strings used in compoundDatabase.ts for GLP-1 compounds.
 * Using an allowlist is intentional — new compounds should be added here
 * explicitly rather than relying on string pattern matching.
 */
export const GLP1_CATEGORIES = [
  'GLP-1 Agonist',
  'GLP-1/GIP Dual Agonist',
  'GLP-1/GIP/Glucagon Triple Agonist',
] as const;

export type Glp1Category = (typeof GLP1_CATEGORIES)[number];

// ─── GLP-1 nutrition state ────────────────────────────────────────────────────

export type Glp1NutritionState = {
  /** True when the user has at least one active GLP-1 cycle */
  isActive: boolean;

  /** Minimum protein in grams the user should hit each day */
  proteinFloorG: number;

  /** Calorie floor — higher than the standard floor on GLP-1 */
  calorieFloorKcal: number;

  /** Daily tip text, rotated by day-of-year */
  tipOfDay: string;

  /** True when current protein logged is below 60% of floor and in 2-5 PM window */
  shouldSendProteinReminder: boolean;
};

// ─── Adjusted targets ─────────────────────────────────────────────────────────

export type Glp1AdjustedTargets = {
  /** Protein floor in grams enforced by GLP-1 logic */
  proteinFloorG: number;

  /**
   * Final protein target in grams — max(original, floor).
   * May exceed the original macro-split target.
   */
  proteinG: number;

  /** Carbs in grams, scaled down proportionally if protein was raised */
  carbsG: number;

  /** Fat in grams, scaled down proportionally if protein was raised */
  fatG: number;

  /** Calorie target, clamped to the GLP-1-specific floor */
  calorieTarget: number;

  /** True when the protein floor was applied (exceeds original target) */
  proteinFloorApplied: boolean;

  /** True when the calorie floor was applied */
  calorieFloorApplied: boolean;
};
