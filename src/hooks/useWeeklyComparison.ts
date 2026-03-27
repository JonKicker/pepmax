/**
 * useWeeklyComparison — fetches 14 days of food logs and computes weekly comparison data.
 *
 * Splits logs into:
 *   thisWeek  — last 7 days (today back to today-6)
 *   lastWeek  — prior 7 days (today-7 back to today-13)
 *
 * Returns WeeklyComparisonData or null while loading.
 */

import { useState, useEffect } from 'react';
import type { WeeklyComparisonData } from '../types/weeklyComparison';
import type { NutritionTargets } from '../types/nutrition';
import { getLogsForDateRange } from '../services/nutritionService';
import { buildWeeklyComparison } from '../utils/weeklyComparisonCalc';
import { toLocalDateKey } from '../utils/nutrition';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseWeeklyComparisonResult {
  comparison: WeeklyComparisonData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches the last 14 days of food logs and returns a weekly comparison.
 *
 * @param targets - User's daily nutrition targets (for v2 scoring).
 * @param enabled - Set to false to skip fetching (e.g., when modal is hidden).
 */
export function useWeeklyComparison(
  targets: NutritionTargets,
  enabled: boolean = true,
): UseWeeklyComparisonResult {
  const [comparison, setComparison] = useState<WeeklyComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAndCompute() {
      try {
        const today = toLocalDateKey();
        const thisWeekEnd = today;
        const thisWeekStart = addDays(today, -6);
        const lastWeekEnd = addDays(today, -7);
        const lastWeekStart = addDays(today, -13);

        // Fetch both windows
        const [thisResult, lastResult] = await Promise.all([
          getLogsForDateRange(thisWeekStart, thisWeekEnd),
          getLogsForDateRange(lastWeekStart, lastWeekEnd),
        ]);

        if (cancelled) return;

        if (thisResult.error || lastResult.error) {
          setError(thisResult.error ?? lastResult.error);
          setLoading(false);
          return;
        }

        const data = buildWeeklyComparison(
          thisResult.data ?? [],
          lastResult.data ?? [],
          targets,
        );

        setComparison(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load weekly comparison.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAndCompute();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, targets.calorieTarget, targets.proteinG, targets.carbsG, targets.fatG]);

  return { comparison, loading, error };
}
