/**
 * Water / Hydration types.
 *
 * WaterLogDoc  — the Firestore document stored at waterLog/{YYYY-MM-DD}
 * WaterEntry   — one individual drink log within the entries array
 */
import { Timestamp } from 'firebase/firestore';

// ─── Individual entry ────────────────────────────────────────────────────────

export type WaterEntrySource = 'phone' | 'watch';

export type WaterEntry = {
  /** Ounces logged in this single event (1–128). */
  oz: number;
  /** ISO timestamp of the log event. */
  loggedAt: Timestamp;
  /** Which surface logged this entry. */
  source: WaterEntrySource;
};

// ─── Daily log document ──────────────────────────────────────────────────────

export type WaterLogDoc = {
  /**
   * Firestore-maintained running total (source of truth).
   * Always updated via FieldValue.increment() — never overwritten directly.
   * Max 300oz per day (enforced by both client and Firestore rules).
   */
  totalOz: number;
  /**
   * User's daily goal in ounces. Stored per-day so historical days
   * preserve the goal that was active at the time.
   * Default: 64oz.
   */
  goalOz: number;
  /** Append-only log of individual drink events. */
  entries: WaterEntry[];
  /** Wall-clock time of the last log event on this day. */
  lastLoggedAt: Timestamp;
  /** Surface that last wrote to this document. */
  source: WaterEntrySource;
  updatedAt: Timestamp;
};

// ─── Service result type ─────────────────────────────────────────────────────

export type WaterLogResult = {
  totalOz: number;
  goalOz: number;
  entries: WaterEntry[];
  /** Fraction 0–1 for progress bar (capped at 1). */
  progress: number;
  /** True when totalOz >= goalOz. */
  goalReached: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_WATER_GOAL_OZ = 64;
export const MAX_SINGLE_LOG_OZ = 128;
export const MAX_DAILY_OZ = 300;
