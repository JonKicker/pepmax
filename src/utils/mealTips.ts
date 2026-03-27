/**
 * mealTips — generates 1-2 actionable tip strings from a MealScoreBreakdown.
 *
 * Tips are ranked by the weakest component first. Each tip is concise,
 * beginner-friendly, and specific to what the score breakdown reveals.
 *
 * Pure function — no I/O, safe to call from useMemo or scoreMeal.
 */

import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';
import type { MealScoreBreakdown } from '../types/mealScore';
import { MEAL_SLOT_CALORIE_SPLIT } from '../types/mealScore';
import { GRAM_UNITS } from './mealScore';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Score threshold below which a component is considered "weak" and tips are generated. */
const WEAK_THRESHOLD = 70;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getMacroBalanceTip(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  mealSlot: MealSlot,
): string {
  const split = MEAL_SLOT_CALORIE_SPLIT[mealSlot];
  const targetProtein = targets.proteinG * split;
  const targetCarbs = targets.carbsG * split;
  const targetFat = targets.fatG * split;

  const totalProtein = entries.reduce((s, e) => s + e.protein, 0);
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0);
  const totalFat = entries.reduce((s, e) => s + e.fat, 0);

  type Deficit = { macro: string; diff: number };
  const deficits: Deficit[] = [];

  if (targetProtein > 0 && totalProtein < targetProtein * 0.8) {
    deficits.push({ macro: 'protein', diff: targetProtein - totalProtein });
  }
  if (targetCarbs > 0 && totalCarbs < targetCarbs * 0.8) {
    deficits.push({ macro: 'carbs', diff: targetCarbs - totalCarbs });
  }
  if (targetFat > 0 && totalFat < targetFat * 0.8) {
    deficits.push({ macro: 'healthy fats', diff: targetFat - totalFat });
  }

  // Sort by largest deficit first
  deficits.sort((a, b) => b.diff - a.diff);

  if (deficits.length > 0) {
    const primary = deficits[0];
    const gNeeded = Math.round(primary.diff);
    return `Add ~${gNeeded}g more ${primary.macro} to balance this meal's macros.`;
  }

  // Check for excess
  const excesses: string[] = [];
  if (targetProtein > 0 && totalProtein > targetProtein * 1.3) excesses.push('protein');
  if (targetCarbs > 0 && totalCarbs > targetCarbs * 1.3) excesses.push('carbs');
  if (targetFat > 0 && totalFat > targetFat * 1.3) excesses.push('fat');

  if (excesses.length > 0) {
    return `This meal is high in ${excesses.join(' and ')} — consider smaller portions next time.`;
  }

  return 'Aim to hit your protein, carbs, and fat targets more evenly across this meal.';
}

function getProteinDensityTip(entries: FoodLogEntry[]): string {
  const totalCal = entries.reduce((s, e) => s + e.calories, 0);
  const proteinCal = entries.reduce((s, e) => s + e.protein * 4, 0);
  const pct = totalCal > 0 ? Math.round((proteinCal / totalCal) * 100) : 0;
  return `Only ${pct}% of this meal's calories come from protein. Try adding chicken, eggs, Greek yogurt, or legumes.`;
}

function getCalorieAppropriatnessTip(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  mealSlot: MealSlot,
): string {
  const split = MEAL_SLOT_CALORIE_SPLIT[mealSlot];
  const targetCal = Math.round(targets.calorieTarget * split);
  const totalCal = Math.round(entries.reduce((s, e) => s + e.calories, 0));

  if (totalCal > targetCal) {
    const over = totalCal - targetCal;
    return `This meal is ${over} kcal over the ${targetCal} kcal target for this slot. Consider lighter portions.`;
  }
  const under = targetCal - totalCal;
  return `This meal is ${under} kcal under the ${targetCal} kcal target — a small nutrient-dense addition could help.`;
}

function getSodiumTip(sodiumMg: number): string {
  return `This meal contains ${Math.round(sodiumMg)} mg sodium — above the 800 mg per-meal guideline. Aim for lower-sodium options next time.`;
}

function getLowFiberTip(): string {
  return 'This meal is low in fiber. Add vegetables, beans, fruit, or whole grains to hit the 8g per-meal target.';
}

function getMissingMicrosTip(): string {
  return 'No key micronutrients detected. Include dairy, leafy greens, or fortified foods for iron, calcium, and vitamins.';
}

function getProcessedPenaltyTip(): string {
  return 'This meal is high in ultra-processed foods (NOVA 4). Swapping even one item for a whole-food option will improve your score.';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates 1-2 actionable tips based on the weakest breakdown components.
 * Tips are ordered from most impactful (lowest score) to least.
 *
 * @param entries - FoodLogEntry items for this meal slot.
 * @param targets - User's daily NutritionTargets.
 * @param breakdown - The scored breakdown from scoreMeal.
 * @param mealSlot - The meal slot being scored.
 * @returns Array of 1-2 tip strings.
 */
export function generateMealTips(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  breakdown: MealScoreBreakdown,
  mealSlot: MealSlot,
): string[] {
  if (entries.length === 0) {
    return ['Log some food to see your meal score.'];
  }

  // Build scored components in order of weakness (ascending score = most actionable first)
  type ScoredComponent = {
    score: number;
    getTip: () => string;
  };

  const components: ScoredComponent[] = [
    {
      score: breakdown.macroBalance,
      getTip: () => getMacroBalanceTip(entries, targets, mealSlot),
    },
    {
      score: breakdown.proteinDensity,
      getTip: () => getProteinDensityTip(entries),
    },
    {
      score: breakdown.calorieAppropriateness,
      getTip: () => getCalorieAppropriatnessTip(entries, targets, mealSlot),
    },
  ];

  // Only include sodium tip when data is available and score is low
  if (breakdown.sodiumDataAvailable) {
    const sodiumMg = entries.reduce((sum, e) => {
      const unit = (e.servingUnit ?? '').toLowerCase().trim();
      if (!GRAM_UNITS.has(unit)) return sum;
      const mg = e.micronutrients?.sodium;
      if (mg == null) return sum;
      return sum + (mg * e.servingSize) / 100;
    }, 0);

    components.push({
      score: breakdown.sodiumModeration,
      getTip: () => getSodiumTip(sodiumMg),
    });
  }

  // Sort ascending by score (weakest first), filter those below threshold
  const weakComponents = components
    .filter((c) => c.score < WEAK_THRESHOLD)
    .sort((a, b) => a.score - b.score);

  if (weakComponents.length === 0) {
    // All components are strong — positive reinforcement
    return ['Great job! This meal is well-balanced. Keep it up.'];
  }

  // Return tips for the 2 weakest components
  return weakComponents.slice(0, 2).map((c) => c.getTip());
}
