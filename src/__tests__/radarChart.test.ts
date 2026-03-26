/**
 * Tests for RadarChart pure utility functions.
 *
 * 18 tests covering:
 * - filterAxes: 5 axes when all scores valid (none are -1)
 * - filterAxes: 4 axes when user has -1 score
 * - filterAxes: 4 axes when opponent has -1 score
 * - filterAxes: 3 axes when two scores are -1 (one each side)
 * - filterAxes: returns empty array (degenerate) when fewer than 3 axes remain
 * - getVertexPosition: vertex at top (index 0, 5 total, score 100) should be at (center, center - maxRadius)
 * - getVertexPosition: vertex at score 50 should be at half radius
 * - getVertexPosition: vertex at score 0 should be at center
 * - getVertexPosition: score > 100 is clamped to 100 (same as score 100)
 * - getVertexPosition: negative non-sentinel score is clamped to 0 (same as score 0)
 * - getVertexPosition: totalAxes <= 0 returns center point (divide-by-zero guard)
 * - buildPolygonPoints: all-100 vertices land exactly at maxRadius from center
 * - buildPolygonPoints: known-good polygon string for a 3-axis all-100 case
 * - buildPolygonPoints: does not throw when all radar scores are 0
 * - buildPolygonPoints: does not throw when all radar scores are 100
 * - buildPolygonPoints: returns correct number of coordinate pairs for 5 axes
 * - buildPolygonPoints: center polygon (all 0) produces only center points
 * - filterAxes + component: 1-axis or 2-axis input is treated as no-data (empty array)
 */

// ── Mock native modules pulled in transitively by RadarChart ─────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    theme: { dark: false, colors: {} },
    setColorScheme: jest.fn(),
  }),
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Polygon: 'Polygon',
  Line: 'Line',
  Text: 'Text',
  G: 'G',
}));

import {
  filterAxes,
  getVertexPosition,
  buildPolygonPoints,
} from '../components/compare/RadarChart';
import type { CompareScores } from '../types/compare';

// ─── Factory helpers ───────────────────────────────────────────────────────────

function makeScores(overrides: Partial<CompareScores> = {}): CompareScores {
  return {
    estimatedOneRepMax: 120,
    weeklyVolume: 4500,
    weeklyDistance: 25,
    avgPace: 5.4,
    avgDailyCalories: 2200,
    avgRecoveryScore: 75,
    bodyWeightTrend: 82,
    activePeptideCount: -1,
    // Normalized radar fields — valid defaults
    strengthScore: 80,
    cardioScore: 70,
    nutritionConsistency: 65,
    overallConsistency: 72,
    xpPercentile: 55,
    computedAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

// ─── filterAxes ───────────────────────────────────────────────────────────────

describe('filterAxes', () => {
  it('returns 5 axes when all scores are valid (none are -1)', () => {
    const user = makeScores();
    const opponent = makeScores();

    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(5);
  });

  it('returns 4 axes when one radar score is -1 on the user side', () => {
    const user = makeScores({ cardioScore: -1 });
    const opponent = makeScores();

    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(4);
    expect(result.find((a) => a.key === 'cardioScore')).toBeUndefined();
  });

  it('returns 4 axes when one radar score is -1 on the opponent side', () => {
    const user = makeScores();
    const opponent = makeScores({ xpPercentile: -1 });

    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(4);
    expect(result.find((a) => a.key === 'xpPercentile')).toBeUndefined();
  });

  it('returns 3 axes when two radar scores are -1 (one on each side)', () => {
    const user = makeScores({ strengthScore: -1 });
    const opponent = makeScores({ nutritionConsistency: -1 });

    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(3);
  });

  it('returns empty array when fewer than 3 axes remain (degenerate polygon guard)', () => {
    // Only 1 axis has data on both sides — should be treated as no data
    const user = makeScores({
      strengthScore: -1,
      cardioScore: -1,
      nutritionConsistency: -1,
      overallConsistency: -1,
      // xpPercentile: 55 (valid)
    });
    const opponent = makeScores({
      strengthScore: -1,
      cardioScore: -1,
      nutritionConsistency: -1,
      overallConsistency: -1,
    });

    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when exactly 2 axes remain (still degenerate)', () => {
    const user = makeScores({
      strengthScore: -1,
      cardioScore: -1,
      nutritionConsistency: -1,
    });
    const opponent = makeScores({
      strengthScore: -1,
      cardioScore: -1,
      nutritionConsistency: -1,
    });

    // overallConsistency + xpPercentile = 2 axes → below minimum of 3
    const result = filterAxes(user, opponent);

    expect(result).toHaveLength(0);
  });
});

// ─── getVertexPosition ────────────────────────────────────────────────────────

describe('getVertexPosition', () => {
  it('places the first axis vertex at the top (center, center - maxRadius) for score 100', () => {
    const center = 150;
    const maxRadius = 100;

    const { x, y } = getVertexPosition(100, 0, 5, maxRadius, center, center);

    // angle = 0 * (2π/5) - π/2 = -π/2 → cos(-π/2)=0, sin(-π/2)=-1
    expect(x).toBeCloseTo(center, 5);
    expect(y).toBeCloseTo(center - maxRadius, 5);
  });

  it('places vertex at half the maxRadius when score is 50', () => {
    const center = 150;
    const maxRadius = 100;

    const full = getVertexPosition(100, 0, 5, maxRadius, center, center);
    const half = getVertexPosition(50, 0, 5, maxRadius, center, center);

    // The radius should be half, measured from center
    const fullDist = Math.hypot(full.x - center, full.y - center);
    const halfDist = Math.hypot(half.x - center, half.y - center);
    expect(halfDist).toBeCloseTo(fullDist / 2, 5);
  });

  it('places vertex exactly at center when score is 0', () => {
    const center = 150;
    const maxRadius = 100;

    const { x, y } = getVertexPosition(0, 0, 5, maxRadius, center, center);

    expect(x).toBeCloseTo(center, 10);
    expect(y).toBeCloseTo(center, 10);
  });

  it('clamps score > 100 to 100 — vertex lands at maxRadius, not beyond', () => {
    const center = 150;
    const maxRadius = 100;

    const clamped = getVertexPosition(150, 0, 5, maxRadius, center, center);
    const atMax   = getVertexPosition(100, 0, 5, maxRadius, center, center);

    expect(clamped.x).toBeCloseTo(atMax.x, 5);
    expect(clamped.y).toBeCloseTo(atMax.y, 5);
  });

  it('clamps negative non-sentinel score to 0 — vertex lands at center', () => {
    const center = 150;
    const maxRadius = 100;

    // -50 is not the -1 sentinel but is still out of range
    const { x, y } = getVertexPosition(-50, 0, 5, maxRadius, center, center);

    expect(x).toBeCloseTo(center, 10);
    expect(y).toBeCloseTo(center, 10);
  });

  it('returns the center point when totalAxes <= 0 (divide-by-zero guard)', () => {
    const center = 150;
    const maxRadius = 100;

    const zeroAxes    = getVertexPosition(100, 0, 0,  maxRadius, center, center);
    const negAxes     = getVertexPosition(100, 0, -1, maxRadius, center, center);

    expect(zeroAxes.x).toBe(center);
    expect(zeroAxes.y).toBe(center);
    expect(negAxes.x).toBe(center);
    expect(negAxes.y).toBe(center);
  });
});

// ─── buildPolygonPoints ───────────────────────────────────────────────────────

describe('buildPolygonPoints', () => {
  const center = 150;
  const maxRadius = 100;

  it('all-100 vertices land at exactly maxRadius distance from center', () => {
    const scores = makeScores({
      strengthScore: 100,
      cardioScore: 100,
      nutritionConsistency: 100,
      overallConsistency: 100,
      xpPercentile: 100,
    });
    const axes = filterAxes(scores, scores);

    const points = buildPolygonPoints(scores, axes, maxRadius, center, center);
    const pairs = points.trim().split(' ');

    for (const pair of pairs) {
      const [x, y] = pair.split(',').map(Number);
      const dist = Math.hypot(x - center, y - center);
      expect(dist).toBeCloseTo(maxRadius, 5);
    }
  });

  it('produces a known-good polygon string for a 3-axis all-100 case', () => {
    // With 3 axes and all scores = 100 the angles are:
    //   axis 0: -π/2        → (center, center - maxRadius)       = (150, 50)
    //   axis 1: -π/2 + 2π/3 → (center + 100·cos(π/6), center + 100·sin(π/6))
    //                        = (150 + 86.6025…, 150 + 50)       ≈ (236.60, 200)
    //   axis 2: -π/2 + 4π/3 → (center + 100·cos(-7π/6), center + 100·sin(-7π/6))
    //                        ≈ (150 - 86.60, 150 + 50)          ≈ (63.40, 200)
    const scores = makeScores({
      strengthScore: 100,
      cardioScore: 100,
      nutritionConsistency: 100,
      // mask the other two so only 3 axes survive
      overallConsistency: -1,
      xpPercentile: -1,
    });
    // opponent must also have them masked
    const opponent = makeScores({ overallConsistency: -1, xpPercentile: -1 });
    const axes = filterAxes(scores, opponent);

    expect(axes).toHaveLength(3);

    const points = buildPolygonPoints(scores, axes, maxRadius, center, center);
    const pairs = points.trim().split(' ');

    expect(pairs).toHaveLength(3);

    const [x0, y0] = pairs[0].split(',').map(Number);
    const [x1, y1] = pairs[1].split(',').map(Number);
    const [x2, y2] = pairs[2].split(',').map(Number);

    // axis 0: straight up
    expect(x0).toBeCloseTo(150, 4);
    expect(y0).toBeCloseTo(50,  4);

    // axis 1: bottom-right
    expect(x1).toBeCloseTo(150 + 100 * Math.cos(-Math.PI / 2 + (2 * Math.PI) / 3), 4);
    expect(y1).toBeCloseTo(150 + 100 * Math.sin(-Math.PI / 2 + (2 * Math.PI) / 3), 4);

    // axis 2: bottom-left
    expect(x2).toBeCloseTo(150 + 100 * Math.cos(-Math.PI / 2 + (4 * Math.PI) / 3), 4);
    expect(y2).toBeCloseTo(150 + 100 * Math.sin(-Math.PI / 2 + (4 * Math.PI) / 3), 4);
  });

  it('does not throw when all radar scores are 0', () => {
    const scores = makeScores({
      strengthScore: 0,
      cardioScore: 0,
      nutritionConsistency: 0,
      overallConsistency: 0,
      xpPercentile: 0,
    });
    const axes = filterAxes(scores, scores);

    expect(() => buildPolygonPoints(scores, axes, maxRadius, center, center)).not.toThrow();
  });

  it('does not throw when all radar scores are 100', () => {
    const scores = makeScores({
      strengthScore: 100,
      cardioScore: 100,
      nutritionConsistency: 100,
      overallConsistency: 100,
      xpPercentile: 100,
    });
    const axes = filterAxes(scores, scores);

    expect(() => buildPolygonPoints(scores, axes, maxRadius, center, center)).not.toThrow();
  });

  it('returns the correct number of coordinate pairs for 5 axes', () => {
    const scores = makeScores();
    const axes = filterAxes(scores, scores);

    const points = buildPolygonPoints(scores, axes, maxRadius, center, center);
    // Each pair is "x,y" — split by space gives one entry per axis
    const pairs = points.trim().split(' ');

    expect(pairs).toHaveLength(5);
    // Each pair should be in "number,number" format
    for (const pair of pairs) {
      expect(pair).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
    }
  });

  it('returns only center-point pairs when all radar scores are 0', () => {
    const scores = makeScores({
      strengthScore: 0,
      cardioScore: 0,
      nutritionConsistency: 0,
      overallConsistency: 0,
      xpPercentile: 0,
    });
    const axes = filterAxes(scores, scores);

    const points = buildPolygonPoints(scores, axes, maxRadius, center, center);
    const pairs = points.trim().split(' ');

    // Every vertex should collapse to the center
    for (const pair of pairs) {
      const [x, y] = pair.split(',').map(Number);
      expect(x).toBeCloseTo(center, 5);
      expect(y).toBeCloseTo(center, 5);
    }
  });
});
