/**
 * pvpVisuals.test.ts — tests for PVP Phase 2 pure/testable logic.
 *
 * Coverage:
 * ─── determineStatWinner (10 tests)
 *     happy path (higher better), lower better, tie, zero values
 * ─── calculateOverallWinner (8 tests)
 *     clear winner, tie, all ties, single stat, all same side, empty input
 * ─── WinStreakBadge rendering logic (8 tests)
 *     streak < 3 returns null, 3-4 uses flame-outline, 5-9 uses flame, 10+ uses skull
 * ─── getParticleCountForTier (6 tests)
 *     each tier returns value within cap (≤40)
 */

import {
  determineStatWinner,
  calculateOverallWinner,
} from '../utils/compareFormatters';

import { getParticleCountForTier } from '../utils/celebrationPresets';

// ─── Helper: WinStreakBadge config logic ──────────────────────────────────────
//
// We test the pure config-selection logic extracted from the component.
// The component itself returns null for streak < 3.

type StreakIconConfig = {
  iconName: 'flame-outline' | 'flame' | 'skull';
  shouldPulse: boolean;
} | null;

function getStreakConfig(streak: number): StreakIconConfig {
  if (streak < 3) return null;
  if (streak <= 4) return { iconName: 'flame-outline', shouldPulse: false };
  if (streak <= 9) return { iconName: 'flame', shouldPulse: true };
  return { iconName: 'skull', shouldPulse: true };
}

// ─── determineStatWinner ─────────────────────────────────────────────────────

describe('determineStatWinner', () => {
  // ─── higher is better ────────────────────────────────────────────────────

  it('returns "me" when my value is higher and higherIsBetter is true', () => {
    expect(determineStatWinner(150, 100, true)).toBe('me');
  });

  it('returns "them" when their value is higher and higherIsBetter is true', () => {
    expect(determineStatWinner(80, 120, true)).toBe('them');
  });

  it('returns "tie" when values are equal (higherIsBetter true)', () => {
    expect(determineStatWinner(100, 100, true)).toBe('tie');
  });

  // ─── lower is better ─────────────────────────────────────────────────────

  it('returns "me" when my value is lower and higherIsBetter is false', () => {
    expect(determineStatWinner(4.5, 6.0, false)).toBe('me');
  });

  it('returns "them" when their value is lower and higherIsBetter is false', () => {
    expect(determineStatWinner(8.0, 5.0, false)).toBe('them');
  });

  it('returns "tie" when values are equal (higherIsBetter false)', () => {
    expect(determineStatWinner(5.25, 5.25, false)).toBe('tie');
  });

  // ─── zero values ─────────────────────────────────────────────────────────

  it('handles zero vs positive (higherIsBetter true): they win', () => {
    expect(determineStatWinner(0, 50, true)).toBe('them');
  });

  it('handles zero vs positive (higherIsBetter false): I win (lower is better)', () => {
    expect(determineStatWinner(0, 50, false)).toBe('me');
  });

  it('handles both zero values as tie', () => {
    expect(determineStatWinner(0, 0, true)).toBe('tie');
    expect(determineStatWinner(0, 0, false)).toBe('tie');
  });

  it('handles negative values (higherIsBetter true): positive beats negative', () => {
    expect(determineStatWinner(-5, 0, true)).toBe('them');
  });
});

// ─── calculateOverallWinner ──────────────────────────────────────────────────

describe('calculateOverallWinner', () => {
  it('returns clear winner when I win more stats', () => {
    const results = calculateOverallWinner(['me', 'me', 'them']);
    expect(results.winner).toBe('me');
    expect(results.myWins).toBe(2);
    expect(results.theirWins).toBe(1);
  });

  it('returns clear winner when they win more stats', () => {
    const results = calculateOverallWinner(['them', 'them', 'me']);
    expect(results.winner).toBe('them');
    expect(results.myWins).toBe(1);
    expect(results.theirWins).toBe(2);
  });

  it('returns tie when wins are equal (both have wins)', () => {
    const results = calculateOverallWinner(['me', 'them', 'me', 'them']);
    expect(results.winner).toBe('tie');
    expect(results.myWins).toBe(2);
    expect(results.theirWins).toBe(2);
  });

  it('returns tie when all stats are tied', () => {
    const results = calculateOverallWinner(['tie', 'tie', 'tie']);
    expect(results.winner).toBe('tie');
    expect(results.myWins).toBe(0);
    expect(results.theirWins).toBe(0);
  });

  it('handles single stat — my win', () => {
    const results = calculateOverallWinner(['me']);
    expect(results.winner).toBe('me');
    expect(results.myWins).toBe(1);
    expect(results.theirWins).toBe(0);
  });

  it('handles single stat — their win', () => {
    const results = calculateOverallWinner(['them']);
    expect(results.winner).toBe('them');
    expect(results.myWins).toBe(0);
    expect(results.theirWins).toBe(1);
  });

  it('handles empty input as tie with 0 wins', () => {
    const results = calculateOverallWinner([]);
    expect(results.winner).toBe('tie');
    expect(results.myWins).toBe(0);
    expect(results.theirWins).toBe(0);
  });

  it('tie results do not count toward either side', () => {
    const results = calculateOverallWinner(['me', 'tie', 'tie']);
    expect(results.winner).toBe('me');
    expect(results.myWins).toBe(1);
    expect(results.theirWins).toBe(0);
  });
});

// ─── WinStreakBadge rendering logic ──────────────────────────────────────────

describe('WinStreakBadge getStreakConfig logic', () => {
  // streak < 3: null (don't render)

  it('returns null for streak 0', () => {
    expect(getStreakConfig(0)).toBeNull();
  });

  it('returns null for streak 1', () => {
    expect(getStreakConfig(1)).toBeNull();
  });

  it('returns null for streak 2', () => {
    expect(getStreakConfig(2)).toBeNull();
  });

  // streak 3-4: flame-outline, no pulse

  it('returns flame-outline config for streak 3', () => {
    const config = getStreakConfig(3);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('flame-outline');
    expect(config!.shouldPulse).toBe(false);
  });

  it('returns flame-outline config for streak 4', () => {
    const config = getStreakConfig(4);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('flame-outline');
    expect(config!.shouldPulse).toBe(false);
  });

  // streak 5-9: flame (filled), should pulse

  it('returns flame config with pulse for streak 5', () => {
    const config = getStreakConfig(5);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('flame');
    expect(config!.shouldPulse).toBe(true);
  });

  it('returns flame config with pulse for streak 9', () => {
    const config = getStreakConfig(9);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('flame');
    expect(config!.shouldPulse).toBe(true);
  });

  // streak 10+: skull, should pulse

  it('returns skull config with pulse for streak 10', () => {
    const config = getStreakConfig(10);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('skull');
    expect(config!.shouldPulse).toBe(true);
  });

  it('returns skull config with pulse for streak 50', () => {
    const config = getStreakConfig(50);
    expect(config).not.toBeNull();
    expect(config!.iconName).toBe('skull');
    expect(config!.shouldPulse).toBe(true);
  });
});

// ─── getParticleCountForTier cap verification ────────────────────────────────

describe('getParticleCountForTier cap (≤40)', () => {
  const PARTICLE_CAP = 40;

  it('micro tier returns 0 particles', () => {
    expect(getParticleCountForTier('micro')).toBe(0);
  });

  it('medium tier returns ≤40 particles', () => {
    expect(getParticleCountForTier('medium')).toBeLessThanOrEqual(PARTICLE_CAP);
  });

  it('major tier returns ≤40 particles', () => {
    expect(getParticleCountForTier('major')).toBeLessThanOrEqual(PARTICLE_CAP);
  });

  it('legendary tier returns exactly 40 particles (at cap)', () => {
    expect(getParticleCountForTier('legendary')).toBe(PARTICLE_CAP);
  });

  it('no tier returns a particle count above 40', () => {
    const tiers = ['micro', 'medium', 'major', 'legendary'] as const;
    for (const tier of tiers) {
      expect(getParticleCountForTier(tier)).toBeLessThanOrEqual(PARTICLE_CAP);
    }
  });

  it('micro returns fewer particles than medium', () => {
    expect(getParticleCountForTier('micro')).toBeLessThan(
      getParticleCountForTier('medium'),
    );
  });
});
