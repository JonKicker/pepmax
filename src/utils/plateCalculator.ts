/**
 * plateCalculator.ts
 *
 * Pure utility — computes which plates to load on each side of the bar.
 * Uses a greedy largest-first algorithm.
 *
 * Guard rails (Ray's item #4):
 *   - totalWeight <= barWeight  → returns empty platesPerSide
 *   - negative / NaN / zero    → returns empty platesPerSide
 *   - If remainder is non-zero after greedy fit, totalAchievable reflects
 *     the closest achievable weight (always ≤ requested) and isExact=false.
 *
 * Standard plate sets:
 *   Imperial (lbs): 45, 35, 25, 10, 5, 2.5
 *   Metric   (kg) : 20, 15, 10,  5, 2.5, 1.25
 */

import type { PlateResult, PlateSet, WeightUnit, BarType } from '../types/warmUp';
import { BAR_WEIGHTS } from './warmUpCalculator';

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG  = [20, 15, 10, 5, 2.5, 1.25];

/** Bar weights — single source of truth imported from warmUpCalculator */
const BAR_WEIGHT = BAR_WEIGHTS;

function emptyResult(requested: number, barWeight: number, unit: WeightUnit): PlateResult {
  return {
    platesPerSide: [],
    barWeight,
    totalAchievable: barWeight,
    requested,
    unit,
    isExact: requested === barWeight,
  };
}

/**
 * computePlates
 *
 * @param totalWeight  The target total weight (bar + all plates)
 * @param unit         'lbs' | 'kg'
 * @param barType      Equipment type — determines bar weight
 * @returns            PlateResult
 */
export function computePlates(
  totalWeight: number,
  unit: WeightUnit,
  barType: BarType,
): PlateResult {
  const barWeight = BAR_WEIGHT[barType][unit];

  // Guard: invalid or impossible input
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return emptyResult(totalWeight, barWeight, unit);
  }

  // Guard: total is at or below bar weight — nothing to load
  if (totalWeight <= barWeight) {
    return emptyResult(totalWeight, barWeight, unit);
  }

  const availablePlates = unit === 'kg' ? PLATES_KG : PLATES_LBS;

  // Weight to distribute across BOTH sides
  const totalPlateWeight = totalWeight - barWeight;
  // Weight per side
  let remaining = totalPlateWeight / 2;

  const platesPerSide: PlateSet[] = [];

  for (const plate of availablePlates) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      platesPerSide.push({ weight: plate, count });
      remaining -= count * plate;
    }
  }

  // Round floating point residue
  remaining = parseFloat(remaining.toFixed(4));

  // Total actually achievable = bar + 2 * sum of all plates loaded per side
  const loadedPerSide = platesPerSide.reduce((sum, p) => sum + p.weight * p.count, 0);
  const totalAchievable = parseFloat((barWeight + loadedPerSide * 2).toFixed(4));
  const isExact = remaining === 0;

  return {
    platesPerSide,
    barWeight,
    totalAchievable,
    requested: totalWeight,
    unit,
    isExact,
  };
}
