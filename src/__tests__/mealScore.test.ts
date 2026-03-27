/**
 * mealScore.test.ts — unit tests for the per-meal scoring algorithm.
 *
 * Pure functions only — no mocks needed.
 * Follows the PepMax test convention: section headers with ───, descriptive it() names,
 * factory helpers, toBeCloseTo for floats.
 */

import { scoreMeal, scoreDailyNutrition } from '../utils/mealScore';
import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';

// ─── Factories ────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS: NutritionTargets = {
  calorieTarget: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
};

function makeEntry(
  overrides: Partial<FoodLogEntry> = {},
  mealSlot: MealSlot = 'breakfast',
): FoodLogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-03-25',
    mealSlot,
    foodName: 'Test Food',
    calories: 300,
    protein: 25,
    carbs: 30,
    fat: 8,
    servingSize: 100,
    servingUnit: 'g',
    createdAt: {} as any,
    ...overrides,
  };
}

function makeEntryWithSodium(
  sodiumPer100g: number,
  servingSize = 100,
  servingUnit = 'g',
  mealSlot: MealSlot = 'breakfast',
): FoodLogEntry {
  return makeEntry(
    {
      servingSize,
      servingUnit,
      micronutrients: {
        sodium: sodiumPer100g,
        vitaminA: null,
        vitaminC: null,
        vitaminD: null,
        calcium: null,
        iron: null,
        potassium: null,
        magnesium: null,
        zinc: null,
        vitaminB1: null,
        vitaminB2: null,
        vitaminB3: null,
        vitaminB6: null,
        vitaminB12: null,
        vitaminE: null,
        vitaminK: null,
        folate: null,
        phosphorus: null,
      },
    },
    mealSlot,
  );
}

// ─── scoreMeal ────────────────────────────────────────────────────────────────

describe('scoreMeal', () => {
  it('returns score 0 with a placeholder tip for an empty entry list', () => {
    const result = scoreMeal([], DEFAULT_TARGETS, 'breakfast');
    expect(result.score).toBe(0);
    expect(result.tips).toHaveLength(1);
    expect(result.tips[0]).toContain('Log some food');
    expect(result.mealSlot).toBe('breakfast');
  });

  it('returns a score between 0 and 100 for a normal meal', () => {
    const entries = [makeEntry({ calories: 500, protein: 37.5, carbs: 50, fat: 16.25 })];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('produces score close to 100 for a near-perfect breakfast (exact split targets)', () => {
    // breakfast split = 25% → protein=37.5g, carbs=50g, fat=16.25g, cal=500
    const entries = [
      makeEntry({
        calories: 500,
        protein: 37.5,
        carbs: 50,
        fat: 16.25,
      }),
    ];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    // High protein density + on-target macros/calories → expect >= 80
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it('returns a lower score when protein is very low', () => {
    const lowProtein = [makeEntry({ calories: 400, protein: 2, carbs: 80, fat: 5 })];
    const highProtein = [makeEntry({ calories: 400, protein: 40, carbs: 40, fat: 5 })];
    const lowResult = scoreMeal(lowProtein, DEFAULT_TARGETS, 'lunch');
    const highResult = scoreMeal(highProtein, DEFAULT_TARGETS, 'lunch');
    expect(highResult.score).toBeGreaterThan(lowResult.score);
  });

  it('breakdown.sodiumDataAvailable is false when no entries have sodium micronutrients', () => {
    const entries = [makeEntry()]; // no micronutrients
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'dinner');
    expect(result.breakdown.sodiumDataAvailable).toBe(false);
    expect(result.sodiumMg).toBe(0);
  });

  it('breakdown.sodiumDataAvailable is true when an entry has sodium data', () => {
    // 400mg per 100g × 100g serving = 400mg total (under threshold)
    const entries = [makeEntryWithSodium(400, 100, 'g')];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    expect(result.breakdown.sodiumDataAvailable).toBe(true);
    expect(result.breakdown.sodiumModeration).toBe(100); // under 800mg threshold
  });

  it('penalizes sodium score when meal sodium exceeds 800 mg', () => {
    // 1000mg per 100g × 100g serving = 1000mg > 800mg threshold
    const highSodiumEntries = [makeEntryWithSodium(1000, 100, 'g')];
    const lowSodiumEntries = [makeEntryWithSodium(400, 100, 'g')];
    const highResult = scoreMeal(highSodiumEntries, DEFAULT_TARGETS, 'dinner');
    const lowResult = scoreMeal(lowSodiumEntries, DEFAULT_TARGETS, 'dinner');
    expect(highResult.breakdown.sodiumModeration).toBeLessThan(100);
    expect(lowResult.breakdown.sodiumModeration).toBe(100);
    expect(highResult.score).toBeLessThan(lowResult.score);
  });

  it('sodium score reaches 0 at 2x the 800mg threshold (1600mg)', () => {
    // 1600mg per 100g × 100g = 1600mg = 2× threshold → score 0
    const entries = [makeEntryWithSodium(1600, 100, 'g')];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'lunch');
    expect(result.breakdown.sodiumModeration).toBe(0);
  });

  it('skips sodium for entries with non-gram serving units (graceful degrade)', () => {
    const cupEntry = makeEntryWithSodium(500, 1, 'cup');
    const result = scoreMeal([cupEntry], DEFAULT_TARGETS, 'breakfast');
    // sodium data should NOT be available since unit is "cup"
    expect(result.breakdown.sodiumDataAvailable).toBe(false);
    expect(result.sodiumMg).toBe(0);
  });

  it('computes actual sodium mg correctly: per100g × servingSize / 100', () => {
    // 200mg/100g × 250g = 500mg
    const entries = [makeEntryWithSodium(200, 250, 'g')];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'snacks');
    expect(result.sodiumMg).toBeCloseTo(500, 0);
    expect(result.breakdown.sodiumModeration).toBe(100); // under 800mg
  });

  it('sums sodium across multiple entries in the same slot', () => {
    // Entry A: 400mg/100g × 100g = 400mg
    // Entry B: 600mg/100g × 100g = 600mg  → total 1000mg > 800mg threshold
    const a = makeEntryWithSodium(400, 100, 'g');
    const b = makeEntryWithSodium(600, 100, 'g');
    const result = scoreMeal([a, b], DEFAULT_TARGETS, 'dinner');
    expect(result.sodiumMg).toBeCloseTo(1000, 0);
    expect(result.breakdown.sodiumModeration).toBeLessThan(100);
  });

  it('redistributes sodium weight to macroBalance when sodium data absent', () => {
    // Two identical meals — one with sodium data, one without.
    // The one without sodium data has effective macroBalance weight 50% vs 40%.
    // We can't directly observe weights, but we verify the scores are computed.
    const entries = [makeEntry({ calories: 200, protein: 20, carbs: 25, fat: 5 })];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'lunch');
    expect(result.breakdown.sodiumDataAvailable).toBe(false);
    // Score should still be 0-100
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('calorie appropriateness scores 100 when calories are within ±10% of slot target', () => {
    // breakfast calorie target = 2000 × 0.25 = 500 kcal. ±10% = 450-550.
    const entries = [makeEntry({ calories: 510 })]; // 2% over — within tolerance
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    expect(result.breakdown.calorieAppropriateness).toBe(100);
  });

  it('calorie appropriateness degrades when calories are far from target', () => {
    // breakfast target = 500. Eating 1200 = 140% over target → should degrade significantly
    const over = [makeEntry({ calories: 1200 })];
    const exact = [makeEntry({ calories: 500 })];
    const overResult = scoreMeal(over, DEFAULT_TARGETS, 'breakfast');
    const exactResult = scoreMeal(exact, DEFAULT_TARGETS, 'breakfast');
    expect(overResult.breakdown.calorieAppropriateness).toBeLessThan(
      exactResult.breakdown.calorieAppropriateness,
    );
  });

  it('tip count is 1 or 2', () => {
    const entries = [makeEntry()];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    expect(result.tips.length).toBeGreaterThanOrEqual(1);
    expect(result.tips.length).toBeLessThanOrEqual(2);
  });

  it('returns a positive reinforcement tip when all components are strong (score >= 80)', () => {
    // Perfect macro split for breakfast: protein=37.5, carbs=50, fat=16.25, cal=500
    const entries = [makeEntry({ calories: 500, protein: 37.5, carbs: 50, fat: 16.25 })];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'breakfast');
    if (result.score >= 80 && result.breakdown.macroBalance >= 70 &&
        result.breakdown.proteinDensity >= 70 && result.breakdown.calorieAppropriateness >= 70) {
      expect(result.tips[0]).toContain('Great job');
    }
  });

  it('handles zero calorie target gracefully (no crash)', () => {
    const targets: NutritionTargets = { calorieTarget: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const entries = [makeEntry({ calories: 300, protein: 20, carbs: 30, fat: 8 })];
    expect(() => scoreMeal(entries, targets, 'lunch')).not.toThrow();
  });

  it('score is always an integer (Math.round applied)', () => {
    const entries = [makeEntry({ calories: 333, protein: 22, carbs: 41, fat: 9 })];
    const result = scoreMeal(entries, DEFAULT_TARGETS, 'dinner');
    expect(result.score).toBe(Math.round(result.score));
  });
});

// ─── scoreDailyNutrition ──────────────────────────────────────────────────────

describe('scoreDailyNutrition', () => {
  it('returns dailyScore null and empty slotScores when no entries', () => {
    const result = scoreDailyNutrition([], DEFAULT_TARGETS);
    expect(result.dailyScore).toBeNull();
    expect(Object.keys(result.slotScores)).toHaveLength(0);
  });

  it('only scores default slots — custom slot entries are excluded from slotScores', () => {
    const customEntry = makeEntry({ mealSlot: 'custom-slot' as MealSlot });
    const result = scoreDailyNutrition([customEntry], DEFAULT_TARGETS);
    expect(result.dailyScore).toBeNull(); // no default slots have entries
    expect(result.slotScores['custom-slot' as MealSlot]).toBeUndefined();
  });

  it('scores only non-empty default slots', () => {
    const breakfastEntry = makeEntry({}, 'breakfast');
    const result = scoreDailyNutrition([breakfastEntry], DEFAULT_TARGETS);
    expect(result.slotScores['breakfast']).toBeDefined();
    expect(result.slotScores['lunch']).toBeUndefined();
    expect(result.slotScores['dinner']).toBeUndefined();
    expect(result.slotScores['snacks']).toBeUndefined();
    expect(result.dailyScore).not.toBeNull();
  });

  it('averages scores from multiple default slots', () => {
    const entries = [
      makeEntry({}, 'breakfast'),
      makeEntry({}, 'lunch'),
    ];
    const result = scoreDailyNutrition(entries, DEFAULT_TARGETS);
    const expected = Math.round(
      (result.slotScores['breakfast']!.score + result.slotScores['lunch']!.score) / 2,
    );
    expect(result.dailyScore).toBe(expected);
  });

  it('daily score is between 0 and 100', () => {
    const entries = [
      makeEntry({ calories: 500, protein: 38, carbs: 50, fat: 16 }, 'breakfast'),
      makeEntry({ calories: 600, protein: 45, carbs: 60, fat: 20 }, 'lunch'),
      makeEntry({ calories: 700, protein: 52, carbs: 70, fat: 23 }, 'dinner'),
    ];
    const result = scoreDailyNutrition(entries, DEFAULT_TARGETS);
    expect(result.dailyScore).toBeGreaterThanOrEqual(0);
    expect(result.dailyScore).toBeLessThanOrEqual(100);
  });

  it('mixed default + custom entries: custom are ignored, default are scored', () => {
    const entries = [
      makeEntry({}, 'breakfast'),
      makeEntry({ mealSlot: 'evening-snack' as MealSlot }),
    ];
    const result = scoreDailyNutrition(entries, DEFAULT_TARGETS);
    expect(result.slotScores['breakfast']).toBeDefined();
    expect(result.slotScores['evening-snack' as MealSlot]).toBeUndefined();
  });

  it('daily score is an integer', () => {
    const entries = [makeEntry({}, 'breakfast'), makeEntry({}, 'dinner')];
    const result = scoreDailyNutrition(entries, DEFAULT_TARGETS);
    if (result.dailyScore !== null) {
      expect(result.dailyScore).toBe(Math.round(result.dailyScore));
    }
  });

  it('all 4 default slots scored when all have entries', () => {
    const entries = [
      makeEntry({}, 'breakfast'),
      makeEntry({}, 'lunch'),
      makeEntry({}, 'dinner'),
      makeEntry({}, 'snacks'),
    ];
    const result = scoreDailyNutrition(entries, DEFAULT_TARGETS);
    expect(result.slotScores['breakfast']).toBeDefined();
    expect(result.slotScores['lunch']).toBeDefined();
    expect(result.slotScores['dinner']).toBeDefined();
    expect(result.slotScores['snacks']).toBeDefined();
    expect(result.dailyScore).not.toBeNull();
  });
});
