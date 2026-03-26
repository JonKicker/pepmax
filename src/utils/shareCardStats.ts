/**
 * shareCardStats — pure helpers for the ShareCardGenerator component.
 *
 * Isolated from React Native / RadarChart so they can be imported
 * directly in Jest tests without triggering native module dependencies.
 */
import {
  formatWeight,
  formatDistance,
  formatPace,
} from './compareFormatters';
import type { CompareScores } from '../types/compare';
import type { Units } from '../types/profile';

// ─── Stat definition ──────────────────────────────────────────────────────────

export type WinDirection = 'higher' | 'lower'; // lower = lower is better (e.g. pace)

export type StatDefinition = {
  module: string;
  field: keyof CompareScores;
  label: string;
  format: (v: number) => string;
  winDir: WinDirection;
};

// ─── Module stat definitions ──────────────────────────────────────────────────

/**
 * Returns the full list of stat definitions with format functions bound to the
 * given unit system. Pass 'imperial' to get lbs / miles / min-per-mile output.
 * Defaults to 'metric' (kg / km / min-per-km).
 */
export function getStatDefinitions(units: Units = 'metric'): StatDefinition[] {
  return [
    // gym
    { module: 'gym', field: 'estimatedOneRepMax', label: 'Est. 1RM', format: (v) => formatWeight(v, units), winDir: 'higher' },
    { module: 'gym', field: 'weeklyVolume', label: 'Vol/Week', format: (v) => formatWeight(v, units), winDir: 'higher' },
    // cardio
    { module: 'cardio', field: 'weeklyDistance', label: 'Dist/Week', format: (v) => formatDistance(v, units), winDir: 'higher' },
    { module: 'cardio', field: 'avgPace', label: 'Avg Pace', format: (v) => formatPace(v, units), winDir: 'lower' },
    // nutrition
    { module: 'nutrition', field: 'avgDailyCalories', label: 'Avg kcal', format: (v) => `${Math.round(v)} kcal`, winDir: 'higher' },
    { module: 'nutrition', field: 'nutritionConsistency', label: 'Consistency', format: (v) => `${Math.round(v)}%`, winDir: 'higher' },
    // recovery
    { module: 'recovery', field: 'avgRecoveryScore', label: 'Recovery', format: (v) => String(Math.round(v)), winDir: 'higher' },
    // body
    { module: 'body', field: 'bodyWeightTrend', label: 'Body Weight', format: (v) => formatWeight(v, units), winDir: 'higher' },
    // peptides
    { module: 'peptides', field: 'activePeptideCount', label: 'Active Peptides', format: (v) => String(Math.round(v)), winDir: 'higher' },
    // crossModule
    { module: 'crossModule', field: 'overallConsistency', label: 'Consistency', format: (v) => `${Math.round(v)}%`, winDir: 'higher' },
    { module: 'crossModule', field: 'xpPercentile', label: 'XP Rank', format: (v) => `${Math.round(v)}%`, winDir: 'higher' },
  ];
}

/**
 * Pre-built metric definitions for backwards compatibility and for consumers
 * that do not need dynamic units (e.g. module-availability checks).
 */
export const STAT_DEFINITIONS: StatDefinition[] = getStatDefinitions('metric');

// ─── buildVisibleStats (exported for tests) ───────────────────────────────────

/**
 * Filters stat definitions to only those rows that should appear on the card.
 *
 * A row is included when:
 *   1. The module is in `visibleModules`
 *   2. Neither myScores[field] nor opponentScores[field] is the -1 sentinel
 *   3. Neither value is undefined (handles empty/malformed score objects)
 *
 * @param units  Unit system for formatting — defaults to 'metric'.
 */
export function buildVisibleStats(
  myScores: CompareScores,
  opponentScores: CompareScores,
  visibleModules: string[],
  units: Units = 'metric',
): StatDefinition[] {
  return getStatDefinitions(units).filter((def) => {
    if (!visibleModules.includes(def.module)) return false;
    const myVal = myScores[def.field] as number | undefined;
    const oppVal = opponentScores[def.field] as number | undefined;
    return myVal !== undefined && myVal !== -1 && oppVal !== undefined && oppVal !== -1;
  });
}
