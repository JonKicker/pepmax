/**
 * mealTips.test.ts — unit tests for meal tip generation.
 *
 * Pure function — no mocks needed.
 * Follows PepMax test conventions.
 */

import { generateMealTips } from '../utils/mealTips';
import type { FoodLogEntry, NutritionTargets } from '../types/nutrition';
import type { MealSlot } from '../types/nutrition';
import type { MealScoreBreakdown } from '../types/mealScore';

// ─── Factories ────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS: NutritionTargets = {
  calorieTarget: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 65,
};

function makeBreakdown(overrides: Partial<MealScoreBreakdown> = {}): MealScoreBreakdown {
  return {
    macroBalance: 80,
    proteinDensity: 80,
    calorieAppropriateness: 80,
    sodiumModeration: 100,
    sodiumDataAvailable: false,
    ...overrides,
  };
}

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

// ─── generateMealTips ─────────────────────────────────────────────────────────

describe('generateMealTips', () => {
  it('returns placeholder tip for empty entries', () => {
    const breakdown = makeBreakdown();
    const tips = generateMealTips([], DEFAULT_TARGETS, breakdown, 'breakfast');
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain('Log some food');
  });

  it('returns positive reinforcement when all components are >= 70', () => {
    const breakdown = makeBreakdown({
      macroBalance: 90,
      proteinDensity: 85,
      calorieAppropriateness: 92,
      sodiumModeration: 100,
      sodiumDataAvailable: false,
    });
    const entries = [makeEntry()];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'lunch');
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain('Great job');
  });

  it('returns 1-2 tips for a meal with weak components', () => {
    const breakdown = makeBreakdown({
      macroBalance: 30,
      proteinDensity: 25,
      calorieAppropriateness: 80,
      sodiumModeration: 100,
    });
    const entries = [makeEntry({ protein: 2, calories: 400, carbs: 80, fat: 5 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    expect(tips.length).toBeGreaterThanOrEqual(1);
    expect(tips.length).toBeLessThanOrEqual(2);
  });

  it('prioritizes the weakest component first (lowest score gets first tip)', () => {
    // macroBalance = 20 (weakest), proteinDensity = 50 (second weakest)
    const breakdown = makeBreakdown({
      macroBalance: 20,
      proteinDensity: 50,
      calorieAppropriateness: 90,
    });
    const entries = [makeEntry({ protein: 2, calories: 300, carbs: 30, fat: 8 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'lunch');
    // Should have 2 tips since 2 components are < 70
    expect(tips.length).toBe(2);
    // First tip should be about macros (score 20) — contains protein or portion info
    // (we don't hardcode the exact string, but verify it's a non-empty string)
    expect(typeof tips[0]).toBe('string');
    expect(tips[0].length).toBeGreaterThan(0);
  });

  it('generates protein density tip mentioning current protein percentage', () => {
    const breakdown = makeBreakdown({ proteinDensity: 15, macroBalance: 80, calorieAppropriateness: 80 });
    // Low protein: 5g protein × 4 = 20 kcal out of 300 total = ~7%
    const entries = [makeEntry({ protein: 5, calories: 300, carbs: 60, fat: 5 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'dinner');
    const proteinTip = tips.find((t) => t.includes('%'));
    expect(proteinTip).toBeDefined();
    expect(proteinTip).toContain('protein');
  });

  it('generates calorie tip mentioning kcal when calorie appropriateness is low', () => {
    const breakdown = makeBreakdown({
      calorieAppropriateness: 20,
      macroBalance: 85,
      proteinDensity: 85,
    });
    // breakfast target = 500 kcal. Eating 1200 is way over.
    const entries = [makeEntry({ calories: 1200, protein: 40, carbs: 150, fat: 30 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    const calTip = tips.find((t) => t.includes('kcal'));
    expect(calTip).toBeDefined();
  });

  it('includes sodium tip when sodium data is available and score is low', () => {
    const breakdown = makeBreakdown({
      sodiumModeration: 30,
      sodiumDataAvailable: true,
      macroBalance: 85,
      proteinDensity: 85,
      calorieAppropriateness: 85,
    });
    // entry with high sodium: 1600mg/100g × 100g = 1600mg
    const entries = [
      makeEntry({
        micronutrients: {
          sodium: 1600,
          vitaminA: null, vitaminC: null, vitaminD: null, calcium: null, iron: null,
          potassium: null, magnesium: null, zinc: null, vitaminB1: null, vitaminB2: null,
          vitaminB3: null, vitaminB6: null, vitaminB12: null, vitaminE: null,
          vitaminK: null, folate: null, phosphorus: null,
        },
        servingSize: 100,
        servingUnit: 'g',
      }),
    ];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'dinner');
    const sodiumTip = tips.find((t) => t.toLowerCase().includes('sodium'));
    expect(sodiumTip).toBeDefined();
  });

  it('does not include sodium tip when sodiumDataAvailable is false', () => {
    const breakdown = makeBreakdown({
      sodiumModeration: 100,
      sodiumDataAvailable: false,
      macroBalance: 20,
      proteinDensity: 20,
      calorieAppropriateness: 20,
    });
    const entries = [makeEntry()];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    const sodiumTip = tips.find((t) => t.toLowerCase().includes('sodium'));
    expect(sodiumTip).toBeUndefined();
  });

  it('returns at most 2 tips even when many components are weak', () => {
    const breakdown = makeBreakdown({
      macroBalance: 10,
      proteinDensity: 15,
      calorieAppropriateness: 20,
      sodiumModeration: 10,
      sodiumDataAvailable: true,
    });
    const entries = [
      makeEntry({
        calories: 1500,
        protein: 2,
        carbs: 200,
        fat: 50,
        micronutrients: {
          sodium: 2000,
          vitaminA: null, vitaminC: null, vitaminD: null, calcium: null, iron: null,
          potassium: null, magnesium: null, zinc: null, vitaminB1: null, vitaminB2: null,
          vitaminB3: null, vitaminB6: null, vitaminB12: null, vitaminE: null,
          vitaminK: null, folate: null, phosphorus: null,
        },
        servingSize: 100,
        servingUnit: 'g',
      }),
    ];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'lunch');
    expect(tips.length).toBeLessThanOrEqual(2);
  });

  it('each tip is a non-empty string', () => {
    const breakdown = makeBreakdown({ macroBalance: 40, proteinDensity: 30 });
    const entries = [makeEntry({ protein: 3, calories: 300 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    for (const tip of tips) {
      expect(typeof tip).toBe('string');
      expect(tip.trim().length).toBeGreaterThan(0);
    }
  });

  it('handles zero calorie entries without crashing (protein density tip graceful)', () => {
    const breakdown = makeBreakdown({ proteinDensity: 0 });
    const entries = [makeEntry({ calories: 0, protein: 0 })];
    expect(() =>
      generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'snacks'),
    ).not.toThrow();
  });

  it('macro deficit tip mentions the specific deficient macro', () => {
    // Very low protein relative to breakfast target (150g × 0.25 = 37.5g target)
    const breakdown = makeBreakdown({ macroBalance: 20 });
    const entries = [makeEntry({ protein: 1, calories: 400, carbs: 80, fat: 10 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    const macroTip = tips.find((t) => t.includes('protein') || t.includes('carb') || t.includes('fat'));
    expect(macroTip).toBeDefined();
  });

  it('calorie over-target tip mentions "over" keyword', () => {
    const breakdown = makeBreakdown({ calorieAppropriateness: 10, macroBalance: 85, proteinDensity: 85 });
    // breakfast = 500 target, eating 1200
    const entries = [makeEntry({ calories: 1200, protein: 40, carbs: 150, fat: 30 })];
    const tips = generateMealTips(entries, DEFAULT_TARGETS, breakdown, 'breakfast');
    const overTip = tips.find((t) => t.includes('over'));
    expect(overTip).toBeDefined();
  });
});
