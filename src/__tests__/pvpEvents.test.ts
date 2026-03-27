/**
 * pvpEvents.test.ts — tests for PVP Seasonal Events & Share Card utilities.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Coverage:
 *   pvpEventUtils  — getDifficultyConfig, getChallengeProgress, isUrgent,
 *                    getPerMemberAverage, rankCrewEntries
 *   shareCardUtils — getShareCardTitle, getShareCardSubtitle, formatShareValue
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  getDifficultyConfig,
  getChallengeProgress,
  isUrgent,
  getPerMemberAverage,
  rankCrewEntries,
} from '../utils/pvpEventUtils';

import {
  getShareCardTitle,
  getShareCardSubtitle,
  formatShareValue,
  type ShareCardData,
} from '../utils/shareCardUtils';

import type { CrewChallengeEntry } from '../types/pvpEvents';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeCrewEntry(
  override: Partial<CrewChallengeEntry> = {},
): CrewChallengeEntry {
  return {
    crewId: 'crew-1',
    crewName: 'Alpha Squad',
    crewEmoji: '🔥',
    totalProgress: 100,
    memberContributions: {},
    memberCount: 5,
    ...override,
  };
}

function makeShareData(override: Partial<ShareCardData> = {}): ShareCardData {
  return {
    username: 'ray',
    tier: 'gold',
    ...override,
  };
}

// ─── getDifficultyConfig ──────────────────────────────────────────────────────

describe('getDifficultyConfig', () => {
  it('normal: returns xpMultiplier=1, rpMultiplier=1, label=Normal', () => {
    const cfg = getDifficultyConfig('normal');
    expect(cfg.label).toBe('Normal');
    expect(cfg.xpMultiplier).toBe(1);
    expect(cfg.rpMultiplier).toBe(1);
  });

  it('hard: returns xpMultiplier=2, rpMultiplier=2.5, label=Hard', () => {
    const cfg = getDifficultyConfig('hard');
    expect(cfg.label).toBe('Hard');
    expect(cfg.xpMultiplier).toBe(2);
    expect(cfg.rpMultiplier).toBe(2.5);
  });

  it('extreme: returns xpMultiplier=4, rpMultiplier=5, label=Extreme', () => {
    const cfg = getDifficultyConfig('extreme');
    expect(cfg.label).toBe('Extreme');
    expect(cfg.xpMultiplier).toBe(4);
    expect(cfg.rpMultiplier).toBe(5);
  });
});

// ─── getChallengeProgress ─────────────────────────────────────────────────────

describe('getChallengeProgress', () => {
  it('returns 0 when target is 0 (division by zero guard)', () => {
    expect(getChallengeProgress(50, 0)).toBe(0);
  });

  it('returns 0 when target is negative (guard)', () => {
    expect(getChallengeProgress(50, -10)).toBe(0);
  });

  it('returns correct ratio for normal progress', () => {
    expect(getChallengeProgress(25, 100)).toBeCloseTo(0.25);
  });

  it('returns 0.5 for half progress', () => {
    expect(getChallengeProgress(50, 100)).toBeCloseTo(0.5);
  });

  it('returns 1 when current equals target', () => {
    expect(getChallengeProgress(100, 100)).toBe(1);
  });

  it('clamps to 1 when current exceeds target', () => {
    expect(getChallengeProgress(150, 100)).toBe(1);
  });

  it('returns 0 when current is 0', () => {
    expect(getChallengeProgress(0, 100)).toBe(0);
  });
});

// ─── isUrgent ────────────────────────────────────────────────────────────────

const MS_IN_1H = 60 * 60 * 1000;
const MS_IN_24H = 24 * MS_IN_1H;
const NOW = 1_700_000_000_000; // fixed reference timestamp

describe('isUrgent', () => {
  it('returns false when > 24h remaining', () => {
    const endDate = NOW + MS_IN_24H + MS_IN_1H; // 25h from now
    expect(isUrgent(endDate, NOW)).toBe(false);
  });

  it('returns false when exactly 24h remaining', () => {
    // boundary: exactly 24h is NOT urgent (< 24h rule)
    const endDate = NOW + MS_IN_24H;
    expect(isUrgent(endDate, NOW)).toBe(false);
  });

  it('returns true when < 24h remaining', () => {
    const endDate = NOW + MS_IN_24H - 1; // one ms under 24h
    expect(isUrgent(endDate, NOW)).toBe(true);
  });

  it('returns true when 1h remaining', () => {
    const endDate = NOW + MS_IN_1H;
    expect(isUrgent(endDate, NOW)).toBe(true);
  });

  it('returns true when event has already ended (negative remaining)', () => {
    const endDate = NOW - MS_IN_1H;
    expect(isUrgent(endDate, NOW)).toBe(true);
  });

  it('returns true when endDate equals now (0 remaining)', () => {
    expect(isUrgent(NOW, NOW)).toBe(true);
  });
});

// ─── getPerMemberAverage ──────────────────────────────────────────────────────

describe('getPerMemberAverage', () => {
  it('returns 0 when memberCount is 0 (division by zero guard)', () => {
    expect(getPerMemberAverage(500, 0)).toBe(0);
  });

  it('returns 0 when memberCount is negative (guard)', () => {
    expect(getPerMemberAverage(500, -5)).toBe(0);
  });

  it('returns total when 1 member', () => {
    expect(getPerMemberAverage(100, 1)).toBe(100);
  });

  it('returns correct average for normal case', () => {
    expect(getPerMemberAverage(500, 5)).toBe(100);
  });

  it('handles fractional averages correctly', () => {
    expect(getPerMemberAverage(100, 3)).toBeCloseTo(33.333);
  });

  it('returns 0 when total is 0', () => {
    expect(getPerMemberAverage(0, 10)).toBe(0);
  });
});

// ─── rankCrewEntries ──────────────────────────────────────────────────────────

describe('rankCrewEntries', () => {
  it('returns empty array for empty input', () => {
    expect(rankCrewEntries([])).toEqual([]);
  });

  it('assigns rank 1 to highest total progress', () => {
    const entries = [
      makeCrewEntry({ crewId: 'a', totalProgress: 200 }),
      makeCrewEntry({ crewId: 'b', totalProgress: 100 }),
    ];
    const ranked = rankCrewEntries(entries);
    expect(ranked[0].crewId).toBe('a');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].crewId).toBe('b');
    expect(ranked[1].rank).toBe(2);
  });

  it('sorts descending by totalProgress', () => {
    const entries = [
      makeCrewEntry({ crewId: 'low', totalProgress: 50 }),
      makeCrewEntry({ crewId: 'high', totalProgress: 300 }),
      makeCrewEntry({ crewId: 'mid', totalProgress: 150 }),
    ];
    const ranked = rankCrewEntries(entries);
    expect(ranked.map((e) => e.crewId)).toEqual(['high', 'mid', 'low']);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('breaks ties alphabetically by crewName', () => {
    const entries = [
      makeCrewEntry({ crewId: 'z', crewName: 'Zebra', totalProgress: 100 }),
      makeCrewEntry({ crewId: 'a', crewName: 'Alpha', totalProgress: 100 }),
    ];
    const ranked = rankCrewEntries(entries);
    expect(ranked[0].crewName).toBe('Alpha');
    expect(ranked[1].crewName).toBe('Zebra');
  });

  it('does not mutate the input array', () => {
    const entries = [
      makeCrewEntry({ crewId: 'b', totalProgress: 100 }),
      makeCrewEntry({ crewId: 'a', totalProgress: 200 }),
    ];
    const original = [...entries];
    rankCrewEntries(entries);
    expect(entries[0].crewId).toBe(original[0].crewId);
    expect(entries[1].crewId).toBe(original[1].crewId);
  });

  it('handles single entry with rank 1', () => {
    const entries = [makeCrewEntry({ crewId: 'solo', totalProgress: 999 })];
    const ranked = rankCrewEntries(entries);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank).toBe(1);
  });
});

// ─── getShareCardTitle ────────────────────────────────────────────────────────

describe('getShareCardTitle', () => {
  it('rank_up → "Rank Up!"', () => {
    expect(getShareCardTitle('rank_up')).toBe('Rank Up!');
  });

  it('duel_victory → "Victory!"', () => {
    expect(getShareCardTitle('duel_victory')).toBe('Victory!');
  });

  it('season_summary → "Season Complete"', () => {
    expect(getShareCardTitle('season_summary')).toBe('Season Complete');
  });

  it('league_standing → "League Standing"', () => {
    expect(getShareCardTitle('league_standing')).toBe('League Standing');
  });
});

// ─── getShareCardSubtitle ─────────────────────────────────────────────────────

describe('getShareCardSubtitle', () => {
  describe('rank_up', () => {
    it('includes from/to tiers when both present', () => {
      const subtitle = getShareCardSubtitle(
        'rank_up',
        makeShareData({ oldTier: 'silver', newTier: 'gold' }),
      );
      expect(subtitle).toContain('Silver');
      expect(subtitle).toContain('Gold');
    });

    it('falls back gracefully when tiers are missing', () => {
      const subtitle = getShareCardSubtitle('rank_up', makeShareData());
      // oldTier falls back to 'previous tier', capitalised to 'Previous tier'
      expect(subtitle.toLowerCase()).toContain('previous tier');
    });
  });

  describe('duel_victory', () => {
    it('includes opponent name and metric when both present', () => {
      const subtitle = getShareCardSubtitle(
        'duel_victory',
        makeShareData({ opponentName: 'Bob', metric: 'Volume' }),
      );
      expect(subtitle).toContain('Bob');
      expect(subtitle).toContain('Volume');
    });

    it('falls back to "Won a duel" when no opponent data', () => {
      const subtitle = getShareCardSubtitle('duel_victory', makeShareData());
      expect(subtitle).toBe('Won a duel');
    });

    it('includes opponent name even when metric is missing', () => {
      const subtitle = getShareCardSubtitle(
        'duel_victory',
        makeShareData({ opponentName: 'Alice' }),
      );
      expect(subtitle).toContain('Alice');
    });
  });

  describe('season_summary', () => {
    it('includes season name and RP when both present', () => {
      const subtitle = getShareCardSubtitle(
        'season_summary',
        makeShareData({ seasonName: 'Iron Season', totalRP: 1500 }),
      );
      expect(subtitle).toContain('Iron Season');
      expect(subtitle).toContain('1500 RP');
    });

    it('falls back to "this season" when name missing', () => {
      const subtitle = getShareCardSubtitle(
        'season_summary',
        makeShareData({ totalRP: 500 }),
      );
      expect(subtitle).toContain('this season');
    });
  });

  describe('league_standing', () => {
    it('includes rank and size when both present', () => {
      const subtitle = getShareCardSubtitle(
        'league_standing',
        makeShareData({ leagueRank: 3, leagueSize: 50 }),
      );
      expect(subtitle).toContain('#3');
      expect(subtitle).toContain('50');
    });

    it('uses fallback when no rank data', () => {
      const subtitle = getShareCardSubtitle('league_standing', makeShareData());
      expect(subtitle).toBe('Check my league rank');
    });

    it('works with only leagueRank (no size)', () => {
      const subtitle = getShareCardSubtitle(
        'league_standing',
        makeShareData({ leagueRank: 1 }),
      );
      expect(subtitle).toContain('#1');
    });
  });
});

// ─── formatShareValue ─────────────────────────────────────────────────────────

describe('formatShareValue', () => {
  it('formats integer values with comma separator', () => {
    expect(formatShareValue(1234, 'lbs')).toBe('1,234 lbs');
  });

  it('formats large integers with commas', () => {
    expect(formatShareValue(1000000, 'lbs')).toBe('1,000,000 lbs');
  });

  it('formats decimal values without unnecessary precision', () => {
    const result = formatShareValue(5.25, 'mi');
    expect(result).toContain('5.25');
    expect(result).toContain('mi');
  });

  it('formats zero correctly', () => {
    expect(formatShareValue(0, 'km')).toBe('0 km');
  });

  it('includes unit in output', () => {
    expect(formatShareValue(100, 'reps')).toContain('reps');
  });

  it('formats single decimal value', () => {
    const result = formatShareValue(5.2, 'mi');
    expect(result).toContain('5.2');
  });
});
