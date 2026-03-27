/**
 * pvpLeagueUtils — pure utility functions for PVP leagues and seasons.
 *
 * NO Firestore dependency. NO hooks. All functions are pure and deterministic.
 * Safe to use in Cloud Functions (via duplication in functions/src/shared/).
 */
import type { LeagueBracket, LeagueMember, LeagueStanding, SeasonRewardTier } from '../types/pvp';

// ─── Bracket thresholds ───────────────────────────────────────────────────────

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

/**
 * Sort members by weeklyDelta descending and assign promote/safe/relegate status.
 * Members with identical weeklyDelta are ranked alphabetically by username (stable sort).
 */
export function computeStandings(
  members: LeagueMember[],
  promotionSlots: number,
  relegationSlots: number,
): LeagueStanding[] {
  if (members.length === 0) return [];

  const sorted = [...members].sort((a, b) => {
    if (b.weeklyDelta !== a.weeklyDelta) return b.weeklyDelta - a.weeklyDelta;
    return a.username.localeCompare(b.username);
  });

  return sorted.map((member, index) => {
    const rank = index + 1;
    let status: LeagueStanding['status'];

    if (rank <= promotionSlots) {
      status = 'promote';
    } else if (rank > sorted.length - relegationSlots) {
      status = 'relegate';
    } else {
      status = 'safe';
    }

    return { rank, member, status };
  });
}

/**
 * Returns the ISO week key for a given date: "2026-W13".
 * Uses ISO 8601 week numbering (week starts Monday, first week contains Thursday).
 */
export function getWeekKey(date: Date): string {
  // Copy to avoid mutating the original
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Sunday = 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // ISO year is the year of the Thursday
  const isoYear = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7,
  );
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── Decay constants ──────────────────────────────────────────────────────────

const DECAY_PER_INACTIVE_DAY = 5;
const MAX_DECAY_PER_WEEK = 35;
const MS_PER_DAY = 86400000;
const DAYS_PER_WEEK = 7;

/**
 * Computes RP after applying lazy decay for inactivity.
 * -5 RP per inactive day, max 35 decay per week, floor at 0.
 *
 * @param storedRP  - RP stored in Firestore
 * @param lastActiveAt - timestamp (ms) of last activity
 * @param now - current timestamp (ms)
 */
export function computeDecayedRP(storedRP: number, lastActiveAt: number, now: number): number {
  const inactiveDays = Math.max(0, Math.floor((now - lastActiveAt) / MS_PER_DAY));
  if (inactiveDays === 0) return Math.max(0, storedRP);

  // Cap decay at MAX_DECAY_PER_WEEK per 7-day period
  const weeks = Math.floor(inactiveDays / DAYS_PER_WEEK);
  const remainderDays = inactiveDays % DAYS_PER_WEEK;

  const fullWeekDecay = weeks * MAX_DECAY_PER_WEEK;
  const remainderDecay = Math.min(remainderDays * DECAY_PER_INACTIVE_DAY, MAX_DECAY_PER_WEEK);
  const totalDecay = fullWeekDecay + remainderDecay;

  return Math.max(0, storedRP - totalDecay);
}

// ─── Season reward tiers ──────────────────────────────────────────────────────

/**
 * Determines the season reward tier from percentile (0–1, e.g. 0.01 = top 1%).
 * top 1% = legendary, top 10% = epic, top 25% = rare, else = participation.
 */
export function getRewardTierForPercentile(percentile: number): SeasonRewardTier {
  if (percentile <= 0.01) return 'legendary';
  if (percentile <= 0.10) return 'epic';
  if (percentile <= 0.25) return 'rare';
  return 'participation';
}

// ─── Time formatting ──────────────────────────────────────────────────────────

/**
 * Formats time remaining until endTimestamp.
 * "6d 14h", "23h 45m", "2h 30m", "45m", "Ended"
 */
export function formatTimeRemaining(endTimestamp: number, now: number): string {
  const msRemaining = endTimestamp - now;
  if (msRemaining <= 0) return 'Ended';

  const totalMinutes = Math.floor(msRemaining / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays >= 1) {
    const remainderHours = totalHours % 24;
    return `${totalDays}d ${remainderHours}h`;
  }
  if (totalHours >= 1) {
    const remainderMinutes = totalMinutes % 60;
    return `${totalHours}h ${remainderMinutes}m`;
  }
  return `${totalMinutes}m`;
}
