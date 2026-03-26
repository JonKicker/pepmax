import { Timestamp } from 'firebase/firestore';

// ─── Enums / unions ────────────────────────────────────────────────────────────

export type FastingProtocol = '16:8' | '18:6' | '20:4' | 'custom';

// ─── Config doc ───────────────────────────────────────────────────────────────

export type FastingConfig = {
  protocol: FastingProtocol;
  /** HH:mm — 24-hour local time when the eating window opens */
  eatingWindowStart: string;
  /** HH:mm — 24-hour local time when the eating window closes */
  eatingWindowEnd: string;
  remindersEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ─── Log entry ────────────────────────────────────────────────────────────────

/**
 * FastingLogEntry — stored at users/{uid}/fastingLog/{docId}.
 *
 * Streak = count of last 7 calendar days where user completed full fasting
 * window without breaking early (breakTime === null && fastCompleted === true).
 */
export type FastingLogEntry = {
  /** YYYY-MM-DD — local calendar date this entry belongs to */
  date: string;
  fastCompleted: boolean;
  /** null when the user did not break the fast early */
  breakTime: Timestamp | null;
  /** Timestamp when the eating window opened (fasting period ended successfully) */
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// ─── Timer state ─────────────────────────────────────────────────────────────

export type FastingState = 'fasting' | 'eating' | 'unconfigured';

export type FastingTimerData = {
  state: FastingState;
  /** Milliseconds remaining in the current period (fasting or eating) */
  timeRemainingMs: number;
  /** Total duration in milliseconds of the current period */
  totalDurationMs: number;
  /** Fraction 0–1 representing elapsed proportion of the current period */
  progress: number;
  /** Human-readable protocol label, e.g. "16:8" or "Custom" */
  protocolLabel: string;
  /** HH:mm eating window start */
  windowStart: string;
  /** HH:mm eating window end */
  windowEnd: string;
};
