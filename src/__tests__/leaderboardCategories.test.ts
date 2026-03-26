import {
  LEADERBOARD_CATEGORIES,
  getCategoryConfig,
  type LeaderboardCategoryConfig,
} from '../utils/leaderboardCategories';
import type { LeaderboardCategory } from '../types/social';

// ─── LEADERBOARD_CATEGORIES constant ─────────────────────────────────────────

describe('LEADERBOARD_CATEGORIES', () => {
  it('has exactly 6 categories', () => {
    expect(LEADERBOARD_CATEGORIES).toHaveLength(6);
  });

  it('contains all 6 expected category identifiers', () => {
    const ids = LEADERBOARD_CATEGORIES.map((c) => c.category);
    expect(ids).toContain('weeklyVolume');
    expect(ids).toContain('weeklyDistance');
    expect(ids).toContain('weeklyXP');
    expect(ids).toContain('monthlyVolume');
    expect(ids).toContain('monthlyDistance');
    expect(ids).toContain('allTimeXP');
  });

  it('every category has a non-empty label, shortLabel, icon, unit, and statKey', () => {
    for (const cat of LEADERBOARD_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(cat.shortLabel).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.unit).toBeTruthy();
      expect(cat.statKey).toBeTruthy();
    }
  });

  it('every category has a formatValue function', () => {
    for (const cat of LEADERBOARD_CATEGORIES) {
      expect(typeof cat.formatValue).toBe('function');
    }
  });

  it('statKey maps to a PublicProfileStats field for each category', () => {
    const expectedStatKeys: Record<LeaderboardCategory, string> = {
      weeklyVolume: 'weeklyVolume',
      weeklyDistance: 'weeklyDistance',
      weeklyXP: 'weeklyXP',
      monthlyVolume: 'monthlyVolume',
      monthlyDistance: 'monthlyDistance',
      allTimeXP: 'allTimeXP',
    };
    for (const cat of LEADERBOARD_CATEGORIES) {
      expect(cat.statKey).toBe(expectedStatKeys[cat.category]);
    }
  });
});

// ─── getCategoryConfig ────────────────────────────────────────────────────────

describe('getCategoryConfig', () => {
  it('returns the correct config for weeklyVolume', () => {
    const cfg = getCategoryConfig('weeklyVolume');
    expect(cfg.category).toBe('weeklyVolume');
    expect(cfg.unit).toBe('kg');
  });

  it('returns the correct config for weeklyDistance', () => {
    const cfg = getCategoryConfig('weeklyDistance');
    expect(cfg.category).toBe('weeklyDistance');
    expect(cfg.unit).toBe('km');
  });

  it('returns the correct config for allTimeXP', () => {
    const cfg = getCategoryConfig('allTimeXP');
    expect(cfg.category).toBe('allTimeXP');
    expect(cfg.unit).toBe('XP');
  });

  it('throws for an unknown category', () => {
    expect(() => getCategoryConfig('unknownCategory' as LeaderboardCategory)).toThrow();
  });
});

// ─── formatValue functions ────────────────────────────────────────────────────

describe('formatValue — weeklyVolume (kg)', () => {
  let cfg: LeaderboardCategoryConfig;
  beforeAll(() => {
    cfg = getCategoryConfig('weeklyVolume');
  });

  it('formats 0 as "0 kg"', () => {
    expect(cfg.formatValue(0)).toBe('0 kg');
  });

  it('formats 1000 with comma separator', () => {
    expect(cfg.formatValue(1000)).toBe('1,000 kg');
  });

  it('rounds decimal values', () => {
    expect(cfg.formatValue(1523.6)).toBe('1,524 kg');
  });

  it('formats large values correctly', () => {
    expect(cfg.formatValue(10000)).toBe('10,000 kg');
  });
});

describe('formatValue — weeklyDistance (km)', () => {
  let cfg: LeaderboardCategoryConfig;
  beforeAll(() => {
    cfg = getCategoryConfig('weeklyDistance');
  });

  it('formats small distances with 1 decimal place', () => {
    expect(cfg.formatValue(5.3)).toBe('5.3 km');
  });

  it('formats values >= 10 without decimal', () => {
    expect(cfg.formatValue(12.7)).toBe('13 km');
  });

  it('formats 0 with decimal', () => {
    expect(cfg.formatValue(0)).toBe('0.0 km');
  });

  it('formats large distance with comma', () => {
    expect(cfg.formatValue(1200)).toBe('1,200 km');
  });
});

describe('formatValue — weeklyXP / allTimeXP (XP)', () => {
  let weeklyXPCfg: LeaderboardCategoryConfig;
  let allTimeCfg: LeaderboardCategoryConfig;
  beforeAll(() => {
    weeklyXPCfg = getCategoryConfig('weeklyXP');
    allTimeCfg = getCategoryConfig('allTimeXP');
  });

  it('formats values below 1000 without k suffix', () => {
    expect(weeklyXPCfg.formatValue(500)).toBe('500 XP');
    expect(allTimeCfg.formatValue(999)).toBe('999 XP');
  });

  it('formats 1000 as "1.0k XP"', () => {
    expect(weeklyXPCfg.formatValue(1000)).toBe('1.0k XP');
  });

  it('formats large values with k suffix', () => {
    expect(allTimeCfg.formatValue(25000)).toBe('25.0k XP');
    expect(allTimeCfg.formatValue(1500)).toBe('1.5k XP');
  });

  it('formats 0 as "0 XP"', () => {
    expect(weeklyXPCfg.formatValue(0)).toBe('0 XP');
  });
});
