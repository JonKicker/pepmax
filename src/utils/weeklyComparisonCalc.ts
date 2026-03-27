/**
 * weeklyComparisonCalc — pure functions for weekly nutrition comparison.
 *
 * Computes per-week summaries, deltas, and a plain-English top tip
 * from two 7-day windows of food log entries.
 *
 * RAY MANDATORY: entries are capped at 500 before processing to prevent
 * runaway computation on large data sets.
 *
 * All functions are pure — no I/O, safe to call from useMemo.
 */

import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { WeekSummary, WeekDeltas, WeeklyComparisonData } from '../types/weeklyComparison';
import { scoreDailyNutritionV2 } from './nutritionScorer';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum entries processed to prevent runaway computation. */
const MAX_ENTRIES = 500;

/**
 * Minimum delta magnitude treated as "noise" (steady).
 * Below this threshold, direction = 'steady'.
 */
const SCORE_NOISE_THRESHOLD = 3;
const CALORIE_NOISE_THRESHOLD = 50;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Groups entries by date string (YYYY-MM-DD).
 */
function groupByDate(entries: FoodLogEntry[]): Map<string, FoodLogEntry[]> {
  const map = new Map<string, FoodLogEntry[]>();
  for (const entry of entries) {
    const existing = map.get(entry.date) ?? [];
    existing.push(entry);
    map.set(entry.date, existing);
  }
  return map;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes a WeekSummary from a set of food log entries and optional weight data.
 *
 * @param entries - All entries for the 7-day window (capped at MAX_ENTRIES).
 * @param targets - User's daily nutrition targets (for scoring).
 * @param weightData - Optional array of { date, kg } weight readings for the period.
 * @returns WeekSummary aggregated across logged days.
 */
export function computeWeekSummary(
  entries: FoodLogEntry[],
  targets: NutritionTargets,
  weightData?: { date: string; kg: number }[],
): WeekSummary {
  // RAY MANDATORY: Cap at 500 entries
  const capped = entries.slice(0, MAX_ENTRIES);

  if (capped.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgScore: null,
      daysLogged: 0,
      dailyScores: [null, null, null, null, null, null, null],
      weightTrendKgPerWeek: null,
    };
  }

  const byDate = groupByDate(capped);
  const daysLogged = byDate.size;

  // Daily calories and protein
  let totalCalories = 0;
  let totalProtein = 0;

  for (const dayEntries of byDate.values()) {
    totalCalories += dayEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
    totalProtein += dayEntries.reduce((s, e) => s + (e.protein ?? 0), 0);
  }

  const avgCalories = daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round((totalProtein / daysLogged) * 10) / 10 : 0;

  // Daily scores — score each day using v2 scorer
  // We need to build a 7-element array. Sort dates to assign positions.
  const sortedDates = Array.from(byDate.keys()).sort();
  // Build a 7-slot array. If we have fewer than 7 days, pad with nulls.
  const dailyScores: (number | null)[] = Array(7).fill(null);
  sortedDates.forEach((date, idx) => {
    if (idx >= 7) return;
    const dayEntries = byDate.get(date) ?? [];
    const scored = scoreDailyNutritionV2(dayEntries, targets);
    dailyScores[idx] = scored.dailyScore;
  });

  // Average score
  const validScores = dailyScores.filter((s): s is number => s !== null);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
    : null;

  // Weight trend (simple linear regression on available data)
  let weightTrendKgPerWeek: number | null = null;
  if (weightData && weightData.length >= 2) {
    const sorted = weightData.slice().sort((a, b) => a.date.localeCompare(b.date));
    const n = sorted.length;
    // Simple slope: (last - first) / actual_days
    // Use the real date difference so that sparse readings (e.g. Monday + Friday)
    // don't inflate the rate by using count-1 (which would give 1 day instead of 4).
    const firstKg = sorted[0]!.kg;
    const lastKg = sorted[n - 1]!.kg;
    const days = (Date.parse(sorted[n - 1]!.date) - Date.parse(sorted[0]!.date)) / 86_400_000;
    if (days > 0) {
      weightTrendKgPerWeek = ((lastKg - firstKg) / days) * 7;
    }
  }

  return {
    avgCalories,
    avgProtein,
    avgScore,
    daysLogged,
    dailyScores,
    weightTrendKgPerWeek,
  };
}

/**
 * Computes deltas and direction between two week summaries.
 *
 * @param thisWeek - The more recent week.
 * @param lastWeek - The older week.
 * @returns WeekDeltas with signed differences and direction.
 */
export function computeWeekDeltas(thisWeek: WeekSummary, lastWeek: WeekSummary): WeekDeltas {
  const calories = thisWeek.avgCalories - lastWeek.avgCalories;
  const protein = Math.round((thisWeek.avgProtein - lastWeek.avgProtein) * 10) / 10;
  const score =
    thisWeek.avgScore !== null && lastWeek.avgScore !== null
      ? thisWeek.avgScore - lastWeek.avgScore
      : null;

  // Determine direction
  let direction: WeekDeltas['direction'] = 'steady';

  if (score !== null) {
    if (score > SCORE_NOISE_THRESHOLD) direction = 'improving';
    else if (score < -SCORE_NOISE_THRESHOLD) direction = 'declining';
  } else {
    // Fall back to calorie consistency (more days logged = improving)
    const daysDelta = thisWeek.daysLogged - lastWeek.daysLogged;
    if (daysDelta > 1) direction = 'improving';
    else if (daysDelta < -1) direction = 'declining';
  }

  // Override with calorie signal if score is in noise band
  if (direction === 'steady' && Math.abs(calories) > CALORIE_NOISE_THRESHOLD) {
    // Moving toward higher calories when already over target can be declining
    // but we don't have targets here — keep steady for ambiguous calorie change
    direction = 'steady';
  }

  return { calories, protein, score, direction };
}

/**
 * Generates a single most-actionable tip based on the week comparison.
 *
 * @param thisWeek - The more recent week.
 * @param lastWeek - The older week.
 * @param deltas - Pre-computed deltas.
 * @returns Plain-English tip string.
 */
export function generateTopTip(
  thisWeek: WeekSummary,
  lastWeek: WeekSummary,
  deltas: WeekDeltas,
): string {
  // Priority 1: logging consistency
  if (thisWeek.daysLogged < 5) {
    return `You logged ${thisWeek.daysLogged}/7 days this week. Consistent logging unlocks your personalized coaching.`;
  }

  // Priority 2: score dropped
  if (deltas.score !== null && deltas.score < -SCORE_NOISE_THRESHOLD) {
    return `Your nutrition score dropped ${Math.abs(Math.round(deltas.score))} points this week. Focus on fiber and protein to bounce back.`;
  }

  // Priority 3: score improved — reinforce
  if (deltas.score !== null && deltas.score > SCORE_NOISE_THRESHOLD) {
    const scoreNow = thisWeek.avgScore ?? 0;
    return `Nutrition score up ${Math.round(deltas.score)} points to ${scoreNow}! Keep building those habits.`;
  }

  // Priority 4: protein decreased
  if (deltas.protein < -5) {
    return `Protein intake dropped by ${Math.abs(Math.round(deltas.protein))}g/day. Add a protein source to each meal to stay on track.`;
  }

  // Priority 5: protein improved
  if (deltas.protein > 5) {
    return `Protein up ${Math.round(deltas.protein)}g/day — great work! Consistent protein supports muscle and recovery.`;
  }

  // Priority 6: encourage more logging
  if (thisWeek.daysLogged > lastWeek.daysLogged) {
    return `You logged ${thisWeek.daysLogged - lastWeek.daysLogged} more days than last week. Consistency is key — keep it up!`;
  }

  // Default
  return 'Keep logging meals daily to unlock personalized calorie and macro coaching.';
}

/**
 * Convenience function: builds a full WeeklyComparisonData from raw entries.
 *
 * @param thisWeekEntries - Food log entries from the most recent 7 days.
 * @param lastWeekEntries - Food log entries from the prior 7 days.
 * @param targets - User's daily nutrition targets.
 * @param thisWeekWeights - Optional weight readings for this week.
 * @param lastWeekWeights - Optional weight readings for last week.
 */
export function buildWeeklyComparison(
  thisWeekEntries: FoodLogEntry[],
  lastWeekEntries: FoodLogEntry[],
  targets: NutritionTargets,
  thisWeekWeights?: { date: string; kg: number }[],
  lastWeekWeights?: { date: string; kg: number }[],
): WeeklyComparisonData {
  const thisWeek = computeWeekSummary(thisWeekEntries, targets, thisWeekWeights);
  const lastWeek = computeWeekSummary(lastWeekEntries, targets, lastWeekWeights);
  const deltas = computeWeekDeltas(thisWeek, lastWeek);
  const topTip = generateTopTip(thisWeek, lastWeek, deltas);

  return { thisWeek, lastWeek, deltas, topTip };
}
