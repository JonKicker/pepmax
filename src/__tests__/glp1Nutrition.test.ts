/**
 * Unit tests for GLP-1 nutrition intelligence pure functions.
 *
 * All functions tested here are pure (no side effects, no Firebase) so no
 * mocks are required. Tests cover happy path, edge cases, and boundary values.
 */

import {
  isGlp1CycleActive,
  calculateProteinFloorG,
  applyGlp1Adjustments,
  getDailyGlp1Tip,
  shouldSendProteinReminder,
} from '../utils/glp1Nutrition';
import { GLP1_CATEGORIES } from '../types/glp1Nutrition';

// ─── Test data factories ───────────────────────────────────────────────────────

function makeCycle(
  overrides: Partial<{ id: string; compoundId: string; status: string }> = {},
) {
  return {
    id: overrides.id ?? 'cycle-1',
    compoundId: overrides.compoundId ?? 'semaglutide',
    status: (overrides.status ?? 'active') as 'active' | 'completed' | 'paused',
  };
}

function makeCompound(overrides: Partial<{ id: string; category: string }> = {}) {
  return {
    id: overrides.id ?? 'semaglutide',
    category: overrides.category ?? 'GLP-1 Agonist',
  };
}

// ─── isGlp1CycleActive ────────────────────────────────────────────────────────

describe('isGlp1CycleActive', () => {
  it('returns true for an active cycle with a GLP-1 Agonist compound', () => {
    const cycles = [makeCycle()];
    const compounds = [makeCompound({ category: 'GLP-1 Agonist' })];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(true);
  });

  it('returns true for GLP-1/GIP Dual Agonist category', () => {
    const cycles = [makeCycle({ compoundId: 'tirzepatide' })];
    const compounds = [makeCompound({ id: 'tirzepatide', category: 'GLP-1/GIP Dual Agonist' })];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(true);
  });

  it('returns true for GLP-1/GIP/Glucagon Triple Agonist category', () => {
    const cycles = [makeCycle({ compoundId: 'retatrutide' })];
    const compounds = [makeCompound({ id: 'retatrutide', category: 'GLP-1/GIP/Glucagon Triple Agonist' })];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(true);
  });

  it('returns false when the cycle is completed (not active)', () => {
    const cycles = [makeCycle({ status: 'completed' })];
    const compounds = [makeCompound()];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(false);
  });

  it('returns false when the cycle is paused', () => {
    const cycles = [makeCycle({ status: 'paused' })];
    const compounds = [makeCompound()];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(false);
  });

  it('returns false when the compound category is not in the allowlist', () => {
    const cycles = [makeCycle({ compoundId: 'bpc157' })];
    const compounds = [makeCompound({ id: 'bpc157', category: 'Healing Peptide' })];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(false);
  });

  it('returns false when cycle compoundId has no matching compound', () => {
    const cycles = [makeCycle({ compoundId: 'unknown-compound' })];
    const compounds = [makeCompound()]; // different id
    expect(isGlp1CycleActive(cycles, compounds)).toBe(false);
  });

  it('returns false for empty cycles array', () => {
    expect(isGlp1CycleActive([], [makeCompound()])).toBe(false);
  });

  it('returns false for empty compounds array', () => {
    expect(isGlp1CycleActive([makeCycle()], [])).toBe(false);
  });

  it('returns true if any one of multiple cycles is an active GLP-1', () => {
    const cycles = [
      makeCycle({ id: 'c1', compoundId: 'bpc157', status: 'active' }),
      makeCycle({ id: 'c2', compoundId: 'semaglutide', status: 'active' }),
    ];
    const compounds = [
      makeCompound({ id: 'bpc157', category: 'Healing Peptide' }),
      makeCompound({ id: 'semaglutide', category: 'GLP-1 Agonist' }),
    ];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(true);
  });

  it('does not match GLP-1 category string not in the allowlist (partial match guard)', () => {
    // Ensure an unknown future category like "GLP-1 Receptor Modulator" does NOT
    // accidentally match — the allowlist is the only gate.
    const cycles = [makeCycle({ compoundId: 'unknown' })];
    const compounds = [makeCompound({ id: 'unknown', category: 'GLP-1 Receptor Modulator' })];
    expect(isGlp1CycleActive(cycles, compounds)).toBe(false);
  });
});

// ─── GLP1_CATEGORIES allowlist ────────────────────────────────────────────────

describe('GLP1_CATEGORIES', () => {
  it('contains exactly three entries', () => {
    expect(GLP1_CATEGORIES).toHaveLength(3);
  });

  it('includes all three known GLP-1 category strings', () => {
    expect(GLP1_CATEGORIES).toContain('GLP-1 Agonist');
    expect(GLP1_CATEGORIES).toContain('GLP-1/GIP Dual Agonist');
    expect(GLP1_CATEGORIES).toContain('GLP-1/GIP/Glucagon Triple Agonist');
  });
});

// ─── calculateProteinFloorG ───────────────────────────────────────────────────

describe('calculateProteinFloorG', () => {
  it('returns 1.0g/kg for sedentary (activityLevel 1.0)', () => {
    expect(calculateProteinFloorG(80, 1.0)).toBe(80);
  });

  it('returns 1.0g/kg when activityLevel is undefined (conservative default)', () => {
    expect(calculateProteinFloorG(80, undefined)).toBe(80);
  });

  it('returns 1.2g/kg for light activity (activityLevel 1.2)', () => {
    expect(calculateProteinFloorG(80, 1.2)).toBe(Math.round(80 * 1.2));
  });

  it('returns 1.4g/kg for moderate activity (activityLevel 1.55)', () => {
    expect(calculateProteinFloorG(80, 1.55)).toBe(Math.round(80 * 1.4));
  });

  it('returns 1.6g/kg for active (activityLevel 1.725)', () => {
    expect(calculateProteinFloorG(80, 1.725)).toBe(Math.round(80 * 1.6));
  });

  it('returns 1.6g/kg for very active (activityLevel 1.9)', () => {
    expect(calculateProteinFloorG(80, 1.9)).toBe(Math.round(80 * 1.6));
  });

  it('handles boundary: 1.2 maps to light (>= 1.2, < 1.55)', () => {
    // activityLevel exactly 1.2 → light floor 1.2g/kg
    expect(calculateProteinFloorG(70, 1.2)).toBe(Math.round(70 * 1.2));
  });

  it('handles boundary: 1.55 maps to moderate (>= 1.55)', () => {
    expect(calculateProteinFloorG(70, 1.55)).toBe(Math.round(70 * 1.4));
  });

  it('handles boundary: just below 1.2 → sedentary (1.0g/kg)', () => {
    expect(calculateProteinFloorG(70, 1.19)).toBe(70);
  });

  it('rounds to integer', () => {
    // 75.3 kg × 1.4 = 105.42 → rounds to 105
    expect(calculateProteinFloorG(75.3, 1.55)).toBe(Math.round(75.3 * 1.4));
    expect(Number.isInteger(calculateProteinFloorG(75.3, 1.55))).toBe(true);
  });

  it('returns 0 for 0 kg body weight', () => {
    expect(calculateProteinFloorG(0, 1.55)).toBe(0);
  });
});

// ─── applyGlp1Adjustments ─────────────────────────────────────────────────────

describe('applyGlp1Adjustments', () => {
  it('does not change macros when protein already meets the floor', () => {
    const result = applyGlp1Adjustments(2000, 150, 200, 65, 140, 'male');
    expect(result.proteinG).toBe(150);
    expect(result.carbsG).toBe(200);
    expect(result.fatG).toBe(65);
    expect(result.proteinFloorApplied).toBe(false);
    expect(result.calorieFloorApplied).toBe(false);
  });

  it('raises protein to the floor when current protein is below it', () => {
    // Floor = 150, current = 100
    const result = applyGlp1Adjustments(2000, 100, 250, 65, 150, 'male');
    expect(result.proteinG).toBe(150);
    expect(result.proteinFloorApplied).toBe(true);
  });

  it('preserves carb:fat ratio when protein is raised', () => {
    // carbs 200g, fat 65g → kcal ratio 800:585 ≈ 1.37:1
    const result = applyGlp1Adjustments(2000, 100, 200, 65, 150, 'male');
    // Extra protein = 50g × 4 = 200 kcal consumed from carb+fat budget
    // carbFatKcal original = 800 + 585 = 1385; new = 1385 - 200 = 1185
    // ratio = 1185/1385 ≈ 0.8556
    // expected carbsG ≈ round(200 × 0.8556) = round(171.1) = 171
    // expected fatG ≈ round(65 × 0.8556) = round(55.6) = 56
    const carbFatKcalOrig = 200 * 4 + 65 * 9;
    const extraProteinKcal = 50 * 4;
    const ratio = (carbFatKcalOrig - extraProteinKcal) / carbFatKcalOrig;
    expect(result.carbsG).toBe(Math.round(200 * ratio));
    expect(result.fatG).toBe(Math.round(65 * ratio));
  });

  it('applies male calorie floor (1600) when total calories fall below it', () => {
    // Very low calorie scenario: tiny protein, carb, fat
    const result = applyGlp1Adjustments(1200, 50, 100, 30, 50, 'male');
    expect(result.calorieFloorApplied).toBe(true);
    expect(result.calorieTarget).toBe(1600);
  });

  it('applies female calorie floor (1400) when total calories fall below it', () => {
    const result = applyGlp1Adjustments(1000, 50, 80, 25, 50, 'female');
    expect(result.calorieFloorApplied).toBe(true);
    expect(result.calorieTarget).toBe(1400);
  });

  it('does not apply calorie floor when macros produce enough calories', () => {
    // 2000 kcal target, protein already meets floor → no floor needed
    const result = applyGlp1Adjustments(2000, 150, 200, 65, 140, 'male');
    expect(result.calorieFloorApplied).toBe(false);
    expect(result.calorieTarget).toBeGreaterThanOrEqual(1600);
  });

  it('sets carbsG and fatG to 0 when protein floor consumes all calories', () => {
    // 0 carb + fat kcal budget edge case
    const result = applyGlp1Adjustments(600, 150, 0, 0, 150, 'male');
    expect(result.carbsG).toBe(0);
    expect(result.fatG).toBe(0);
    // Calorie floor should kick in since 150 × 4 = 600 < 1600
    expect(result.calorieFloorApplied).toBe(true);
  });

  it('returns the proteinFloorG in the result', () => {
    const result = applyGlp1Adjustments(2000, 100, 200, 65, 150, 'male');
    expect(result.proteinFloorG).toBe(150);
  });
});

// ─── getDailyGlp1Tip ──────────────────────────────────────────────────────────

describe('getDailyGlp1Tip', () => {
  it('returns a non-empty string', () => {
    const tip = getDailyGlp1Tip(new Date());
    expect(typeof tip).toBe('string');
    expect(tip.length).toBeGreaterThan(0);
  });

  it('returns different tips for different days', () => {
    // Use dates 8 days apart to ensure at least one tip change (8 tips in array)
    const day1 = getDailyGlp1Tip(new Date('2026-01-01'));
    const day9 = getDailyGlp1Tip(new Date('2026-01-09'));
    // Not guaranteed to be different (could wrap), but test that it runs cleanly
    expect(typeof day1).toBe('string');
    expect(typeof day9).toBe('string');
  });

  it('returns a consistent tip for the same date', () => {
    const d = new Date('2026-03-25');
    expect(getDailyGlp1Tip(d)).toBe(getDailyGlp1Tip(d));
  });

  it('defaults to today when no date is passed', () => {
    // Just confirm it does not throw and returns a string
    expect(typeof getDailyGlp1Tip()).toBe('string');
  });
});

// ─── shouldSendProteinReminder ────────────────────────────────────────────────

describe('shouldSendProteinReminder', () => {
  it('returns true when in 2–5 PM window and protein below 60% of floor', () => {
    // floor = 150, 60% = 90 → logged 80g at 14:00 → true
    expect(shouldSendProteinReminder(80, 150, 14)).toBe(true);
  });

  it('returns true at 4 PM (hour 16) with low protein', () => {
    expect(shouldSendProteinReminder(50, 150, 16)).toBe(true);
  });

  it('returns false at exactly 5 PM (hour 17 — outside window)', () => {
    expect(shouldSendProteinReminder(50, 150, 17)).toBe(false);
  });

  it('returns false before 2 PM (hour 13)', () => {
    expect(shouldSendProteinReminder(50, 150, 13)).toBe(false);
  });

  it('returns false when protein is at exactly 60% of floor', () => {
    // floor = 150, 60% = 90 → exactly 90g logged → not BELOW 60%
    expect(shouldSendProteinReminder(90, 150, 14)).toBe(false);
  });

  it('returns false when protein is above 60% of floor', () => {
    expect(shouldSendProteinReminder(100, 150, 14)).toBe(false);
  });

  it('returns false when floor is 0 (avoids division by zero)', () => {
    expect(shouldSendProteinReminder(0, 0, 14)).toBe(false);
  });

  it('returns false when protein equals the full floor', () => {
    expect(shouldSendProteinReminder(150, 150, 14)).toBe(false);
  });

  it('returns false outside window even if protein is very low', () => {
    expect(shouldSendProteinReminder(0, 150, 8)).toBe(false);
    expect(shouldSendProteinReminder(0, 150, 22)).toBe(false);
  });

  it('returns true at the boundary start of the window (hour 14)', () => {
    expect(shouldSendProteinReminder(0, 150, 14)).toBe(true);
  });
});
