/**
 * GLP-1-aware nutrition intelligence — pure functions, no side effects.
 *
 * GLP-1 medications drastically suppress appetite. Without active intervention,
 * users consistently under-eat protein, leading to muscle loss. This module
 * calculates protein floors based on body weight and activity level, enforces
 * raised calorie guardrails, and surfaces contextual meal timing tips.
 */

import type { Cycle } from '../types/cycle';
import type { Compound } from '../data/compoundDatabase';
import type { Sex } from '../types/profile';
import { GLP1_CATEGORIES } from '../types/glp1Nutrition';
import type { Glp1AdjustedTargets } from '../types/glp1Nutrition';

// ─── Protein floor constants ──────────────────────────────────────────────────

/**
 * Maps activity multiplier ranges to grams-of-protein per kg of bodyweight.
 * Ranges follow the TDEE activity multiplier conventions used in tdee.ts:
 *   1.0  = sedentary (no exercise)
 *   1.2  = light activity
 *   1.55 = moderate activity (default)
 *   1.725–1.9 = active / very active
 *
 * GLP-1 suppresses protein intake; these floors are slightly above general
 * population recommendations to compensate for the appetite suppression effect.
 */
const PROTEIN_FLOOR_SEDENTARY = 1.0;   // g/kg — baseline protection
const PROTEIN_FLOOR_LIGHT = 1.2;       // g/kg
const PROTEIN_FLOOR_MODERATE = 1.4;    // g/kg
const PROTEIN_FLOOR_ACTIVE = 1.6;      // g/kg

/**
 * GLP-1-specific calorie floors are higher than the normal platform floors
 * (male 1500 / female 1200) to prevent dangerous under-eating combined with
 * the already-reduced appetite the medications cause.
 */
export const GLP1_CALORIE_FLOOR_MALE = 1600;
export const GLP1_CALORIE_FLOOR_FEMALE = 1400;

// ─── Meal timing tips ─────────────────────────────────────────────────────────

/**
 * Rotated daily using dayOfYear % tips.length so users see variety without
 * complex personalization logic at this stage.
 */
const GLP1_TIPS: string[] = [
  'Prioritise protein at your first meal — appetite suppression peaks mid-day on GLP-1.',
  'Eat protein BEFORE carbs and fat. When nausea cuts your meal short, you still hit your floor.',
  'Liquid protein (shakes, Greek yoghurt) is easier on GLP-1 nausea than solid meat.',
  'Smaller, more frequent meals can reduce nausea while keeping protein intake on track.',
  'Aim for 30–40 g protein per meal. GLP-1 slows gastric emptying — spacing helps absorption.',
  'Nausea worst? Egg whites, cottage cheese, and soft tofu are high-protein, low-effort options.',
  'Track protein first thing in the morning so afternoon cravings confirm your floor is covered.',
  'GLP-1 raises lean mass risk if protein lags. Even 20 minutes of resistance work amplifies retention.',
];

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Determine if the user has at least one active GLP-1 cycle.
 *
 * Looks up each active cycle's compound in the provided compound list and
 * checks whether its `category` field belongs to the GLP1_CATEGORIES allowlist.
 * Using an allowlist (not a regex or `includes`) ensures new compound entries
 * are explicitly opt-in rather than accidentally matched.
 *
 * @param cycles    All cycles from the user's cycle collection
 * @param compounds The compound records corresponding to active cycle compoundIds
 */
export function isGlp1CycleActive(
  cycles: Pick<Cycle, 'id' | 'compoundId' | 'status'>[],
  compounds: Pick<Compound, 'id' | 'category'>[],
): boolean {
  const compoundMap = new Map(compounds.map((c) => [c.id, c]));

  return cycles.some((cycle) => {
    if (cycle.status !== 'active') return false;
    const compound = compoundMap.get(cycle.compoundId);
    if (!compound) return false;
    // Type assertion: GLP1_CATEGORIES is a readonly tuple of string literals.
    // compound.category is typed as `string` in the database; we check membership.
    return (GLP1_CATEGORIES as ReadonlyArray<string>).includes(compound.category);
  });
}

// ─── Protein floor calculation ────────────────────────────────────────────────

/**
 * Calculate the minimum daily protein intake for a GLP-1 user.
 *
 * Defaults to sedentary (most conservative) when activityLevel is undefined —
 * it is safer to over-protect than to under-protect lean mass.
 *
 * @param weightKg     User's body weight in kg
 * @param activityLevel  TDEE activity multiplier (1.0, 1.2, 1.55, 1.725, 1.9)
 */
export function calculateProteinFloorG(
  weightKg: number,
  activityLevel: number | undefined,
): number {
  let rateGPerKg: number;

  if (activityLevel === undefined || activityLevel < 1.2) {
    rateGPerKg = PROTEIN_FLOOR_SEDENTARY;
  } else if (activityLevel < 1.55) {
    rateGPerKg = PROTEIN_FLOOR_LIGHT;
  } else if (activityLevel < 1.725) {
    rateGPerKg = PROTEIN_FLOOR_MODERATE;
  } else {
    rateGPerKg = PROTEIN_FLOOR_ACTIVE;
  }

  return Math.round(Math.max(0, weightKg) * rateGPerKg);
}

// ─── Target adjustment ────────────────────────────────────────────────────────

/**
 * Apply GLP-1 guardrails to an existing set of nutrition targets.
 *
 * Protein floor logic:
 *   1. If proteinG is already at or above the floor → no change.
 *   2. If proteinG is below the floor → raise it to the floor.
 *      The extra protein calories must come from somewhere — we reduce
 *      carbs and fat proportionally to preserve their relative ratio.
 *      e.g. if carbs:fat = 200g:65g before, they stay in ~3:1 ratio after.
 *
 * Calorie floor logic: apply the GLP-1-specific (higher) calorie floor
 * AFTER macro redistribution, since calories are clamped last.
 *
 * @param calorieTarget  Current calorie target (kcal)
 * @param proteinG       Current protein target (g)
 * @param carbsG         Current carbs target (g)
 * @param fatG           Current fat target (g)
 * @param proteinFloorG  Minimum protein required (g)
 * @param sex            Determines which calorie floor applies
 */
export function applyGlp1Adjustments(
  calorieTarget: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  proteinFloorG: number,
  sex: Sex,
): Glp1AdjustedTargets {
  const calorieFloor = sex === 'male' ? GLP1_CALORIE_FLOOR_MALE : GLP1_CALORIE_FLOOR_FEMALE;

  let finalProteinG = proteinG;
  let finalCarbsG = carbsG;
  let finalFatG = fatG;
  let proteinFloorApplied = false;

  if (proteinG < proteinFloorG) {
    proteinFloorApplied = true;
    finalProteinG = proteinFloorG;

    // Extra protein calories consumed from the carb + fat budget.
    const extraProteinKcal = (proteinFloorG - proteinG) * 4;
    const currentCarbFatKcal = carbsG * 4 + fatG * 9;
    const newCarbFatKcal = currentCarbFatKcal - extraProteinKcal;

    if (newCarbFatKcal <= 0 || currentCarbFatKcal <= 0) {
      // Edge case: protein floor consumes all remaining calories.
      // Set carbs and fat to 0 — the calorie floor will apply downstream.
      finalCarbsG = 0;
      finalFatG = 0;
    } else {
      // Scale carbs and fat down proportionally to preserve their relative ratio.
      const ratio = newCarbFatKcal / currentCarbFatKcal;
      finalCarbsG = Math.round((carbsG * 4 * ratio) / 4);
      finalFatG = Math.round((fatG * 9 * ratio) / 9);
    }
  }

  // Recalculate total calories from the adjusted macros
  let finalCalorieTarget = finalProteinG * 4 + finalCarbsG * 4 + finalFatG * 9;

  // Clamp to the GLP-1-specific calorie floor
  let calorieFloorApplied = false;
  if (finalCalorieTarget < calorieFloor) {
    calorieFloorApplied = true;
    finalCalorieTarget = calorieFloor;
  }

  return {
    proteinFloorG,
    proteinG: finalProteinG,
    carbsG: finalCarbsG,
    fatG: finalFatG,
    calorieTarget: finalCalorieTarget,
    proteinFloorApplied,
    calorieFloorApplied,
  };
}

// ─── Daily tip rotation ───────────────────────────────────────────────────────

/**
 * Return today's GLP-1 meal guidance tip.
 * Rotates through the static array using the day-of-year so each day gets
 * a different tip without requiring any persistence.
 */
export function getDailyGlp1Tip(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return GLP1_TIPS[dayOfYear % GLP1_TIPS.length];
}

// ─── Protein reminder logic ───────────────────────────────────────────────────

/**
 * Decide whether to send a protein reminder notification.
 *
 * Returns true when ALL conditions are met:
 *   1. Current hour is between 2 PM and 5 PM (the "afternoon check" window)
 *   2. Protein logged so far is below 60% of the daily floor
 *
 * The 60% threshold is intentionally lenient — at 2 PM with < 60% logged,
 * catching up over dinner is hard. Triggering earlier or at a higher threshold
 * generates too many false positives.
 *
 * @param currentProteinG  Protein logged so far today (g)
 * @param floorG           Minimum protein target (g)
 * @param currentHour      Hour of day 0–23 (local time)
 */
export function shouldSendProteinReminder(
  currentProteinG: number,
  floorG: number,
  currentHour: number,
): boolean {
  const inAfternoonWindow = currentHour >= 14 && currentHour < 17;
  const belowSixtyPct = floorG > 0 && currentProteinG < floorG * 0.6;
  return inAfternoonWindow && belowSixtyPct;
}
