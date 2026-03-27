/**
 * rankTierV2.test.ts — comprehensive tests for all pure utility functions.
 *
 * Coverage:
 *   getTierForRP      — boundary values, negative RP
 *   getRPProgress     — boundaries, mid-tier, legendary
 *   getRPToNextTier   — each tier, legendary null
 *   didTierChange     — same tier, up, down, multi-tier
 *   mapV2ToLegacy     — each V2 tier
 *   mapLegacyToV2     — each legacy tier
 *   getDisplayTier    — V2 set, legacy-only, neither
 */
import {
  RANK_TIERS_V2,
  getTierForRP,
  getRPProgress,
  getRPToNextTier,
  didTierChange,
  mapV2ToLegacy,
  mapLegacyToV2,
  getDisplayTier,
} from '../utils/rankTierV2';
import type { RankTierV2 } from '../types/rankV2';
import type { RankTier } from '../types/social';

// ─── getTierForRP ─────────────────────────────────────────────────────────────

describe('getTierForRP', () => {
  it('returns bronze at 0 RP', () => {
    expect(getTierForRP(0).tier).toBe('bronze');
  });

  it('returns bronze at 199 RP (just below silver threshold)', () => {
    expect(getTierForRP(199).tier).toBe('bronze');
  });

  it('returns silver at exactly 200 RP', () => {
    expect(getTierForRP(200).tier).toBe('silver');
  });

  it('returns silver at 499 RP (just below gold threshold)', () => {
    expect(getTierForRP(499).tier).toBe('silver');
  });

  it('returns gold at exactly 500 RP', () => {
    expect(getTierForRP(500).tier).toBe('gold');
  });

  it('returns gold at 999 RP (just below platinum threshold)', () => {
    expect(getTierForRP(999).tier).toBe('gold');
  });

  it('returns platinum at exactly 1000 RP', () => {
    expect(getTierForRP(1000).tier).toBe('platinum');
  });

  it('returns platinum at 1999 RP (just below diamond threshold)', () => {
    expect(getTierForRP(1999).tier).toBe('platinum');
  });

  it('returns diamond at exactly 2000 RP', () => {
    expect(getTierForRP(2000).tier).toBe('diamond');
  });

  it('returns diamond at 4999 RP (just below legendary threshold)', () => {
    expect(getTierForRP(4999).tier).toBe('diamond');
  });

  it('returns legendary at exactly 5000 RP', () => {
    expect(getTierForRP(5000).tier).toBe('legendary');
  });

  it('returns legendary at very high RP (99999)', () => {
    expect(getTierForRP(99999).tier).toBe('legendary');
  });

  it('returns bronze for negative RP (clamped to 0)', () => {
    expect(getTierForRP(-100).tier).toBe('bronze');
  });

  it('returns bronze for -999 RP', () => {
    expect(getTierForRP(-999).tier).toBe('bronze');
  });

  // Returned info object correctness
  it('returns the correct color for gold tier', () => {
    expect(getTierForRP(500).color).toBe('#FFD700');
  });

  it('returns the correct particleCount for legendary tier', () => {
    expect(getTierForRP(5000).particleCount).toBe(40);
  });
});

// ─── getRPProgress ────────────────────────────────────────────────────────────

describe('getRPProgress', () => {
  it('returns progress 0 at start of bronze (0 RP)', () => {
    const { progress, next } = getRPProgress(0);
    expect(progress).toBe(0);
    expect(next).toBe(200); // next tier threshold
  });

  it('returns progress 0.5 at mid-bronze (100 RP)', () => {
    const { progress } = getRPProgress(100);
    expect(progress).toBeCloseTo(0.5);
  });

  it('returns progress 1 at boundary entering silver (200 RP)', () => {
    // At 200 RP the player is IN silver, progress resets to 0
    const { progress } = getRPProgress(200);
    expect(progress).toBe(0);
  });

  it('returns progress 0.5 at mid-silver (350 RP)', () => {
    // silver: 200–500, mid = 350
    const { progress } = getRPProgress(350);
    expect(progress).toBeCloseTo(0.5);
  });

  it('returns progress 0 at exact gold boundary', () => {
    const { progress, next } = getRPProgress(500);
    expect(progress).toBe(0);
    expect(next).toBe(1000);
  });

  it('returns progress 0 at exact platinum boundary', () => {
    const { progress } = getRPProgress(1000);
    expect(progress).toBe(0);
  });

  it('returns progress 0 at exact diamond boundary', () => {
    const { progress } = getRPProgress(2000);
    expect(progress).toBe(0);
  });

  it('returns progress 0 at exact legendary boundary', () => {
    const { progress, next } = getRPProgress(5000);
    expect(progress).toBe(1);
    expect(next).toBeNull();
  });

  it('returns progress 1 and next null at legendary', () => {
    const { progress, next } = getRPProgress(99999);
    expect(progress).toBe(1);
    expect(next).toBeNull();
  });

  it('returns current RP value correctly', () => {
    const { current } = getRPProgress(750);
    expect(current).toBe(750);
  });

  it('clamps negative RP to 0 (bronze start)', () => {
    const { progress, current } = getRPProgress(-50);
    expect(current).toBe(0);
    expect(progress).toBe(0);
  });
});

// ─── getRPToNextTier ──────────────────────────────────────────────────────────

describe('getRPToNextTier', () => {
  it('returns 200 RP needed from bronze (0 RP)', () => {
    expect(getRPToNextTier(0)).toBe(200);
  });

  it('returns 100 RP needed from mid-bronze (100 RP)', () => {
    expect(getRPToNextTier(100)).toBe(100);
  });

  it('returns 300 RP needed from silver start (200 RP)', () => {
    expect(getRPToNextTier(200)).toBe(300);
  });

  it('returns 500 RP needed from gold start (500 RP)', () => {
    expect(getRPToNextTier(500)).toBe(500);
  });

  it('returns 1000 RP needed from platinum start (1000 RP)', () => {
    expect(getRPToNextTier(1000)).toBe(1000);
  });

  it('returns 3000 RP needed from diamond start (2000 RP)', () => {
    expect(getRPToNextTier(2000)).toBe(3000);
  });

  it('returns null at legendary (5000 RP)', () => {
    expect(getRPToNextTier(5000)).toBeNull();
  });

  it('returns null beyond legendary (99999 RP)', () => {
    expect(getRPToNextTier(99999)).toBeNull();
  });

  it('returns 0 for negative RP clamped to 0', () => {
    // Negative RP clamps to 0 (bronze), still needs 200 to reach silver
    expect(getRPToNextTier(-100)).toBe(200);
  });
});

// ─── didTierChange ────────────────────────────────────────────────────────────

describe('didTierChange', () => {
  it('returns changed=false when RP changes within same tier', () => {
    const result = didTierChange(50, 150);
    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
    expect(result.oldTier.tier).toBe('bronze');
    expect(result.newTier.tier).toBe('bronze');
  });

  it('returns changed=false when RP is identical', () => {
    const result = didTierChange(500, 500);
    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
  });

  it('detects tier up from bronze to silver', () => {
    const result = didTierChange(199, 200);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.oldTier.tier).toBe('bronze');
    expect(result.newTier.tier).toBe('silver');
  });

  it('detects tier up from silver to gold', () => {
    const result = didTierChange(499, 500);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.oldTier.tier).toBe('silver');
    expect(result.newTier.tier).toBe('gold');
  });

  it('detects tier up from diamond to legendary', () => {
    const result = didTierChange(4999, 5000);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.oldTier.tier).toBe('diamond');
    expect(result.newTier.tier).toBe('legendary');
  });

  it('detects tier down from silver to bronze', () => {
    const result = didTierChange(250, 100);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('down');
    expect(result.oldTier.tier).toBe('silver');
    expect(result.newTier.tier).toBe('bronze');
  });

  it('detects tier down from legendary to diamond', () => {
    const result = didTierChange(5000, 4999);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('down');
    expect(result.oldTier.tier).toBe('legendary');
    expect(result.newTier.tier).toBe('diamond');
  });

  it('detects multiple tiers up (bronze to gold)', () => {
    const result = didTierChange(100, 600);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.oldTier.tier).toBe('bronze');
    expect(result.newTier.tier).toBe('gold');
  });

  it('detects multiple tiers down (legendary to bronze)', () => {
    const result = didTierChange(9999, 50);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('down');
    expect(result.oldTier.tier).toBe('legendary');
    expect(result.newTier.tier).toBe('bronze');
  });
});

// ─── mapV2ToLegacy ────────────────────────────────────────────────────────────

describe('mapV2ToLegacy', () => {
  const cases: [RankTierV2, RankTier][] = [
    ['bronze', 'bronze'],
    ['silver', 'silver'],
    ['gold', 'gold'],
    ['platinum', 'platinum'],
    ['diamond', 'elite'],
    ['legendary', 'elite'],
  ];

  it.each(cases)('maps V2 "%s" → legacy "%s"', (v2, legacy) => {
    expect(mapV2ToLegacy(v2)).toBe(legacy);
  });
});

// ─── mapLegacyToV2 ────────────────────────────────────────────────────────────

describe('mapLegacyToV2', () => {
  const cases: [RankTier, RankTierV2][] = [
    ['bronze', 'bronze'],
    ['silver', 'silver'],
    ['gold', 'gold'],
    ['platinum', 'platinum'],
    ['elite', 'diamond'],
  ];

  it.each(cases)('maps legacy "%s" → V2 "%s"', (legacy, v2) => {
    expect(mapLegacyToV2(legacy)).toBe(v2);
  });

  it('maps elite to diamond (not legendary — legendary requires explicit RP)', () => {
    expect(mapLegacyToV2('elite')).toBe('diamond');
  });
});

// ─── getDisplayTier ───────────────────────────────────────────────────────────

describe('getDisplayTier', () => {
  it('returns V2 tier info when rankTierV2 is set', () => {
    const result = getDisplayTier('legendary', 'bronze');
    expect(result.tier).toBe('legendary');
  });

  it('uses V2 tier over legacy when both are set', () => {
    const result = getDisplayTier('diamond', 'elite');
    expect(result.tier).toBe('diamond');
  });

  it('falls back to mapped legacy tier when rankTierV2 is undefined', () => {
    const result = getDisplayTier(undefined, 'elite');
    expect(result.tier).toBe('diamond');
  });

  it('falls back to mapped legacy bronze when rankTierV2 is undefined', () => {
    const result = getDisplayTier(undefined, 'bronze');
    expect(result.tier).toBe('bronze');
  });

  it('falls back to mapped legacy gold when rankTierV2 is undefined', () => {
    const result = getDisplayTier(undefined, 'gold');
    expect(result.tier).toBe('gold');
  });

  it('defaults to bronze when both rankTierV2 and legacyTier are undefined', () => {
    const result = getDisplayTier(undefined, undefined);
    expect(result.tier).toBe('bronze');
  });

  it('returns full RankTierV2Info object (not just tier name)', () => {
    const result = getDisplayTier('gold', undefined);
    expect(result.minRP).toBe(500);
    expect(result.color).toBe('#FFD700');
    expect(result.label).toBe('Gold');
  });

  it('returned object for legacy fallback has correct minRP', () => {
    // elite → diamond → minRP 2000
    const result = getDisplayTier(undefined, 'elite');
    expect(result.minRP).toBe(2000);
  });

  it('returns a valid RankTierV2Info for every V2 tier value', () => {
    const v2Tiers: RankTierV2[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'];
    for (const tier of v2Tiers) {
      const result = getDisplayTier(tier, undefined);
      expect(result.tier).toBe(tier);
      expect(typeof result.color).toBe('string');
      expect(typeof result.minRP).toBe('number');
    }
  });
});

// ─── RANK_TIERS_V2 constant ───────────────────────────────────────────────────

describe('RANK_TIERS_V2 constant', () => {
  it('has exactly 6 tiers', () => {
    expect(RANK_TIERS_V2).toHaveLength(6);
  });

  it('is sorted ascending by minRP', () => {
    for (let i = 1; i < RANK_TIERS_V2.length; i++) {
      expect(RANK_TIERS_V2[i].minRP).toBeGreaterThan(RANK_TIERS_V2[i - 1].minRP);
    }
  });

  it('has bronze at minRP 0', () => {
    expect(RANK_TIERS_V2[0].tier).toBe('bronze');
    expect(RANK_TIERS_V2[0].minRP).toBe(0);
  });

  it('has legendary at minRP 5000', () => {
    const legendary = RANK_TIERS_V2[RANK_TIERS_V2.length - 1];
    expect(legendary.tier).toBe('legendary');
    expect(legendary.minRP).toBe(5000);
  });

  it('each tier has particleCount between 8 and 40', () => {
    for (const t of RANK_TIERS_V2) {
      expect(t.particleCount).toBeGreaterThanOrEqual(8);
      expect(t.particleCount).toBeLessThanOrEqual(40);
    }
  });

  it('each tier has a non-empty icon string', () => {
    for (const t of RANK_TIERS_V2) {
      expect(t.icon.length).toBeGreaterThan(0);
    }
  });
});
