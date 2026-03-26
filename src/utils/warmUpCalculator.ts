/**
 * warmUpCalculator.ts
 *
 * Pure utility — no side effects, no imports from React.
 * Computes warm-up sets for barbell/EZ-bar/Smith-machine lifts.
 *
 * Standard warm-up protocol (5 sets):
 *   Set 1 — 40 %  x 10 reps
 *   Set 2 — 55 %  x 6  reps
 *   Set 3 — 70 %  x 4  reps
 *   Set 4 — 80 %  x 2  reps
 *   Set 5 — 90 %  x 1  rep
 *
 * Weights are rounded to the nearest 5 lbs (or 2.5 kg).
 */

import type { WarmUpResult, WarmUpSet, WeightUnit, BarType } from '../types/warmUp';

const PROTOCOL: Array<{ percent: number; reps: number }> = [
  { percent: 40, reps: 10 },
  { percent: 55, reps: 6 },
  { percent: 70, reps: 4 },
  { percent: 80, reps: 2 },
  { percent: 90, reps: 1 },
];

/** Bar weights per equipment type */
export const BAR_WEIGHTS: Record<BarType, { lbs: number; kg: number }> = {
  Barbell:      { lbs: 45, kg: 20 },
  'EZ Bar':     { lbs: 25, kg: 11 },
  'Smith Machine': { lbs: 45, kg: 20 },
};

function roundToNearest(value: number, unit: WeightUnit): number {
  // 5 lbs = smallest loadable increment (2 × 2.5 lb plates per side)
  // 2.5 kg = smallest loadable increment (2 × 1.25 kg plates per side)
  const increment = unit === 'kg' ? 2.5 : 5;
  return Math.round(value / increment) * increment;
}

/**
 * computeWarmUpSets
 *
 * @param workingWeight  The target working weight (first real set)
 * @param unit           'lbs' | 'kg'
 * @param barType        Equipment type — determines bar weight
 * @returns              WarmUpResult with sets[] ready to render
 *
 * Returns { sets: [] } when the working weight is too low to warrant warm-ups
 * (at or below the bar weight), or when inputs are invalid.
 */
export function computeWarmUpSets(
  workingWeight: number,
  unit: WeightUnit,
  barType: BarType,
): WarmUpResult {
  const empty: WarmUpResult = { sets: [], workingWeight, unit };

  if (!Number.isFinite(workingWeight) || workingWeight <= 0) return empty;

  const barWeight = BAR_WEIGHTS[barType][unit];
  // No warm-up needed if lifting at or below bar weight
  if (workingWeight <= barWeight) return empty;

  const sets: WarmUpSet[] = PROTOCOL.map((step, i) => {
    const raw = (step.percent / 100) * workingWeight;
    const weight = roundToNearest(Math.max(raw, barWeight), unit);
    return {
      setNumber: i + 1,
      percent: step.percent,
      weight,
      reps: step.reps,
    };
  });

  return { sets, workingWeight, unit };
}

/**
 * getBarWeight — convenience accessor for a given equipment + unit combo.
 */
export function getBarWeight(barType: BarType, unit: WeightUnit): number {
  return BAR_WEIGHTS[barType][unit];
}
