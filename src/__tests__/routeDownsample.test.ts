/**
 * Tests for src/utils/routeDownsample.ts
 *
 * Covers:
 *   - Already under maxPoints → returns unchanged reference
 *   - Straight line collapses to 2 points
 *   - Complex route reduces to ≤ maxPoints
 *   - Empty array edge case
 *   - Single point edge case
 *   - Two points edge case
 *   - perpendicularDistance helper
 */

import { downsampleRoute, perpendicularDistance } from '../utils/routeDownsample';
import type { SegmentPoint } from '../types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePoint(lat: number, lng: number): SegmentPoint {
  return { latitude: lat, longitude: lng };
}

/** Generate N equally spaced points along a straight line lat axis */
function straightLine(n: number, startLat = 0, lngFixed = 0): SegmentPoint[] {
  return Array.from({ length: n }, (_, i) =>
    makePoint(startLat + i * 0.001, lngFixed)
  );
}

/** Generate a zigzag route of N points that has meaningful shape */
function zigzagRoute(n: number): SegmentPoint[] {
  return Array.from({ length: n }, (_, i) =>
    makePoint(i * 0.0001, (i % 2 === 0 ? 0 : 0.001))
  );
}

// ─── perpendicularDistance ────────────────────────────────────────────────────

describe('perpendicularDistance', () => {
  it('returns 0 for a point on the line', () => {
    const lineStart = makePoint(0, 0);
    const lineEnd = makePoint(0, 2);
    const onLine = makePoint(0, 1);
    expect(perpendicularDistance(onLine, lineStart, lineEnd)).toBeCloseTo(0, 10);
  });

  it('returns the correct perpendicular distance', () => {
    // Horizontal line from (0,0) to (0,2), point at (1,1) → distance = 1
    const lineStart = makePoint(0, 0);
    const lineEnd = makePoint(2, 0);
    const point = makePoint(0, 1); // 1 unit perpendicular
    const dist = perpendicularDistance(point, lineStart, lineEnd);
    expect(dist).toBeCloseTo(1, 5);
  });

  it('handles degenerate line (start === end) as point-to-point distance', () => {
    const p = makePoint(0, 0);
    const point = makePoint(3, 4);
    const dist = perpendicularDistance(point, p, p);
    expect(dist).toBeCloseTo(5, 5); // 3-4-5 right triangle
  });

  it('returns 0 for a point at the start of the line', () => {
    const lineStart = makePoint(0, 0);
    const lineEnd = makePoint(0, 10);
    expect(perpendicularDistance(lineStart, lineStart, lineEnd)).toBeCloseTo(0, 10);
  });
});

// ─── downsampleRoute ─────────────────────────────────────────────────────────

describe('downsampleRoute', () => {
  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('returns empty array for empty input', () => {
    expect(downsampleRoute([])).toEqual([]);
  });

  it('returns a single-element array for single-point input', () => {
    const input = [makePoint(51.5, -0.1)];
    const result = downsampleRoute(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ latitude: 51.5, longitude: -0.1 });
  });

  it('returns exactly 2 points for two-point input', () => {
    const input = [makePoint(0, 0), makePoint(1, 1)];
    const result = downsampleRoute(input);
    expect(result).toHaveLength(2);
  });

  // ── Already within budget ──────────────────────────────────────────────────

  it('returns the same array reference when length <= maxPoints', () => {
    const input = straightLine(10);
    const result = downsampleRoute(input, 500);
    // Should return the same object reference (no copy)
    expect(result).toBe(input);
  });

  it('returns unchanged when length equals maxPoints', () => {
    const input = straightLine(100);
    const result = downsampleRoute(input, 100);
    expect(result).toBe(input);
  });

  // ── Straight line ──────────────────────────────────────────────────────────

  it('collapses a straight line to 2 points', () => {
    // 1000 collinear points — all intermediate points have distance 0 from the line
    const input = straightLine(1000);
    const result = downsampleRoute(input, 500);
    // RDP should collapse all intermediate collinear points
    expect(result.length).toBeLessThanOrEqual(3); // practically 2
  });

  it('preserves first and last points of a straight line', () => {
    const input = straightLine(1000);
    const result = downsampleRoute(input, 500);
    expect(result[0]).toEqual(input[0]);
    expect(result[result.length - 1]).toEqual(input[input.length - 1]);
  });

  // ── maxPoints enforcement ──────────────────────────────────────────────────

  it('reduces a complex route to <= maxPoints', () => {
    const input = zigzagRoute(2000);
    const result = downsampleRoute(input, 500);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.length).toBeGreaterThan(0);
  });

  it('reduces a large route to <= custom maxPoints limit', () => {
    const input = zigzagRoute(5000);
    const result = downsampleRoute(input, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('always preserves first and last points', () => {
    const input = zigzagRoute(2000);
    const result = downsampleRoute(input, 200);
    expect(result[0]).toEqual(input[0]);
    expect(result[result.length - 1]).toEqual(input[input.length - 1]);
  });

  it('never returns more points than the original', () => {
    const input = zigzagRoute(300);
    const result = downsampleRoute(input, 500);
    // Input is already ≤ maxPoints, so it's returned as-is
    expect(result.length).toBeLessThanOrEqual(input.length);
  });

  // ── Auto-tuning epsilon ────────────────────────────────────────────────────

  it('terminates for a highly irregular route with tight maxPoints', () => {
    // Very irregular route with lots of directional changes
    const input: SegmentPoint[] = Array.from({ length: 3000 }, (_, i) => ({
      latitude: Math.sin(i * 0.1) * 0.1,
      longitude: Math.cos(i * 0.07) * 0.1,
    }));
    const result = downsampleRoute(input, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('handles a maxPoints of 2 (extreme compression)', () => {
    const input = zigzagRoute(1000);
    const result = downsampleRoute(input, 2);
    // At extreme epsilon, should return just 2 points (start + end)
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
