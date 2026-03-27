/**
 * pvpLeagueUtils tests — comprehensive coverage of all pure utility functions.
 *
 * Functions under test:
 *   getBracketForRP
 *   computeStandings
 *   getWeekKey
 *   computeDecayedRP
 *   getRewardTierForPercentile
 *   formatTimeRemaining
 */
import {
  getBracketForRP,
  computeStandings,
  getWeekKey,
  computeDecayedRP,
  getRewardTierForPercentile,
  formatTimeRemaining,
} from '../utils/pvpLeagueUtils';
import type { LeagueMember } from '../types/pvp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMember(uid: string, username: string, weeklyDelta: number): LeagueMember {
  return {
    uid,
    username,
    startRP: 500,
    currentRP: 500 + weeklyDelta,
    weeklyDelta,
  };
}

// ─── getBracketForRP ──────────────────────────────────────────────────────────

describe('getBracketForRP', () => {
  it('returns bronze at RP=0', () => {
    expect(getBracketForRP(0)).toBe('bronze');
  });

  it('returns bronze at RP=199 (top of bronze range)', () => {
    expect(getBracketForRP(199)).toBe('bronze');
  });

  it('returns silver at RP=200 (silver threshold)', () => {
    expect(getBracketForRP(200)).toBe('silver');
  });

  it('returns silver at RP=499 (top of silver range)', () => {
    expect(getBracketForRP(499)).toBe('silver');
  });

  it('returns gold at RP=500 (gold threshold)', () => {
    expect(getBracketForRP(500)).toBe('gold');
  });

  it('returns gold at RP=999 (top of gold range)', () => {
    expect(getBracketForRP(999)).toBe('gold');
  });

  it('returns platinum at RP=1000 (platinum threshold)', () => {
    expect(getBracketForRP(1000)).toBe('platinum');
  });

  it('returns platinum at RP=1999 (top of platinum range)', () => {
    expect(getBracketForRP(1999)).toBe('platinum');
  });

  it('returns diamond at RP=2000 (diamond threshold)', () => {
    expect(getBracketForRP(2000)).toBe('diamond');
  });

  it('returns diamond at RP=10000 (far above diamond)', () => {
    expect(getBracketForRP(10000)).toBe('diamond');
  });

  it('clamps negative RP to bronze', () => {
    expect(getBracketForRP(-100)).toBe('bronze');
  });
});

// ─── computeStandings ─────────────────────────────────────────────────────────

describe('computeStandings', () => {
  it('returns empty array for empty members list', () => {
    expect(computeStandings([], 3, 3)).toEqual([]);
  });

  it('handles a single member — safe when slots = 0', () => {
    const members = [makeMember('a', 'alice', 50)];
    const standings = computeStandings(members, 0, 0);
    expect(standings).toHaveLength(1);
    expect(standings[0].rank).toBe(1);
    expect(standings[0].status).toBe('safe');
  });

  it('sorts members by weeklyDelta descending', () => {
    const members = [
      makeMember('b', 'bob', 10),
      makeMember('a', 'alice', 50),
      makeMember('c', 'charlie', 30),
    ];
    const standings = computeStandings(members, 1, 1);
    expect(standings[0].member.uid).toBe('a'); // 50
    expect(standings[1].member.uid).toBe('c'); // 30
    expect(standings[2].member.uid).toBe('b'); // 10
  });

  it('assigns promote status to top N members', () => {
    const members = [
      makeMember('a', 'alice', 100),
      makeMember('b', 'bob', 80),
      makeMember('c', 'charlie', 60),
      makeMember('d', 'dave', 40),
      makeMember('e', 'eve', 20),
    ];
    const standings = computeStandings(members, 2, 2);
    expect(standings[0].status).toBe('promote');
    expect(standings[1].status).toBe('promote');
    expect(standings[2].status).toBe('safe');
    expect(standings[3].status).toBe('relegate');
    expect(standings[4].status).toBe('relegate');
  });

  it('assigns correct ranks sequentially', () => {
    const members = [
      makeMember('a', 'alice', 50),
      makeMember('b', 'bob', 30),
    ];
    const standings = computeStandings(members, 1, 1);
    expect(standings[0].rank).toBe(1);
    expect(standings[1].rank).toBe(2);
  });

  it('breaks ties alphabetically by username', () => {
    const members = [
      makeMember('z', 'zara', 50),
      makeMember('a', 'alice', 50),
      makeMember('m', 'mike', 50),
    ];
    const standings = computeStandings(members, 1, 1);
    expect(standings[0].member.username).toBe('alice');
    expect(standings[1].member.username).toBe('mike');
    expect(standings[2].member.username).toBe('zara');
  });

  it('handles promotionSlots = 0 (no one promotes)', () => {
    const members = [
      makeMember('a', 'alice', 50),
      makeMember('b', 'bob', 30),
    ];
    const standings = computeStandings(members, 0, 1);
    expect(standings[0].status).toBe('safe');
    expect(standings[1].status).toBe('relegate');
  });

  it('handles relegationSlots = 0 (no one relegates)', () => {
    const members = [
      makeMember('a', 'alice', 50),
      makeMember('b', 'bob', 30),
    ];
    const standings = computeStandings(members, 1, 0);
    expect(standings[0].status).toBe('promote');
    expect(standings[1].status).toBe('safe');
  });

  it('handles all members having the same delta', () => {
    const members = [
      makeMember('a', 'alice', 50),
      makeMember('b', 'bob', 50),
      makeMember('c', 'charlie', 50),
    ];
    // Should still produce 3 standings with sequential ranks
    const standings = computeStandings(members, 1, 1);
    expect(standings).toHaveLength(3);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3]);
  });
});

// ─── getWeekKey ───────────────────────────────────────────────────────────────

describe('getWeekKey', () => {
  it('returns correct week key for a known date (Mon 2026-03-23 = W13)', () => {
    // 2026-03-23 is a Monday in week 13
    const date = new Date('2026-03-23T12:00:00Z');
    expect(getWeekKey(date)).toBe('2026-W13');
  });

  it('returns correct week key for Wed 2026-03-25 (same week = W13)', () => {
    const date = new Date('2026-03-25T12:00:00Z');
    expect(getWeekKey(date)).toBe('2026-W13');
  });

  it('returns W01 for the first week of 2026 (Jan 1 = W01)', () => {
    // Jan 1, 2026 is a Thursday — it's in W01
    const date = new Date('2026-01-01T12:00:00Z');
    expect(getWeekKey(date)).toBe('2026-W01');
  });

  it('handles year boundary: Dec 31 2025 belongs to 2026-W01', () => {
    // Dec 29 2025 is a Monday of W01 of 2026 (ISO)
    // Dec 31 2025 is a Wednesday → same week
    const date = new Date('2025-12-31T12:00:00Z');
    expect(getWeekKey(date)).toBe('2026-W01');
  });

  it('handles last week of year: Dec 28 2026 = W53 or W01 boundary', () => {
    // Dec 28, 2026 is a Monday
    const date = new Date('2026-12-28T12:00:00Z');
    const result = getWeekKey(date);
    // Should be 2026-W53 (Dec 28, 2026 is in ISO week 53 of 2026)
    expect(result).toBe('2026-W53');
  });

  it('pads single-digit week numbers with leading zero', () => {
    // Jan 5, 2026 is in week 2
    const date = new Date('2026-01-05T12:00:00Z');
    const result = getWeekKey(date);
    expect(result).toMatch(/^\d{4}-W\d{2}$/);
    expect(result).toBe('2026-W02');
  });
});

// ─── computeDecayedRP ─────────────────────────────────────────────────────────

describe('computeDecayedRP', () => {
  const MS = 86400000; // 1 day in ms
  const now = 1000 * MS; // arbitrary base timestamp

  it('returns unchanged RP when 0 days inactive', () => {
    expect(computeDecayedRP(500, now, now)).toBe(500);
  });

  it('applies -5 RP for 1 inactive day', () => {
    expect(computeDecayedRP(500, now - MS, now)).toBe(495);
  });

  it('applies -35 RP for 7 inactive days (full week max)', () => {
    expect(computeDecayedRP(500, now - 7 * MS, now)).toBe(465);
  });

  it('caps decay at 35 for 10 inactive days (same week cap logic)', () => {
    // 10 days = 1 full week (35 decay) + 3 days (15 more) = 50 total
    // But per-week cap: week 1 = 35, days 8-10 = 3 days = min(15, 35) = 15
    // Total = 35 + 15 = 50
    expect(computeDecayedRP(500, now - 10 * MS, now)).toBe(450);
  });

  it('exactly 2 weeks inactive = 70 RP decay', () => {
    expect(computeDecayedRP(500, now - 14 * MS, now)).toBe(430);
  });

  it('floors result at 0 when decay exceeds stored RP', () => {
    expect(computeDecayedRP(10, now - 7 * MS, now)).toBe(0);
  });

  it('floors result at 0 for negative storedRP', () => {
    expect(computeDecayedRP(-50, now, now)).toBe(0);
  });

  it('returns 0 for 0 stored RP', () => {
    expect(computeDecayedRP(0, now - 3 * MS, now)).toBe(0);
  });

  it('does not apply decay when inactive < 1 full day', () => {
    // 12 hours < 1 day threshold
    expect(computeDecayedRP(500, now - MS / 2, now)).toBe(500);
  });
});

// ─── getRewardTierForPercentile ───────────────────────────────────────────────

describe('getRewardTierForPercentile', () => {
  it('returns legendary at percentile 0.01 (exactly top 1%)', () => {
    expect(getRewardTierForPercentile(0.01)).toBe('legendary');
  });

  it('returns legendary at percentile 0.005 (top 0.5%)', () => {
    expect(getRewardTierForPercentile(0.005)).toBe('legendary');
  });

  it('returns epic at percentile 0.05 (top 5%)', () => {
    expect(getRewardTierForPercentile(0.05)).toBe('epic');
  });

  it('returns epic at percentile 0.10 (exactly top 10%)', () => {
    expect(getRewardTierForPercentile(0.10)).toBe('epic');
  });

  it('returns rare at percentile 0.11 (just below epic threshold)', () => {
    expect(getRewardTierForPercentile(0.11)).toBe('rare');
  });

  it('returns rare at percentile 0.25 (exactly top 25%)', () => {
    expect(getRewardTierForPercentile(0.25)).toBe('rare');
  });

  it('returns participation at percentile 0.50 (middle of pack)', () => {
    expect(getRewardTierForPercentile(0.50)).toBe('participation');
  });

  it('returns participation at percentile 1.0 (bottom)', () => {
    expect(getRewardTierForPercentile(1.0)).toBe('participation');
  });

  it('returns participation at percentile 0.26 (just above rare threshold)', () => {
    expect(getRewardTierForPercentile(0.26)).toBe('participation');
  });
});

// ─── formatTimeRemaining ──────────────────────────────────────────────────────

describe('formatTimeRemaining', () => {
  const now = Date.now();

  it('formats days + hours correctly', () => {
    const end = now + (6 * 24 + 14) * 60 * 60 * 1000; // 6d 14h
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('6d 14h');
  });

  it('formats hours + minutes when less than 1 day remaining', () => {
    const end = now + (23 * 60 + 45) * 60 * 1000; // 23h 45m
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('23h 45m');
  });

  it('formats hours + minutes for 2h 30m', () => {
    const end = now + (2 * 60 + 30) * 60 * 1000;
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('2h 30m');
  });

  it('formats minutes only when less than 1 hour remaining', () => {
    const end = now + 45 * 60 * 1000; // 45m
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('45m');
  });

  it('returns Ended for past timestamp', () => {
    const end = now - 1000; // already ended
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('Ended');
  });

  it('returns Ended for endTimestamp exactly equal to now', () => {
    expect(formatTimeRemaining(now, now)).toBe('Ended');
  });

  it('shows 0h 0m for under a minute remaining', () => {
    const end = now + 30 * 1000; // 30 seconds
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('0m');
  });

  it('formats exactly 1 day as 1d 0h', () => {
    const end = now + 24 * 60 * 60 * 1000;
    const result = formatTimeRemaining(end, now);
    expect(result).toBe('1d 0h');
  });
});
