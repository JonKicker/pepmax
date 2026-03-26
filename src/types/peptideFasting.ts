/**
 * Types for per-peptide fasting windows.
 *
 * Named with "peptideFasting" prefix throughout to avoid collision with
 * the intermittent-fasting feature (src/types/fasting.ts).
 *
 * Stored as an embedded sub-object on the Peptide document, not a
 * separate collection — no extra reads required at dose-log time.
 */

// ─── Core config ──────────────────────────────────────────────────────────────

/**
 * Fasting window for a single peptide.
 *
 * After injection the user should avoid eating for `preInjectionMinutes`
 * before AND `postInjectionMinutes` after the dose.
 * Both values must be 0–480 (8 hours).
 */
export type PeptideFastingWindow = {
  /** Minutes of fasting required BEFORE the injection (0–480). */
  preInjectionMinutes: number;
  /** Minutes of fasting required AFTER the injection (0–480). */
  postInjectionMinutes: number;
  /** Whether to schedule a push notification when the post-injection window ends. */
  notifyWhenWindowEnds: boolean;
};

// ─── Runtime state ────────────────────────────────────────────────────────────

/**
 * Result returned by `computeActivePeptideFastingWindows` describing a
 * currently-active window derived from a recent dose.
 */
export type ActivePeptideFastingWindow = {
  peptideId: string;
  peptideName: string;
  /** Timestamp the dose was logged (ms since epoch). */
  doseTimestampMs: number;
  /** Absolute time when the post-injection fasting window ends (ms since epoch). */
  windowEndsAtMs: number;
  /** Total fasting window in minutes (preInjectionMinutes + postInjectionMinutes). */
  totalWindowMinutes: number;
  /** Human-readable guidance to show at log-dose time. */
  guidanceText: string;
};

// ─── Category defaults ────────────────────────────────────────────────────────

/**
 * Default fasting windows by peptide category.
 * Applied when a peptide is added from a preset or manually with a category.
 */
export type PeptideCategoryFastingDefaults = {
  preInjectionMinutes: number;
  postInjectionMinutes: number;
};
