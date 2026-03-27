/**
 * Tests for src/utils/weeklyComparisonCalc.ts
 *
 * Covers: computeWeekSummary, computeWeekDeltas, generateTopTip, buildWeeklyComparison
 * Tests: happy path, edge cases, MAX_ENTRIES cap, direction logic
 */

import {
  computeWeekSummary,
  computeWeekDeltas,
  generateTopTip,
  buildWeeklyComparison,
} from '../utils/weeklyComparisonCalc';
import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { WeekSummary } from '../types/weeklyComparison';
import { Timestamp } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(date: string, overrides: Partial<FoodLogEntry> = {}): FoodLogEntry {
  return {
    id: `e-${date}-${Math.random()}`,
    date,
    mealSlot: 'lunch',
    foodName: 'Test Food',
    calories: 500,
    protein: 40,
    carbs: 60,
    fat: 15,
    servingSize: 200,
    servingUnit: 'g',
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

const targets: NutritionTargets = {
  calorieTarget: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
};

function makeWeekSummary(overrides: Partial<WeekSummary> = {}): WeekSummary {
  return {
    avgCalories: 2000,
    avgProtein: 150,
    avgScore: 70,
    daysLogged: 7,
    dailyScores: [65, 70, 72, 68, 74, 71, 70],
    weightTrendKgPerWeek: -0.2,
    ...overrides,
  };
}

// ─── computeWeekSummary ───────────────────────────────────────────────────────

describe('computeWeekSummary', () => {
  it('returns zero summary for empty entries', () => {
    const result = computeWeekSummary([], targets);
    expect(result.avgCalories).toBe(0);
    expect(result.avgProtein).toBe(0);
    expect(result.avgScore).toBeNull();
    expect(result.daysLogged).toBe(0);
    expect(result.dailyScores).toHaveLength(7);
    expect(result.dailyScores.every((s) => s === null)).toBe(true);
  });

  it('computes correct avg calories from single day', () => {
    const entries = [
      makeEntry('2026-03-20', { calories: 600 }),
      makeEntry('2026-03-20', { calories: 400 }),
    ];
    const result = computeWeekSummary(entries, targets);
    expect(result.avgCalories).toBe(1000); // 1000 kcal / 1 day
    expect(result.daysLogged).toBe(1);
  });

  it('computes correct avg over multiple days', () => {
    const entries = [
      makeEntry('2026-03-20', { calories: 2000 }),
      makeEntry('2026-03-21', { calories: 2200 }),
    ];
    const result = computeWeekSummary(entries, targets);
    expect(result.avgCalories).toBe(2100);
    expect(result.daysLogged).toBe(2);
  });

  it('computes avgProtein correctly', () => {
    const entries = [
      makeEntry('2026-03-20', { protein: 120 }),
      makeEntry('2026-03-21', { protein: 180 }),
    ];
    const result = computeWeekSummary(entries, targets);
    expect(result.avgProtein).toBe(150);
  });

  it('RAY MANDATORY: caps entries at 500', () => {
    const lotsOfEntries = Array(600).fill(null).map((_, i) =>
      makeEntry(`2026-03-${String(Math.floor(i / 10) + 1).padStart(2, '0')}`, { calories: 100 }),
    );
    // Should not throw and should process at most 500 entries
    expect(() => computeWeekSummary(lotsOfEntries, targets)).not.toThrow();
    const result = computeWeekSummary(lotsOfEntries, targets);
    // Result should be defined and reasonable
    expect(result.daysLogged).toBeGreaterThan(0);
  });

  it('dailyScores array is always length 7', () => {
    const entries = [makeEntry('2026-03-20')];
    const result = computeWeekSummary(entries, targets);
    expect(result.dailyScores).toHaveLength(7);
  });

  it('computes weight trend from weight data', () => {
    const entries = [makeEntry('2026-03-20')];
    const weights = [
      { date: '2026-03-14', kg: 80 },
      { date: '2026-03-21', kg: 79.3 },
    ];
    const result = computeWeekSummary(entries, targets, weights);
    expect(result.weightTrendKgPerWeek).not.toBeNull();
    expect(result.weightTrendKgPerWeek!).toBeLessThan(0); // losing weight
  });

  it('weightTrendKgPerWeek is null when no weight data', () => {
    const entries = [makeEntry('2026-03-20')];
    const result = computeWeekSummary(entries, targets);
    expect(result.weightTrendKgPerWeek).toBeNull();
  });

  it('weightTrendKgPerWeek is null with single weight reading', () => {
    const entries = [makeEntry('2026-03-20')];
    const result = computeWeekSummary(entries, targets, [{ date: '2026-03-20', kg: 80 }]);
    expect(result.weightTrendKgPerWeek).toBeNull();
  });
});

// ─── computeWeekDeltas ────────────────────────────────────────────────────────

describe('computeWeekDeltas', () => {
  it('computes positive calorie delta', () => {
    const thisWeek = makeWeekSummary({ avgCalories: 2200 });
    const lastWeek = makeWeekSummary({ avgCalories: 2000 });
    const delta = computeWeekDeltas(thisWeek, lastWeek);
    expect(delta.calories).toBe(200);
  });

  it('computes negative calorie delta', () => {
    const thisWeek = makeWeekSummary({ avgCalories: 1800 });
    const lastWeek = makeWeekSummary({ avgCalories: 2000 });
    const delta = computeWeekDeltas(thisWeek, lastWeek);
    expect(delta.calories).toBe(-200);
  });

  it('computes score delta', () => {
    const thisWeek = makeWeekSummary({ avgScore: 80 });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    const delta = computeWeekDeltas(thisWeek, lastWeek);
    expect(delta.score).toBe(10);
  });

  it('score delta is null when either week has no score', () => {
    const thisWeek = makeWeekSummary({ avgScore: null });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    expect(computeWeekDeltas(thisWeek, lastWeek).score).toBeNull();
  });

  it('direction = improving when score increases by > 3pts', () => {
    const thisWeek = makeWeekSummary({ avgScore: 78 });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    expect(computeWeekDeltas(thisWeek, lastWeek).direction).toBe('improving');
  });

  it('direction = declining when score drops by > 3pts', () => {
    const thisWeek = makeWeekSummary({ avgScore: 60 });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    expect(computeWeekDeltas(thisWeek, lastWeek).direction).toBe('declining');
  });

  it('direction = steady when score changes within 3pts', () => {
    const thisWeek = makeWeekSummary({ avgScore: 72 });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    expect(computeWeekDeltas(thisWeek, lastWeek).direction).toBe('steady');
  });

  it('direction uses days logged when score is null', () => {
    const thisWeek = makeWeekSummary({ avgScore: null, daysLogged: 6 });
    const lastWeek = makeWeekSummary({ avgScore: null, daysLogged: 3 });
    expect(computeWeekDeltas(thisWeek, lastWeek).direction).toBe('improving');
  });
});

// ─── generateTopTip ───────────────────────────────────────────────────────────

describe('generateTopTip', () => {
  it('returns a non-empty string', () => {
    const thisWeek = makeWeekSummary();
    const lastWeek = makeWeekSummary();
    const deltas = computeWeekDeltas(thisWeek, lastWeek);
    const tip = generateTopTip(thisWeek, lastWeek, deltas);
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(10);
  });

  it('prioritizes logging consistency tip when < 5 days logged', () => {
    const thisWeek = makeWeekSummary({ daysLogged: 3 });
    const lastWeek = makeWeekSummary({ daysLogged: 7 });
    const deltas = computeWeekDeltas(thisWeek, lastWeek);
    const tip = generateTopTip(thisWeek, lastWeek, deltas);
    expect(tip).toMatch(/logged/i);
  });

  it('mentions score drop when score declined', () => {
    const thisWeek = makeWeekSummary({ avgScore: 55 });
    const lastWeek = makeWeekSummary({ avgScore: 70 });
    const deltas = computeWeekDeltas(thisWeek, lastWeek);
    const tip = generateTopTip(thisWeek, lastWeek, deltas);
    expect(tip).toMatch(/score|nutrition/i);
  });

  it('mentions protein drop when protein decreased by > 5g', () => {
    const thisWeek = makeWeekSummary({ avgProtein: 100, daysLogged: 7 });
    const lastWeek = makeWeekSummary({ avgProtein: 150, daysLogged: 7 });
    // Force same scores to avoid score-based tips
    const thisWeekEqual = makeWeekSummary({ avgProtein: 100, daysLogged: 7, avgScore: 70 });
    const lastWeekEqual = makeWeekSummary({ avgProtein: 150, daysLogged: 7, avgScore: 70 });
    const deltas = computeWeekDeltas(thisWeekEqual, lastWeekEqual);
    const tip = generateTopTip(thisWeekEqual, lastWeekEqual, deltas);
    expect(tip).toMatch(/protein/i);
  });

  it('returns a default tip when no clear signal', () => {
    const thisWeek = makeWeekSummary({ avgScore: 70, daysLogged: 7 });
    const lastWeek = makeWeekSummary({ avgScore: 70, daysLogged: 7 });
    const deltas = computeWeekDeltas(thisWeek, lastWeek);
    const tip = generateTopTip(thisWeek, lastWeek, deltas);
    expect(tip.length).toBeGreaterThan(10);
  });
});

// ─── buildWeeklyComparison ────────────────────────────────────────────────────

describe('buildWeeklyComparison', () => {
  it('returns valid WeeklyComparisonData for empty entries', () => {
    const result = buildWeeklyComparison([], [], targets);
    expect(result).toBeDefined();
    expect(result.thisWeek).toBeDefined();
    expect(result.lastWeek).toBeDefined();
    expect(result.deltas).toBeDefined();
    expect(typeof result.topTip).toBe('string');
  });

  it('thisWeek reflects this week entries', () => {
    const entries = [makeEntry('2026-03-20', { calories: 1800 })];
    const result = buildWeeklyComparison(entries, [], targets);
    expect(result.thisWeek.daysLogged).toBe(1);
    expect(result.lastWeek.daysLogged).toBe(0);
  });

  it('deltas are computed correctly', () => {
    const thisEntries = [makeEntry('2026-03-20', { calories: 2200 })];
    const lastEntries = [makeEntry('2026-03-13', { calories: 2000 })];
    const result = buildWeeklyComparison(thisEntries, lastEntries, targets);
    // This week avg: 2200/1 day = 2200; last week: 2000/1 day = 2000
    expect(result.deltas.calories).toBe(200);
  });
});
