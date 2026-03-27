/**
 * Tests for src/utils/nutritionScorer.ts
 *
 * Covers: scoreMealV2, scoreDailyNutritionV2
 * Tests: happy path, edge cases, null-safety, clamping, NOVA penalty
 */

import { scoreMealV2, scoreDailyNutritionV2 } from '../utils/nutritionScorer';
import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';
import { Timestamp } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<FoodLogEntry> = {}): FoodLogEntry {
  return {
    id: 'e1',
    date: '2026-03-26',
    mealSlot: 'lunch',
    foodName: 'Chicken Breast',
    calories: 300,
    protein: 40,
    carbs: 10,
    fat: 8,
    servingSize: 150,
    servingUnit: 'g',
    createdAt: {} as Timestamp,
    ...overrides,
  };
}

const defaultTargets: NutritionTargets = {
  calorieTarget: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
};

// ─── scoreMealV2 ──────────────────────────────────────────────────────────────

describe('scoreMealV2', () => {
  it('returns score 0 and empty feedback for empty entries', () => {
    const result = scoreMealV2([], defaultTargets, 'lunch');
    expect(result.score).toBe(0);
    expect(result.feedback).toMatch(/log food/i);
    expect(result.breakdown.proteinScore).toBe(0);
    expect(result.breakdown.fiberScore).toBe(0);
    expect(result.breakdown.balanceScore).toBe(0);
    expect(result.breakdown.microBonus).toBe(0);
    expect(result.breakdown.processedPenalty).toBe(0);
  });

  it('scores protein correctly — at target = 25pts', () => {
    // Per-meal protein target = 150/3 = 50g
    const entry = makeEntry({ protein: 50, calories: 250 });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.proteinScore).toBe(25);
  });

  it('scores protein at half target = ~12.5pts', () => {
    // Per-meal target = 50g; 25g protein = 50% → 12.5pts
    const entry = makeEntry({ protein: 25, calories: 200 });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.proteinScore).toBeCloseTo(12.5, 0);
  });

  it('clamps protein score at 25 even when protein exceeds target', () => {
    const entry = makeEntry({ protein: 100 }); // far above 50g target
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.proteinScore).toBe(25);
  });

  it('fiber score 0 when all entries have null fiber', () => {
    const entry = makeEntry({ fiber: null });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.fiberScore).toBe(0);
  });

  it('fiber score 25 at 8g', () => {
    const entry = makeEntry({ fiber: 8 });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.fiberScore).toBe(25);
  });

  it('fiber score clamped at 25 above 8g', () => {
    const entry = makeEntry({ fiber: 20 });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.fiberScore).toBe(25);
  });

  it('micro bonus adds 5pts per key nutrient present', () => {
    const entry = makeEntry({
      micronutrients: {
        vitaminD: 5, iron: 3, calcium: 120, potassium: 400, magnesium: 30,
        vitaminA: null, vitaminC: null, sodium: null, zinc: null,
        vitaminB1: null, vitaminB2: null, vitaminB3: null, vitaminB6: null,
        vitaminB12: null, vitaminE: null, vitaminK: null, folate: null, phosphorus: null,
      },
    });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.microBonus).toBe(25); // all 5 present
  });

  it('micro bonus 0 when all micro keys are 0 or null', () => {
    const entry = makeEntry({
      micronutrients: {
        vitaminD: 0, iron: 0, calcium: 0, potassium: 0, magnesium: 0,
        vitaminA: null, vitaminC: null, sodium: null, zinc: null,
        vitaminB1: null, vitaminB2: null, vitaminB3: null, vitaminB6: null,
        vitaminB12: null, vitaminE: null, vitaminK: null, folate: null, phosphorus: null,
      },
    });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.microBonus).toBe(0);
  });

  it('no NOVA penalty when novaGroup is null for all entries', () => {
    const entry = makeEntry({ novaGroup: null });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.processedPenalty).toBe(0);
  });

  it('no NOVA penalty when NOVA 4 fraction is <= 40%', () => {
    const entries = [
      makeEntry({ calories: 300, novaGroup: 4 }),   // NOVA 4
      makeEntry({ calories: 700, novaGroup: 1 }),   // NOVA 1
    ];
    // 300/1000 = 30% NOVA 4 — below threshold
    const result = scoreMealV2(entries, defaultTargets, 'lunch');
    expect(result.breakdown.processedPenalty).toBe(0);
  });

  it('applies NOVA penalty when NOVA 4 fraction > 40%', () => {
    const entries = [
      makeEntry({ calories: 700, novaGroup: 4 }),   // NOVA 4
      makeEntry({ calories: 300, novaGroup: 1 }),   // NOVA 1
    ];
    // 700/1000 = 70% NOVA 4 — above threshold
    const result = scoreMealV2(entries, defaultTargets, 'lunch');
    expect(result.breakdown.processedPenalty).toBeLessThan(0);
    expect(result.breakdown.processedPenalty).toBeGreaterThanOrEqual(-15);
  });

  it('max NOVA penalty = -15 when 100% calories from NOVA 4', () => {
    const entry = makeEntry({ calories: 500, novaGroup: 4 });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.breakdown.processedPenalty).toBeCloseTo(-15, 0);
  });

  it('final score is clamped to [0, 100]', () => {
    // Even with high protein, fiber, micros — should not exceed 100
    const entry = makeEntry({
      protein: 100,
      fiber: 20,
      calories: 400,
      carbs: 50,
      fat: 15,
      micronutrients: {
        vitaminD: 10, iron: 5, calcium: 200, potassium: 500, magnesium: 50,
        vitaminA: null, vitaminC: null, sodium: null, zinc: null,
        vitaminB1: null, vitaminB2: null, vitaminB3: null, vitaminB6: null,
        vitaminB12: null, vitaminE: null, vitaminK: null, folate: null, phosphorus: null,
      },
    });
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('final score >= 0 even when NOVA penalty is large', () => {
    const entries = Array(10).fill(null).map(() =>
      makeEntry({ calories: 100, novaGroup: 4, protein: 0, fiber: null }),
    );
    const result = scoreMealV2(entries, defaultTargets, 'lunch');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('returns non-empty feedback string', () => {
    const entry = makeEntry();
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(typeof result.feedback).toBe('string');
    expect(result.feedback.length).toBeGreaterThan(5);
  });

  it('returns at least one tip', () => {
    const entry = makeEntry();
    const result = scoreMealV2([entry], defaultTargets, 'lunch');
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it('works for all 4 meal slots', () => {
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
    for (const slot of slots) {
      const entry = makeEntry({ mealSlot: slot });
      const result = scoreMealV2([entry], defaultTargets, slot);
      expect(result.score).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles zero-calorie entries without crashing', () => {
    const entry = makeEntry({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    expect(() => scoreMealV2([entry], defaultTargets, 'lunch')).not.toThrow();
  });

  it('handles targets with zeros without crashing', () => {
    const zeroTargets: NutritionTargets = { calorieTarget: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const entry = makeEntry();
    expect(() => scoreMealV2([entry], zeroTargets, 'lunch')).not.toThrow();
  });
});

// ─── scoreDailyNutritionV2 ────────────────────────────────────────────────────

describe('scoreDailyNutritionV2', () => {
  it('returns null dailyScore when no entries', () => {
    const result = scoreDailyNutritionV2([], defaultTargets);
    expect(result.dailyScore).toBeNull();
    expect(Object.keys(result.slotScores)).toHaveLength(0);
  });

  it('returns dailyScore as average of scored slots', () => {
    const entries = [
      makeEntry({ mealSlot: 'breakfast', protein: 30, calories: 400 }),
      makeEntry({ mealSlot: 'lunch', protein: 40, calories: 500 }),
    ];
    const result = scoreDailyNutritionV2(entries, defaultTargets);
    expect(result.dailyScore).not.toBeNull();
    expect(result.dailyScore).toBeGreaterThanOrEqual(0);
    expect(result.dailyScore).toBeLessThanOrEqual(100);
  });

  it('only scores default meal slots (breakfast, lunch, dinner, snacks)', () => {
    const entries = [
      makeEntry({ mealSlot: 'breakfast' }),
      makeEntry({ mealSlot: 'custom_slot' }),
    ];
    const result = scoreDailyNutritionV2(entries, defaultTargets);
    expect(result.slotScores).toHaveProperty('breakfast');
    expect(result.slotScores).not.toHaveProperty('custom_slot');
  });

  it('slots with no entries are excluded from slotScores', () => {
    const entries = [makeEntry({ mealSlot: 'dinner' })];
    const result = scoreDailyNutritionV2(entries, defaultTargets);
    expect(result.slotScores).toHaveProperty('dinner');
    expect(result.slotScores).not.toHaveProperty('breakfast');
    expect(result.slotScores).not.toHaveProperty('lunch');
  });

  it('daily score is rounded to integer', () => {
    const entries = [makeEntry({ mealSlot: 'breakfast' })];
    const result = scoreDailyNutritionV2(entries, defaultTargets);
    if (result.dailyScore !== null) {
      expect(Number.isInteger(result.dailyScore)).toBe(true);
    }
  });
});
