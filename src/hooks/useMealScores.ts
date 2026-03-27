/**
 * useMealScores — derives per-meal and daily nutrition scores from entries + targets.
 *
 * Uses the v2 scorer (nutritionScorer.ts) internally for improved scoring that
 * accounts for fiber, micronutrients, and NOVA group processed-food penalty.
 *
 * Returns DailyNutritionScoreV2 which is structurally compatible with callers
 * that previously consumed DailyNutritionScore (both have dailyScore + slotScores).
 *
 * Pure derivation via useMemo — no I/O, no Firestore calls.
 * Re-runs only when entries or targets change.
 *
 * LIMITATION: Only the 4 default meal slots (breakfast, lunch, dinner, snacks)
 * are scored. Custom slot entries contribute to daily totals but are not scored.
 *
 * RAY MANDATORY: fiber and novaGroup are included in the memo dependency key.
 */

import { useMemo } from 'react';
import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { DailyNutritionScoreV2 } from '../types/nutritionScore';
import { scoreDailyNutritionV2 } from '../utils/nutritionScorer';

/**
 * Derives daily + per-slot meal scores (v2) from the current day's food log entries
 * and the user's nutrition targets.
 *
 * @param entries - All FoodLogEntry items for the current day.
 * @param targets - User's daily NutritionTargets (calories, protein, carbs, fat).
 * @returns DailyNutritionScoreV2 with dailyScore (or null) and per-slot results.
 */
export function useMealScores(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
): DailyNutritionScoreV2 {
  return useMemo(
    () => scoreDailyNutritionV2(entries, targets),
    // RAY MANDATORY: include fiber and novaGroup in dependency key so score
    // updates when these fields change (e.g., after food detail re-log).
    // Stringify entries for stable comparison without deep equality overhead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      entries.length,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      entries
        .map(
          (e) =>
            `${e.id}:${e.calories}:${e.protein}:${e.carbs}:${e.fat}:${e.mealSlot}:${e.servingSize}:${e.servingUnit}:${e.micronutrients?.sodium ?? ''}:${e.fiber ?? ''}:${e.novaGroup ?? ''}`,
        )
        .join(','),
      targets.calorieTarget,
      targets.proteinG,
      targets.carbsG,
      targets.fatG,
    ],
  );
}
