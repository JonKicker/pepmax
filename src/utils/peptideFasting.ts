/**
 * Pure utility functions for per-peptide fasting windows.
 *
 * "peptideFasting" prefix disambiguates from the intermittent-fasting
 * feature (src/utils/fastingService.ts, src/types/fasting.ts).
 *
 * No Firestore or React imports — safe to test without mocks.
 */

import type { PeptideFastingWindow, ActivePeptideFastingWindow, PeptideCategoryFastingDefaults } from '../types/peptideFasting';
import type { PeptideCategory } from '../types/peptide';

// ─── Validation ───────────────────────────────────────────────────────────────

export const PEPTIDE_FASTING_MAX_MINUTES = 480; // 8 hours hard cap

/**
 * Clamp a window value to [0, PEPTIDE_FASTING_MAX_MINUTES].
 * Returns 0 for any non-finite input.
 */
export function clampPeptideFastingMinutes(value: number): number {
  if (!isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value), PEPTIDE_FASTING_MAX_MINUTES);
}

/**
 * Validate a raw PeptideFastingWindow object.
 * Returns a sanitised copy or null if the input cannot be salvaged.
 */
export function validatePeptideFastingWindow(
  raw: Partial<PeptideFastingWindow>,
): PeptideFastingWindow | null {
  const pre = clampPeptideFastingMinutes(raw.preInjectionMinutes ?? 0);
  const post = clampPeptideFastingMinutes(raw.postInjectionMinutes ?? 0);
  // A window with 0 for both fields is valid (user cleared it) but likely unused;
  // the caller decides whether to store it.
  return {
    preInjectionMinutes: pre,
    postInjectionMinutes: post,
    notifyWhenWindowEnds: raw.notifyWhenWindowEnds ?? false,
  };
}

// ─── Category defaults ────────────────────────────────────────────────────────

/**
 * Sensible defaults by PeptideCategory, based on common clinical guidance.
 *
 * GLP-1 agonists (e.g. semaglutide, tirzepatide): no strict fasting required
 * but 30 min pre is often recommended for GI comfort.
 *
 * GH Secretagogues (e.g. ipamorelin, CJC-1295): GH pulse is blunted by
 * dietary carbs/fats — 90 min pre/post is standard guidance.
 *
 * Healing peptides (e.g. BPC-157, TB-500): no fasting requirement.
 */
export const PEPTIDE_CATEGORY_FASTING_DEFAULTS: Record<
  PeptideCategory,
  PeptideCategoryFastingDefaults
> = {
  'GLP-1': { preInjectionMinutes: 30, postInjectionMinutes: 30 },
  'GH Secretagogue': { preInjectionMinutes: 90, postInjectionMinutes: 90 },
  Healing: { preInjectionMinutes: 0, postInjectionMinutes: 0 },
  Other: { preInjectionMinutes: 0, postInjectionMinutes: 0 },
};

/**
 * Return the default PeptideFastingWindow for a given category.
 * Returns a zero window for unknown categories.
 */
export function getDefaultPeptideFastingWindow(
  category: PeptideCategory | undefined,
): PeptideFastingWindow {
  const defaults = category
    ? (PEPTIDE_CATEGORY_FASTING_DEFAULTS[category] ?? { preInjectionMinutes: 0, postInjectionMinutes: 0 })
    : { preInjectionMinutes: 0, postInjectionMinutes: 0 };

  return {
    preInjectionMinutes: defaults.preInjectionMinutes,
    postInjectionMinutes: defaults.postInjectionMinutes,
    notifyWhenWindowEnds: false,
  };
}

// ─── Active window computation ────────────────────────────────────────────────

export type DoseWindowInput = {
  peptideId: string;
  peptideName: string;
  /** Timestamp the dose was logged (ms since epoch). */
  doseTimestampMs: number;
  fastingWindow: PeptideFastingWindow;
};

/**
 * Build a human-readable guidance string for a peptide's fasting window.
 *
 * Examples:
 *   "Fast 90 min before and 90 min after each dose"
 *   "Fast 30 min after each dose"
 *   "No fasting required"
 */
export function buildPeptideFastingGuidanceText(window: PeptideFastingWindow): string {
  const { preInjectionMinutes: pre, postInjectionMinutes: post } = window;
  if (pre === 0 && post === 0) return 'No fasting required for this peptide.';

  const formatMinutes = (mins: number): string => {
    if (mins < 60) return `${mins} min`;
    const hours = mins / 60;
    // Avoid "1.0 hr" — show "1 hr", "1.5 hr", etc.
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
  };

  if (pre > 0 && post > 0) {
    return `Fast ${formatMinutes(pre)} before and ${formatMinutes(post)} after each dose.`;
  }
  if (pre > 0) {
    return `Fast ${formatMinutes(pre)} before each dose.`;
  }
  return `Fast ${formatMinutes(post)} after each dose.`;
}

// ─── Category reasoning ──────────────────────────────────────────────────────

/**
 * Brief science-based explanation of WHY fasting matters for this category.
 * Shown below the timing guidance so users understand the reasoning.
 */
const CATEGORY_REASONING: Record<PeptideCategory, string | null> = {
  'GH Secretagogue':
    'Food — especially carbs and fats — triggers an insulin spike that blunts growth hormone release. Fasting keeps insulin low so the GH pulse is as strong as possible.',
  'GLP-1':
    'Taking GLP-1 agonists on a relatively empty stomach can reduce nausea and help the medication slow gastric emptying more effectively.',
  Healing: null,
  Other: null,
};

/**
 * Return a short reasoning string for why fasting matters for this category,
 * or null if no specific reasoning applies.
 */
export function getPeptideFastingReasoning(
  category: PeptideCategory | undefined,
): string | null {
  if (!category) return null;
  return CATEGORY_REASONING[category] ?? null;
}

/**
 * Given a list of recent dose snapshots, return only those whose
 * combined pre + post fasting window is still active at `nowMs`.
 *
 * Cross-midnight safe: we look back `lookbackMs` from now instead of using
 * getTodaysDoses(), so windows started just before midnight are included.
 */
export function computeActivePeptideFastingWindows(
  doses: DoseWindowInput[],
  nowMs: number,
): ActivePeptideFastingWindow[] {
  const active: ActivePeptideFastingWindow[] = [];

  for (const dose of doses) {
    const { preInjectionMinutes: pre, postInjectionMinutes: post } = dose.fastingWindow;
    if (pre === 0 && post === 0) continue;

    // Window starts `pre` minutes before the dose
    const windowStartMs = dose.doseTimestampMs - pre * 60_000;
    // Window ends `post` minutes after the dose
    const windowEndsAtMs = dose.doseTimestampMs + post * 60_000;

    // Active = we are inside [windowStartMs, windowEndsAtMs]
    if (nowMs >= windowStartMs && nowMs <= windowEndsAtMs) {
      active.push({
        peptideId: dose.peptideId,
        peptideName: dose.peptideName,
        doseTimestampMs: dose.doseTimestampMs,
        windowEndsAtMs,
        totalWindowMinutes: pre + post,
        guidanceText: buildPeptideFastingGuidanceText(dose.fastingWindow),
      });
    }
  }

  return active;
}

/**
 * Return true if any active peptide fasting window is currently open.
 * Convenience wrapper around `computeActivePeptideFastingWindows`.
 */
export function isPeptideFastingActive(
  doses: DoseWindowInput[],
  nowMs: number,
): boolean {
  return computeActivePeptideFastingWindows(doses, nowMs).length > 0;
}

/**
 * How many milliseconds until the LATEST active window ends.
 * Returns null if no windows are currently active.
 */
export function msUntilPeptideFastingWindowEnds(
  doses: DoseWindowInput[],
  nowMs: number,
): number | null {
  const active = computeActivePeptideFastingWindows(doses, nowMs);
  if (active.length === 0) return null;

  const latestEnd = Math.max(...active.map((w) => w.windowEndsAtMs));
  return Math.max(0, latestEnd - nowMs);
}
