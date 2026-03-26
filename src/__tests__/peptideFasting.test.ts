/**
 * peptideFasting.test.ts — Unit tests for src/utils/peptideFasting.ts
 *
 * All functions are pure (no Firestore, no React) — no mocks needed.
 */

import {
  clampPeptideFastingMinutes,
  validatePeptideFastingWindow,
  getDefaultPeptideFastingWindow,
  buildPeptideFastingGuidanceText,
  computeActivePeptideFastingWindows,
  isPeptideFastingActive,
  msUntilPeptideFastingWindowEnds,
  PEPTIDE_FASTING_MAX_MINUTES,
  PEPTIDE_CATEGORY_FASTING_DEFAULTS,
} from '../utils/peptideFasting';
import type { PeptideFastingWindow } from '../types/peptideFasting';
import type { DoseWindowInput } from '../utils/peptideFasting';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeWindow(
  pre = 90,
  post = 90,
  notify = false,
): PeptideFastingWindow {
  return { preInjectionMinutes: pre, postInjectionMinutes: post, notifyWhenWindowEnds: notify };
}

function makeDoseInput(
  overrides: Partial<DoseWindowInput> = {},
): DoseWindowInput {
  return {
    peptideId: 'p-1',
    peptideName: 'Ipamorelin',
    doseTimestampMs: Date.now(),
    fastingWindow: makeWindow(),
    ...overrides,
  };
}

// ─── clampPeptideFastingMinutes ───────────────────────────────────────────────

describe('clampPeptideFastingMinutes', () => {
  it('returns 0 for 0', () => {
    expect(clampPeptideFastingMinutes(0)).toBe(0);
  });

  it('returns the value unchanged for a valid positive number', () => {
    expect(clampPeptideFastingMinutes(90)).toBe(90);
  });

  it('clamps to PEPTIDE_FASTING_MAX_MINUTES when value exceeds maximum', () => {
    expect(clampPeptideFastingMinutes(PEPTIDE_FASTING_MAX_MINUTES + 1)).toBe(
      PEPTIDE_FASTING_MAX_MINUTES,
    );
  });

  it('clamps to PEPTIDE_FASTING_MAX_MINUTES exactly at the boundary', () => {
    expect(clampPeptideFastingMinutes(PEPTIDE_FASTING_MAX_MINUTES)).toBe(
      PEPTIDE_FASTING_MAX_MINUTES,
    );
  });

  it('returns 0 for a negative value', () => {
    expect(clampPeptideFastingMinutes(-10)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(clampPeptideFastingMinutes(NaN)).toBe(0);
  });

  it('returns 0 for Infinity (treated as non-finite, same as NaN)', () => {
    // Infinity is non-finite — clampPeptideFastingMinutes guards against it at the top
    expect(clampPeptideFastingMinutes(Infinity)).toBe(0);
  });

  it('returns -Infinity as 0', () => {
    expect(clampPeptideFastingMinutes(-Infinity)).toBe(0);
  });

  it('rounds decimal values', () => {
    expect(clampPeptideFastingMinutes(89.6)).toBe(90);
    expect(clampPeptideFastingMinutes(89.4)).toBe(89);
  });
});

// ─── validatePeptideFastingWindow ────────────────────────────────────────────

describe('validatePeptideFastingWindow', () => {
  it('returns a valid window unchanged', () => {
    const result = validatePeptideFastingWindow({ preInjectionMinutes: 90, postInjectionMinutes: 60, notifyWhenWindowEnds: true });
    expect(result).toEqual({ preInjectionMinutes: 90, postInjectionMinutes: 60, notifyWhenWindowEnds: true });
  });

  it('defaults missing fields to 0 / false', () => {
    const result = validatePeptideFastingWindow({});
    expect(result).toEqual({ preInjectionMinutes: 0, postInjectionMinutes: 0, notifyWhenWindowEnds: false });
  });

  it('clamps pre value exceeding the maximum', () => {
    const result = validatePeptideFastingWindow({ preInjectionMinutes: 9999, postInjectionMinutes: 30 });
    expect(result!.preInjectionMinutes).toBe(PEPTIDE_FASTING_MAX_MINUTES);
  });

  it('clamps post value exceeding the maximum', () => {
    const result = validatePeptideFastingWindow({ preInjectionMinutes: 30, postInjectionMinutes: 9999 });
    expect(result!.postInjectionMinutes).toBe(PEPTIDE_FASTING_MAX_MINUTES);
  });

  it('clamps negative values to 0', () => {
    const result = validatePeptideFastingWindow({ preInjectionMinutes: -1, postInjectionMinutes: -100 });
    expect(result!.preInjectionMinutes).toBe(0);
    expect(result!.postInjectionMinutes).toBe(0);
  });

  it('preserves notifyWhenWindowEnds = true', () => {
    const result = validatePeptideFastingWindow({ notifyWhenWindowEnds: true });
    expect(result!.notifyWhenWindowEnds).toBe(true);
  });
});

// ─── getDefaultPeptideFastingWindow ──────────────────────────────────────────

describe('getDefaultPeptideFastingWindow', () => {
  it('returns GH Secretagogue defaults (90/90)', () => {
    const result = getDefaultPeptideFastingWindow('GH Secretagogue');
    expect(result.preInjectionMinutes).toBe(90);
    expect(result.postInjectionMinutes).toBe(90);
    expect(result.notifyWhenWindowEnds).toBe(false);
  });

  it('returns GLP-1 defaults (30/30)', () => {
    const result = getDefaultPeptideFastingWindow('GLP-1');
    expect(result.preInjectionMinutes).toBe(30);
    expect(result.postInjectionMinutes).toBe(30);
  });

  it('returns zero window for Healing category', () => {
    const result = getDefaultPeptideFastingWindow('Healing');
    expect(result.preInjectionMinutes).toBe(0);
    expect(result.postInjectionMinutes).toBe(0);
  });

  it('returns zero window for Other category', () => {
    const result = getDefaultPeptideFastingWindow('Other');
    expect(result.preInjectionMinutes).toBe(0);
    expect(result.postInjectionMinutes).toBe(0);
  });

  it('returns zero window when category is undefined', () => {
    const result = getDefaultPeptideFastingWindow(undefined);
    expect(result.preInjectionMinutes).toBe(0);
    expect(result.postInjectionMinutes).toBe(0);
  });

  it('every returned window has notifyWhenWindowEnds = false by default', () => {
    const categories = ['GLP-1', 'GH Secretagogue', 'Healing', 'Other'] as const;
    for (const cat of categories) {
      expect(getDefaultPeptideFastingWindow(cat).notifyWhenWindowEnds).toBe(false);
    }
  });
});

// ─── buildPeptideFastingGuidanceText ─────────────────────────────────────────

describe('buildPeptideFastingGuidanceText', () => {
  it('returns "No fasting required" when both values are 0', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(0, 0));
    expect(text).toContain('No fasting required');
  });

  it('formats pre-only window correctly', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(30, 0));
    expect(text).toContain('30 min');
    expect(text.toLowerCase()).toContain('before');
    expect(text.toLowerCase()).not.toContain('after');
  });

  it('formats post-only window correctly', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(0, 60));
    // 60 min = 1 hr — formatMinutes converts whole hours to hr notation
    expect(text).toContain('1 hr');
    expect(text.toLowerCase()).toContain('after');
    expect(text.toLowerCase()).not.toContain('before');
  });

  it('formats sub-60-min post window in minutes', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(0, 45));
    expect(text).toContain('45 min');
    expect(text.toLowerCase()).toContain('after');
  });

  it('formats pre+post window correctly', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(90, 90));
    expect(text.toLowerCase()).toContain('before');
    expect(text.toLowerCase()).toContain('after');
    // 90 min = 1.5 hr
    expect(text).toContain('1.5 hr');
  });

  it('formats whole-hour values without decimals', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(120, 60));
    expect(text).toContain('2 hr');
    expect(text).toContain('1 hr');
  });

  it('formats sub-hour values in minutes', () => {
    const text = buildPeptideFastingGuidanceText(makeWindow(45, 45));
    expect(text).toContain('45 min');
  });
});

// ─── computeActivePeptideFastingWindows ──────────────────────────────────────

describe('computeActivePeptideFastingWindows', () => {
  const baseMs = 1_700_000_000_000; // fixed reference time

  it('returns empty array when no doses provided', () => {
    const result = computeActivePeptideFastingWindows([], baseMs);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when all peptides have zero windows', () => {
    const doses = [makeDoseInput({ doseTimestampMs: baseMs, fastingWindow: makeWindow(0, 0) })];
    expect(computeActivePeptideFastingWindows(doses, baseMs)).toHaveLength(0);
  });

  it('detects a window that starts in the past (pre-injection phase)', () => {
    // Dose was given 30 min ago, window is pre=60 post=60
    // → window started 60 min before dose = 90 min ago — we are inside it
    const doseMs = baseMs - 30 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(60, 60) });
    const active = computeActivePeptideFastingWindows([dose], baseMs);
    expect(active).toHaveLength(1);
    expect(active[0]!.peptideId).toBe('p-1');
  });

  it('detects a window that is in the post-injection phase', () => {
    // Dose was given 30 min ago, window is pre=0 post=90
    // → window ends 90 min after dose = 60 min from now
    const doseMs = baseMs - 30 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(0, 90) });
    const active = computeActivePeptideFastingWindows([dose], baseMs);
    expect(active).toHaveLength(1);
    expect(active[0]!.windowEndsAtMs).toBe(doseMs + 90 * 60_000);
  });

  it('does not return a window that has already ended', () => {
    // Dose was given 120 min ago, window is pre=0 post=60 → ended 60 min ago
    const doseMs = baseMs - 120 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(0, 60) });
    expect(computeActivePeptideFastingWindows([dose], baseMs)).toHaveLength(0);
  });

  it('does not return a window that has not started yet (future dose further than pre window)', () => {
    // Dose is 120 min in the future, pre=60 → pre-window starts 60 min from now
    // (window start = doseMs - 60 min = baseMs + 60 min, so nowMs < windowStartMs)
    const doseMs = baseMs + 120 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(60, 60) });
    expect(computeActivePeptideFastingWindows([dose], baseMs)).toHaveLength(0);
  });

  it('returns multiple active windows when multiple peptides are in-window', () => {
    const dose1 = makeDoseInput({
      peptideId: 'p-1',
      doseTimestampMs: baseMs - 30 * 60_000,
      fastingWindow: makeWindow(0, 90),
    });
    const dose2 = makeDoseInput({
      peptideId: 'p-2',
      peptideName: 'CJC-1295',
      doseTimestampMs: baseMs - 45 * 60_000,
      fastingWindow: makeWindow(0, 120),
    });
    const active = computeActivePeptideFastingWindows([dose1, dose2], baseMs);
    expect(active).toHaveLength(2);
  });

  it('includes totalWindowMinutes = pre + post', () => {
    const dose = makeDoseInput({
      doseTimestampMs: baseMs - 10 * 60_000,
      fastingWindow: makeWindow(60, 90),
    });
    const active = computeActivePeptideFastingWindows([dose], baseMs);
    expect(active[0]!.totalWindowMinutes).toBe(150);
  });

  it('handles cross-midnight scenario — dose logged just before midnight is active just after', () => {
    // Simulate: dose at 23:55, now is 00:10 (+15 min). Post window = 60 min → still active.
    const doseMs = baseMs; // treat as "23:55"
    const nowMs = baseMs + 15 * 60_000; // "00:10"
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(0, 60) });
    const active = computeActivePeptideFastingWindows([dose], nowMs);
    expect(active).toHaveLength(1);
  });
});

// ─── isPeptideFastingActive ───────────────────────────────────────────────────

describe('isPeptideFastingActive', () => {
  const baseMs = 1_700_000_000_000;

  it('returns false when no doses provided', () => {
    expect(isPeptideFastingActive([], baseMs)).toBe(false);
  });

  it('returns false when all windows have ended', () => {
    const dose = makeDoseInput({
      doseTimestampMs: baseMs - 200 * 60_000,
      fastingWindow: makeWindow(0, 90),
    });
    expect(isPeptideFastingActive([dose], baseMs)).toBe(false);
  });

  it('returns true when an active window exists', () => {
    const dose = makeDoseInput({
      doseTimestampMs: baseMs - 30 * 60_000,
      fastingWindow: makeWindow(0, 90),
    });
    expect(isPeptideFastingActive([dose], baseMs)).toBe(true);
  });
});

// ─── msUntilPeptideFastingWindowEnds ─────────────────────────────────────────

describe('msUntilPeptideFastingWindowEnds', () => {
  const baseMs = 1_700_000_000_000;

  it('returns null when no active windows', () => {
    expect(msUntilPeptideFastingWindowEnds([], baseMs)).toBeNull();
  });

  it('returns null when all windows have ended', () => {
    const dose = makeDoseInput({
      doseTimestampMs: baseMs - 200 * 60_000,
      fastingWindow: makeWindow(0, 90),
    });
    expect(msUntilPeptideFastingWindowEnds([dose], baseMs)).toBeNull();
  });

  it('returns correct ms for a single active window', () => {
    // Dose 30 min ago, post window = 90 min → ends in 60 min
    const doseMs = baseMs - 30 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(0, 90) });
    const result = msUntilPeptideFastingWindowEnds([dose], baseMs);
    expect(result).toBe(60 * 60_000);
  });

  it('returns the latest end time when multiple windows are active', () => {
    const dose1 = makeDoseInput({
      peptideId: 'p-1',
      doseTimestampMs: baseMs - 30 * 60_000,
      fastingWindow: makeWindow(0, 90), // ends in 60 min
    });
    const dose2 = makeDoseInput({
      peptideId: 'p-2',
      peptideName: 'CJC-1295',
      doseTimestampMs: baseMs - 10 * 60_000,
      fastingWindow: makeWindow(0, 120), // ends in 110 min
    });
    const result = msUntilPeptideFastingWindowEnds([dose1, dose2], baseMs);
    expect(result).toBe(110 * 60_000);
  });

  it('returns 0 (not negative) if called exactly at window end', () => {
    const doseMs = baseMs - 90 * 60_000;
    const dose = makeDoseInput({ doseTimestampMs: doseMs, fastingWindow: makeWindow(0, 90) });
    // nowMs = exactly at window end
    const result = msUntilPeptideFastingWindowEnds([dose], baseMs);
    // Window ends exactly at baseMs (doseMs + 90 min = baseMs), so it's at boundary
    // computeActivePeptideFastingWindows includes the boundary (<=), so it should be 0
    expect(result).toBe(0);
  });
});

// ─── PEPTIDE_CATEGORY_FASTING_DEFAULTS structural integrity ──────────────────

describe('PEPTIDE_CATEGORY_FASTING_DEFAULTS', () => {
  it('has an entry for every PeptideCategory', () => {
    const categories = ['GLP-1', 'GH Secretagogue', 'Healing', 'Other'] as const;
    for (const cat of categories) {
      expect(PEPTIDE_CATEGORY_FASTING_DEFAULTS[cat]).toBeDefined();
    }
  });

  it('all entries have non-negative preInjectionMinutes', () => {
    for (const val of Object.values(PEPTIDE_CATEGORY_FASTING_DEFAULTS)) {
      expect(val.preInjectionMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('all entries have non-negative postInjectionMinutes', () => {
    for (const val of Object.values(PEPTIDE_CATEGORY_FASTING_DEFAULTS)) {
      expect(val.postInjectionMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('all entries respect the maximum limit', () => {
    for (const val of Object.values(PEPTIDE_CATEGORY_FASTING_DEFAULTS)) {
      expect(val.preInjectionMinutes).toBeLessThanOrEqual(PEPTIDE_FASTING_MAX_MINUTES);
      expect(val.postInjectionMinutes).toBeLessThanOrEqual(PEPTIDE_FASTING_MAX_MINUTES);
    }
  });

  it('GH Secretagogue has a higher default than Healing', () => {
    const ghDefault = PEPTIDE_CATEGORY_FASTING_DEFAULTS['GH Secretagogue'];
    const healingDefault = PEPTIDE_CATEGORY_FASTING_DEFAULTS['Healing'];
    expect(ghDefault.preInjectionMinutes).toBeGreaterThan(healingDefault.preInjectionMinutes);
    expect(ghDefault.postInjectionMinutes).toBeGreaterThan(healingDefault.postInjectionMinutes);
  });
});
