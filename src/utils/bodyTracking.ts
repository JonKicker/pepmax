/**
 * Pure body tracking utilities — no Firebase dependencies.
 * Safe to import in tests.
 */
import type { BodyWeightEntry, WeightStats } from '../types/bodyTracking';

export function computeWeightStats(entries: BodyWeightEntry[]): WeightStats | null {
  if (entries.length === 0) return null;

  const weights = entries.map((e) => e.weight);
  const starting = weights[0];
  const current = weights[weights.length - 1];

  return {
    starting,
    current,
    change: current - starting,
    average: weights.reduce((a, b) => a + b, 0) / weights.length,
    lowest: Math.min(...weights),
    highest: Math.max(...weights),
  };
}
