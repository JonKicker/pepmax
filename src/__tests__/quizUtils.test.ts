/**
 * quizUtils.test.ts
 *
 * Unit tests for the pure utility functions from src/utils/quizUtils.ts
 * and src/components/onboarding/steps/CheckInDayStep.tsx:
 *   - shouldSkipRecovery (step-skip logic)
 *   - nextStep            (step navigation accounting for skips)
 *   - prevStep            (back navigation using visitedSteps history)
 *   - sanitisePersonalNote (trim + strip control chars + 100-char cap)
 *   - sanitiseCheckInDay  (0–6 clamp + floor)
 *   - getActivityMultiplier (activityCategory → numeric multiplier)
 *   - delay               (Promise timer)
 *
 * All functions are pure — no Firebase, no React, no mocks needed.
 */

import {
  shouldSkipRecovery,
  nextStep,
  prevStep,
  sanitisePersonalNote,
  sanitiseCheckInDay,
  getActivityMultiplier,
  ACTIVITY_MULTIPLIER,
  delay,
} from '../utils/quizUtils';

// Goal and ActivityCategory are both defined in quizUtils (no Firebase deps)
import type { ActivityCategory } from '../utils/quizUtils';

// Convenience type alias for test readability — mirrors profile.ts
type Goal = 'peptides' | 'nutrition' | 'training' | 'cardio';

// ── shouldSkipRecovery ────────────────────────────────────────────────────────

describe('shouldSkipRecovery', () => {
  test('returns true when goals is empty', () => {
    expect(shouldSkipRecovery([])).toBe(true);
  });

  test('returns true when only nutrition selected', () => {
    expect(shouldSkipRecovery(['nutrition'])).toBe(true);
  });

  test('returns true when only peptides selected', () => {
    expect(shouldSkipRecovery(['peptides'])).toBe(true);
  });

  test('returns true when nutrition + peptides (no training or cardio)', () => {
    expect(shouldSkipRecovery(['nutrition', 'peptides'])).toBe(true);
  });

  test('returns false when training is selected', () => {
    expect(shouldSkipRecovery(['training'])).toBe(false);
  });

  test('returns false when cardio is selected', () => {
    expect(shouldSkipRecovery(['cardio'])).toBe(false);
  });

  test('returns false when both training and cardio are selected', () => {
    expect(shouldSkipRecovery(['training', 'cardio'])).toBe(false);
  });

  test('returns false when training is one of many goals', () => {
    expect(shouldSkipRecovery(['nutrition', 'training', 'peptides'])).toBe(false);
  });

  test('returns false when cardio is one of many goals', () => {
    expect(shouldSkipRecovery(['nutrition', 'cardio'])).toBe(false);
  });
});

// ── nextStep ──────────────────────────────────────────────────────────────────

describe('nextStep', () => {
  test('increments normally from step 1 to 2', () => {
    expect(nextStep(1, [])).toBe(2);
  });

  test('increments normally from step 9 to 10 (challenges → vision)', () => {
    expect(nextStep(9, [])).toBe(10);
  });

  test('skips step 11 (recovery) when no training/cardio goals', () => {
    expect(nextStep(10, ['nutrition' as Goal])).toBe(12);
  });

  test('does NOT skip step 11 when training is selected', () => {
    expect(nextStep(10, ['training' as Goal])).toBe(11);
  });

  test('does NOT skip step 11 when cardio is selected', () => {
    expect(nextStep(10, ['cardio' as Goal])).toBe(11);
  });

  test('does NOT skip step 11 when both training and cardio are selected', () => {
    expect(nextStep(10, ['training', 'cardio'] as Goal[])).toBe(11);
  });

  test('increments from 11 to 12 normally', () => {
    expect(nextStep(11, ['training' as Goal])).toBe(12);
  });

  test('increments from 14 to 15 (last step)', () => {
    expect(nextStep(14, ['training' as Goal])).toBe(15);
  });
});

// ── prevStep ──────────────────────────────────────────────────────────────────

describe('prevStep', () => {
  test('returns step 1 with empty history when visited is empty', () => {
    const [step, visited] = prevStep([]);
    expect(step).toBe(1);
    expect(visited).toEqual([]);
  });

  test('pops last visited step from history', () => {
    const [step, visited] = prevStep([1, 2, 3]);
    expect(step).toBe(3);
    expect(visited).toEqual([1, 2]);
  });

  test('works when only one step in history', () => {
    const [step, visited] = prevStep([1]);
    expect(step).toBe(1);
    expect(visited).toEqual([]);
  });

  test('correctly handles skipped step in history (no step 11)', () => {
    // User went: 1 → 2 → ... → 10 → 12 (step 11 was skipped)
    const [step, visited] = prevStep([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(step).toBe(10);
    expect(visited).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('does not mutate the original array', () => {
    const original = [1, 2, 3];
    prevStep(original);
    expect(original).toEqual([1, 2, 3]);
  });
});

// ── sanitiseCheckInDay ────────────────────────────────────────────────────────

describe('sanitiseCheckInDay', () => {
  test('accepts valid values 0–6 unchanged', () => {
    for (let i = 0; i <= 6; i++) {
      expect(sanitiseCheckInDay(i)).toBe(i);
    }
  });

  test('clamps negative values to 0', () => {
    expect(sanitiseCheckInDay(-1)).toBe(0);
    expect(sanitiseCheckInDay(-100)).toBe(0);
  });

  test('clamps values > 6 to 6', () => {
    expect(sanitiseCheckInDay(7)).toBe(6);
    expect(sanitiseCheckInDay(99)).toBe(6);
  });

  test('floors decimal values', () => {
    expect(sanitiseCheckInDay(2.9)).toBe(2);
    expect(sanitiseCheckInDay(5.1)).toBe(5);
  });

  test('floors and clamps combined', () => {
    expect(sanitiseCheckInDay(6.8)).toBe(6);
    expect(sanitiseCheckInDay(-0.1)).toBe(0);
  });
});

// ── sanitisePersonalNote ──────────────────────────────────────────────────────

describe('sanitisePersonalNote', () => {
  test('trims leading and trailing whitespace', () => {
    expect(sanitisePersonalNote('  hello  ')).toBe('hello');
  });

  test('strips ASCII control characters', () => {
    // \x00 NUL, \x01 SOH, \x1F US, \x7F DEL
    expect(sanitisePersonalNote('hello\x00world')).toBe('helloworld');
    expect(sanitisePersonalNote('\x01\x1F\x7Ftest')).toBe('test');
  });

  test('strips newlines and tabs (control chars)', () => {
    expect(sanitisePersonalNote('line1\nline2')).toBe('line1line2');
    expect(sanitisePersonalNote('col1\tcol2')).toBe('col1col2');
  });

  test('caps at 100 characters', () => {
    const long = 'a'.repeat(150);
    expect(sanitisePersonalNote(long)).toHaveLength(100);
  });

  test('leaves normal text unchanged', () => {
    const normal = 'I want to feel confident and strong by summer!';
    expect(sanitisePersonalNote(normal)).toBe(normal);
  });

  test('handles empty string', () => {
    expect(sanitisePersonalNote('')).toBe('');
  });

  test('handles string that is only whitespace', () => {
    expect(sanitisePersonalNote('   ')).toBe('');
  });

  test('trims then caps (trim happens before slice)', () => {
    // 5 spaces + 100 chars + 5 spaces = 110 total, but trimmed = 100, so no slice needed
    const padded = '     ' + 'a'.repeat(100) + '     ';
    const result = sanitisePersonalNote(padded);
    expect(result).toHaveLength(100);
    expect(result).toBe('a'.repeat(100));
  });
});

// ── getActivityMultiplier ─────────────────────────────────────────────────────

describe('getActivityMultiplier', () => {
  test('sedentary maps to 1.2', () => {
    expect(getActivityMultiplier('sedentary')).toBe(1.2);
  });

  test('light maps to 1.375', () => {
    expect(getActivityMultiplier('light')).toBe(1.375);
  });

  test('moderate maps to 1.55', () => {
    expect(getActivityMultiplier('moderate')).toBe(1.55);
  });

  test('active maps to 1.725', () => {
    expect(getActivityMultiplier('active')).toBe(1.725);
  });

  test('null falls back to moderate (1.55)', () => {
    expect(getActivityMultiplier(null)).toBe(1.55);
  });

  test('undefined falls back to moderate (1.55)', () => {
    expect(getActivityMultiplier(undefined)).toBe(1.55);
  });

  test('ACTIVITY_MULTIPLIER map has all four categories', () => {
    const keys = Object.keys(ACTIVITY_MULTIPLIER) as ActivityCategory[];
    expect(keys).toHaveLength(4);
    expect(keys).toContain('sedentary');
    expect(keys).toContain('light');
    expect(keys).toContain('moderate');
    expect(keys).toContain('active');
  });

  test('all multipliers are between 1.0 and 2.5 (sanity check)', () => {
    Object.values(ACTIVITY_MULTIPLIER).forEach((m) => {
      expect(m).toBeGreaterThan(1.0);
      expect(m).toBeLessThan(2.5);
    });
  });
});

// ── delay ─────────────────────────────────────────────────────────────────────

describe('delay', () => {
  test('resolves after the given milliseconds', async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    // Allow 30ms slack for test environment timing variance
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test('returns a Promise', () => {
    const result = delay(0);
    expect(result).toBeInstanceOf(Promise);
    return result; // clean up
  });
});
