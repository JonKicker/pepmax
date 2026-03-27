/**
 * Unit tests for the muscle heat map engine.
 * Tests: getHeatMapColor, detectImbalances, buildHeatMapColors
 */
import {
  getHeatMapColor,
  detectImbalances,
  buildHeatMapColors,
  getRegionIdsForMuscle,
  type MuscleStats,
} from '../utils/muscleMapping';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMuscleStats(muscle: string, weeklyVolume: number, weeklySets = 0): MuscleStats {
  return {
    muscle: muscle as MuscleStats['muscle'],
    lastTrained: null,
    daysSinceTraining: null,
    weeklySets,
    weeklyVolume,
    topExercises: [],
  };
}

function makeStatsMap(entries: [string, number][]): Map<string, MuscleStats> {
  const map = new Map<string, MuscleStats>();
  for (const [muscle, volume] of entries) {
    map.set(muscle, makeMuscleStats(muscle, volume, Math.round(volume / 100)));
  }
  return map;
}

// ─── getHeatMapColor ─────────────────────────────────────────────────────────

describe('getHeatMapColor', () => {
  it('returns blue (#3B82F6) at 0 volume (cold end)', () => {
    const result = getHeatMapColor(0, 1000);
    expect(result.fill).toBe('#3b82f6');
    // Cold end should be near minimum opacity
    expect(result.fillOpacity).toBeLessThanOrEqual(0.3);
  });

  it('returns red-ish (#EF4444) at max volume (hot end)', () => {
    const result = getHeatMapColor(1000, 1000);
    expect(result.fill).toBe('#ef4444');
    // Hot end should be near maximum opacity
    expect(result.fillOpacity).toBeGreaterThanOrEqual(0.75);
  });

  it('returns green-ish at 50% volume', () => {
    const result = getHeatMapColor(500, 1000);
    // At 50% we should be near the green stop (#22C55E)
    expect(result.fill).toBe('#22c55e');
    expect(result.fillOpacity).toBeGreaterThan(0.3);
    expect(result.fillOpacity).toBeLessThan(0.85);
  });

  it('handles maxVolume === 0 — returns cold-end blue at 0.25 opacity', () => {
    const result = getHeatMapColor(0, 0);
    expect(result.fill).toBe('#3B82F6');
    expect(result.fillOpacity).toBe(0.25);
  });

  it('handles maxVolume === 0 even when weeklyVolume > 0', () => {
    const result = getHeatMapColor(999, 0);
    expect(result.fill).toBe('#3B82F6');
    expect(result.fillOpacity).toBe(0.25);
  });

  it('clamps ratio above 1 gracefully', () => {
    const result = getHeatMapColor(2000, 1000);
    expect(result.fill).toBe('#ef4444');
  });

  it('interpolates between blue and cyan at 12.5% volume', () => {
    const result = getHeatMapColor(125, 1000);
    // 12.5% is between blue (0%) and cyan (25%), should not be pure blue or pure cyan
    expect(result.fill).not.toBe('#3b82f6');
    expect(result.fill).not.toBe('#06b6d4');
    // Hex should start with #
    expect(result.fill).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// ─── detectImbalances ────────────────────────────────────────────────────────

describe('detectImbalances', () => {
  it('detects imbalance when one side is below 60% of the other', () => {
    const stats = makeStatsMap([
      ['Chest', 1000],
      ['Back', 500],   // ratio = 0.5, below 0.6 threshold
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(1);
    expect(result[0].weak).toBe('Back');
    expect(result[0].strong).toBe('Chest');
    expect(result[0].ratio).toBeCloseTo(0.5, 2);
  });

  it('does not flag balanced pairs (ratio >= 0.6)', () => {
    const stats = makeStatsMap([
      ['Biceps', 1000],
      ['Triceps', 700],  // ratio = 0.7, above threshold
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(0);
  });

  it('skips pairs where both muscles have weeklyVolume === 0', () => {
    const stats = makeStatsMap([
      ['Quads', 0],
      ['Hamstrings', 0],
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(0);
  });

  it('handles empty stats map', () => {
    const result = detectImbalances(new Map());
    expect(result).toHaveLength(0);
  });

  it('detects imbalance when one side is zero and the other is non-zero', () => {
    const stats = makeStatsMap([
      ['Shoulders', 800],
      ['Traps', 0],   // ratio = 0, clearly below 0.6
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(1);
    expect(result[0].weak).toBe('Traps');
    expect(result[0].strong).toBe('Shoulders');
    expect(result[0].ratio).toBe(0);
  });

  it('handles multiple imbalanced pairs correctly', () => {
    const stats = makeStatsMap([
      ['Chest', 1000],
      ['Back', 400],      // ratio 0.4 — imbalanced
      ['Biceps', 500],
      ['Triceps', 500],   // ratio 1.0 — balanced
      ['Quads', 900],
      ['Hamstrings', 200], // ratio ~0.22 — imbalanced
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(2);
    const muscles = result.map((r) => r.weak);
    expect(muscles).toContain('Back');
    expect(muscles).toContain('Hamstrings');
  });

  it('ratio is always weak/strong (0-1)', () => {
    const stats = makeStatsMap([
      ['Glutes', 200],
      ['Core', 1000],   // ratio = 0.2
    ]);
    const result = detectImbalances(stats);
    expect(result).toHaveLength(1);
    expect(result[0].ratio).toBeCloseTo(0.2, 2);
    expect(result[0].ratio).toBeGreaterThanOrEqual(0);
    expect(result[0].ratio).toBeLessThanOrEqual(1);
  });
});

// ─── buildHeatMapColors ──────────────────────────────────────────────────────

describe('buildHeatMapColors', () => {
  it('returns an object (correct shape)', () => {
    const stats = makeStatsMap([['Chest', 1000], ['Back', 500]]);
    const result = buildHeatMapColors('front', stats);
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });

  it('every region entry has fill (string) and fillOpacity (number)', () => {
    const stats = makeStatsMap([['Chest', 500], ['Shoulders', 300]]);
    const result = buildHeatMapColors('front', stats);
    for (const [, color] of Object.entries(result)) {
      expect(typeof color.fill).toBe('string');
      expect(color.fill).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof color.fillOpacity).toBe('number');
      expect(color.fillOpacity).toBeGreaterThanOrEqual(0);
      expect(color.fillOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('works with empty muscleStats (maxVolume = 0 path)', () => {
    const result = buildHeatMapColors('front', new Map());
    // All regions should get the cold-end fallback
    for (const [, color] of Object.entries(result)) {
      expect(color.fill).toBe('#3B82F6');
      expect(color.fillOpacity).toBe(0.25);
    }
  });

  it('returns colors for both front and back views', () => {
    const stats = makeStatsMap([['Chest', 1000], ['Back', 800]]);
    const frontResult = buildHeatMapColors('front', stats);
    const backResult = buildHeatMapColors('back', stats);
    // Both should be non-empty objects
    expect(Object.keys(frontResult).length).toBeGreaterThan(0);
    expect(Object.keys(backResult).length).toBeGreaterThan(0);
  });

  it('chest region receives hot-end fill color when Chest has max volume', () => {
    // Chest=10000 is the max — its regions should receive the hot-end red (#EF4444).
    // Back=5000 is at 50% — not hot-end.
    const stats = makeStatsMap([['Chest', 10000], ['Back', 5000]]);
    const result = buildHeatMapColors('front', stats);

    // Collect all SVG region IDs mapped to the Chest muscle group.
    const chestRegionIds = getRegionIdsForMuscle('Chest');

    expect(chestRegionIds.length).toBeGreaterThan(0);

    for (const regionId of chestRegionIds) {
      if (result[regionId]) {
        // Hot-end color is #EF4444 (lowercase: #ef4444).
        expect(result[regionId].fill.toLowerCase()).toBe('#ef4444');
        // Opacity should be at the high end (>= 0.75).
        expect(result[regionId].fillOpacity).toBeGreaterThanOrEqual(0.75);
      }
    }
  });
});
