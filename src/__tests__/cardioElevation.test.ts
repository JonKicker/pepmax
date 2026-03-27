import { buildElevationProfile } from '../utils/cardioElevation';
import type { RoutePoint } from '../types/cardio';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePoint(
  lat: number,
  lon: number,
  altitude: number | null,
  timestamp = 0,
): RoutePoint {
  return {
    latitude: lat,
    longitude: lon,
    altitude,
    timestamp,
    speed: null,
    accuracy: null,
  };
}

// Simple route along a line for deterministic distance
function makeStraightRoute(count: number, altitudes: (number | null)[]): RoutePoint[] {
  return Array.from({ length: count }, (_, i) => {
    // Each point is ~111m apart (1/1000 degree lat)
    return makePoint(40.0 + i * 0.001, -74.0, altitudes[i] ?? null, i * 1000);
  });
}

// ─── buildElevationProfile ───────────────────────────────────────────────────

describe('buildElevationProfile', () => {
  it('returns empty array for empty route', () => {
    expect(buildElevationProfile([], 'km')).toEqual([]);
  });

  it('returns empty array when all altitudes are null (RAY #F5)', () => {
    const route = [makePoint(40, -74, null), makePoint(40.001, -74, null)];
    expect(buildElevationProfile(route, 'km')).toEqual([]);
  });

  it('filters out null altitude points (RAY #F5)', () => {
    const route = [
      makePoint(40, -74, 100),
      makePoint(40.001, -74, null), // null — filtered out
      makePoint(40.002, -74, 120),
    ];
    const result = buildElevationProfile(route, 'km');
    expect(result).toHaveLength(2);
    expect(result[0].y).toBe(100);
    expect(result[1].y).toBe(120);
  });

  it('returns single point for single-altitude route', () => {
    const route = [makePoint(40, -74, 50)];
    const result = buildElevationProfile(route, 'km');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 0, y: 50 });
  });

  it('x values are cumulative distances (non-decreasing)', () => {
    const altitudes = [100, 110, 120, 115, 130];
    const route = makeStraightRoute(5, altitudes);
    const result = buildElevationProfile(route, 'km');

    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x);
    }
  });

  it('first point has x = 0', () => {
    const route = makeStraightRoute(3, [100, 110, 120]);
    const result = buildElevationProfile(route, 'km');
    expect(result[0].x).toBe(0);
  });

  it('y values match input altitudes for small routes', () => {
    const altitudes = [50, 60, 55, 70];
    const route = makeStraightRoute(4, altitudes);
    const result = buildElevationProfile(route, 'km');
    result.forEach((p, i) => {
      expect(p.y).toBe(altitudes[i]);
    });
  });

  it('RAY #8: downsamples to 200 points when input > 200', () => {
    const altitudes = Array.from({ length: 500 }, (_, i) => 100 + i % 50);
    const route = makeStraightRoute(500, altitudes);
    const result = buildElevationProfile(route, 'km');
    expect(result).toHaveLength(200);
  });

  it('preserves first and last points after downsampling', () => {
    const altitudes = Array.from({ length: 300 }, (_, i) => 100 + i);
    const route = makeStraightRoute(300, altitudes);
    const result = buildElevationProfile(route, 'km');
    expect(result[0].y).toBe(100); // first altitude
    expect(result[result.length - 1].y).toBe(399); // last altitude
  });

  it('does not downsample when input is exactly 200 points', () => {
    const altitudes = Array.from({ length: 200 }, (_, i) => 100 + i);
    const route = makeStraightRoute(200, altitudes);
    const result = buildElevationProfile(route, 'km');
    expect(result).toHaveLength(200);
  });

  it('does not downsample when input is < 200 points', () => {
    const altitudes = Array.from({ length: 50 }, (_, i) => 100 + i);
    const route = makeStraightRoute(50, altitudes);
    const result = buildElevationProfile(route, 'km');
    expect(result).toHaveLength(50);
  });

  it('accepts both km and mi unit strings without error', () => {
    const route = makeStraightRoute(3, [100, 110, 120]);
    expect(() => buildElevationProfile(route, 'mi')).not.toThrow();
    expect(() => buildElevationProfile(route, 'km')).not.toThrow();
  });
});
