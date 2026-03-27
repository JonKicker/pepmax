/**
 * shared/rankTierV2 — minimal duplication of src/utils/rankTierV2.ts for CF runtime.
 *
 * Cloud Functions cannot import from the client src/ tree.
 * Only the functions CFs actually need are duplicated here:
 *   - getTierForRP
 *   - computeDecayedRP
 *   - getBracketForRP
 *
 * Keep this file in sync with src/utils/rankTierV2.ts and src/utils/pvpLeagueUtils.ts
 * when tier thresholds change.
 */

// ─── Types (inline to avoid importing from src/) ─────────────────────────────

export type RankTierV2 =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legendary';

export type LeagueBracket = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';

export type RankTierV2Info = {
  tier: RankTierV2;
  minRP: number;
};

// ─── Tier definitions ─────────────────────────────────────────────────────────

export const RANK_TIERS_V2: RankTierV2Info[] = [
  { tier: 'bronze',    minRP: 0    },
  { tier: 'silver',    minRP: 200  },
  { tier: 'gold',      minRP: 500  },
  { tier: 'platinum',  minRP: 1000 },
  { tier: 'diamond',   minRP: 2000 },
  { tier: 'legendary', minRP: 5000 },
];

// ─── getTierForRP ─────────────────────────────────────────────────────────────

/**
 * Returns the highest tier whose minRP <= rp.
 * Negative RP clamps to bronze.
 */
export function getTierForRP(rp: number): RankTierV2Info {
  const clampedRP = Math.max(0, rp);
  for (let i = RANK_TIERS_V2.length - 1; i >= 0; i--) {
    if (clampedRP >= RANK_TIERS_V2[i].minRP) {
      return RANK_TIERS_V2[i];
    }
  }
  return RANK_TIERS_V2[0];
}

// ─── computeDecayedRP ────────────────────────────────────────────────────────

const DECAY_PER_INACTIVE_DAY = 5;
const MAX_DECAY_PER_WEEK = 35;
const MS_PER_DAY = 86400000;
const DAYS_PER_WEEK = 7;

/**
 * Computes RP after lazy inactivity decay.
 * -5 RP per inactive day, max 35/week, floor at 0.
 *
 * @param storedRP     - RP stored in Firestore
 * @param lastActiveAt - timestamp (ms) of last user activity
 * @param now          - current timestamp (ms)
 */
export function computeDecayedRP(storedRP: number, lastActiveAt: number, now: number): number {
  const inactiveDays = Math.max(0, Math.floor((now - lastActiveAt) / MS_PER_DAY));
  if (inactiveDays === 0) return Math.max(0, storedRP);

  const weeks = Math.floor(inactiveDays / DAYS_PER_WEEK);
  const remainderDays = inactiveDays % DAYS_PER_WEEK;

  const fullWeekDecay = weeks * MAX_DECAY_PER_WEEK;
  const remainderDecay = Math.min(remainderDays * DECAY_PER_INACTIVE_DAY, MAX_DECAY_PER_WEEK);
  const totalDecay = fullWeekDecay + remainderDecay;

  return Math.max(0, storedRP - totalDecay);
}

// ─── getBracketForRP ─────────────────────────────────────────────────────────

const BRACKET_THRESHOLDS: { bracket: LeagueBracket; minRP: number }[] = [
  { bracket: 'diamond',  minRP: 2000 },
  { bracket: 'platinum', minRP: 1000 },
  { bracket: 'gold',     minRP: 500  },
  { bracket: 'silver',   minRP: 200  },
  { bracket: 'bronze',   minRP: 0    },
];

/**
 * Returns the league bracket for a given RP value.
 * diamond: 2000+, platinum: 1000–1999, gold: 500–999, silver: 200–499, bronze: 0–199
 */
export function getBracketForRP(rp: number): LeagueBracket {
  const clampedRP = Math.max(0, rp);
  for (const { bracket, minRP } of BRACKET_THRESHOLDS) {
    if (clampedRP >= minRP) return bracket;
  }
  return 'bronze';
}

// ─── getWeekKey ───────────────────────────────────────────────────────────────

/**
 * Returns the ISO 8601 week key for a date: "2026-W13".
 */
export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7,
  );
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}
