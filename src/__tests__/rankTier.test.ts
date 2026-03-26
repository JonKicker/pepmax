import {
  getTierForXP,
  getTierInfo,
  getXPToNextTier,
  getTierProgress,
  RANK_TIERS,
} from '../utils/rankTier';
import type { RankTier } from '../types/social';

// ─── getTierForXP ─────────────────────────────────────────────────────────────

describe('getTierForXP', () => {
  it('returns bronze at 0 XP', () => {
    expect(getTierForXP(0).tier).toBe('bronze');
  });

  it('returns bronze just below silver threshold', () => {
    expect(getTierForXP(999).tier).toBe('bronze');
  });

  it('returns silver at exactly 1 000 XP', () => {
    expect(getTierForXP(1_000).tier).toBe('silver');
  });

  it('returns silver just below gold threshold', () => {
    expect(getTierForXP(4_999).tier).toBe('silver');
  });

  it('returns gold at exactly 5 000 XP', () => {
    expect(getTierForXP(5_000).tier).toBe('gold');
  });

  it('returns platinum at exactly 15 000 XP', () => {
    expect(getTierForXP(15_000).tier).toBe('platinum');
  });

  it('returns elite at exactly 40 000 XP', () => {
    expect(getTierForXP(40_000).tier).toBe('elite');
  });

  it('returns elite for very high XP', () => {
    expect(getTierForXP(1_000_000).tier).toBe('elite');
  });

  it('returns bronze for negative XP (guard against bad data)', () => {
    expect(getTierForXP(-100).tier).toBe('bronze');
  });

  it('returns the correct tier info object (has color and icon)', () => {
    const info = getTierForXP(5_000);
    expect(info.tier).toBe('gold');
    expect(info.color).toBeDefined();
    expect(info.icon).toBeDefined();
    expect(info.label).toBe('Gold');
  });
});

// ─── getTierInfo ──────────────────────────────────────────────────────────────

describe('getTierInfo', () => {
  it('returns the correct info for each tier', () => {
    const tiers: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'elite'];
    for (const tier of tiers) {
      const info = getTierInfo(tier);
      expect(info.tier).toBe(tier);
    }
  });

  it('falls back to bronze for an unknown tier string', () => {
    const info = getTierInfo('unknown' as RankTier);
    expect(info.tier).toBe('bronze');
  });
});

// ─── getXPToNextTier ──────────────────────────────────────────────────────────

describe('getXPToNextTier', () => {
  it('returns 1 000 - 0 = 1 000 for a new user at 0 XP', () => {
    expect(getXPToNextTier(0)).toBe(1_000);
  });

  it('returns 1 at 999 XP (1 away from silver)', () => {
    expect(getXPToNextTier(999)).toBe(1);
  });

  it('returns 4 000 at exactly silver threshold (5 000 - 1 000)', () => {
    expect(getXPToNextTier(1_000)).toBe(4_000);
  });

  it('returns null at max tier (elite)', () => {
    expect(getXPToNextTier(40_000)).toBeNull();
  });

  it('returns null well above elite threshold', () => {
    expect(getXPToNextTier(999_999)).toBeNull();
  });
});

// ─── getTierProgress ──────────────────────────────────────────────────────────

describe('getTierProgress', () => {
  it('returns 0 at the start of bronze tier', () => {
    expect(getTierProgress(0)).toBeCloseTo(0);
  });

  it('returns 0.5 at the midpoint of bronze tier (500 / 1 000)', () => {
    expect(getTierProgress(500)).toBeCloseTo(0.5);
  });

  it('returns close to 1 just before the silver threshold', () => {
    expect(getTierProgress(999)).toBeCloseTo(0.999, 2);
  });

  it('returns 0 exactly at silver threshold (start of new tier)', () => {
    expect(getTierProgress(1_000)).toBeCloseTo(0);
  });

  it('returns 0.5 at midpoint of silver (3 000 / 4 000 range → 2 000 above start)', () => {
    // silver: 1 000 → 5 000 (range = 4 000). Midpoint = 3 000 XP
    expect(getTierProgress(3_000)).toBeCloseTo(0.5);
  });

  it('returns 1 at or above max tier', () => {
    expect(getTierProgress(40_000)).toBe(1);
    expect(getTierProgress(100_000)).toBe(1);
  });

  it('clamps to 0 for negative XP', () => {
    expect(getTierProgress(-1)).toBe(0);
  });

  it('returns a value between 0 and 1 for any valid XP', () => {
    const xpValues = [0, 500, 1_000, 2_500, 5_000, 10_000, 15_000, 30_000, 40_000];
    for (const xp of xpValues) {
      const p = getTierProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

// ─── RANK_TIERS structural integrity ─────────────────────────────────────────

describe('RANK_TIERS constant', () => {
  it('has 5 tiers', () => {
    expect(RANK_TIERS).toHaveLength(5);
  });

  it('is ordered by ascending minXP', () => {
    for (let i = 1; i < RANK_TIERS.length; i++) {
      expect(RANK_TIERS[i].minXP).toBeGreaterThan(RANK_TIERS[i - 1].minXP);
    }
  });

  it('first tier starts at 0 XP', () => {
    expect(RANK_TIERS[0].minXP).toBe(0);
  });

  it('every tier has a non-empty color, icon, and label', () => {
    for (const tier of RANK_TIERS) {
      expect(tier.color).toBeTruthy();
      expect(tier.icon).toBeTruthy();
      expect(tier.label).toBeTruthy();
    }
  });
});
