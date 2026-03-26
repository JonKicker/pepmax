/**
 * Tests for src/utils/segmentMatcher.ts
 *
 * Covers:
 *   - haversineDistance: known distances, edge cases
 *   - matchSessionToSegments: exact match, partial match, no match,
 *     below 90% coverage threshold, start/end outside 50m
 *   - isEnteringSegment: within radius, outside radius, multiple segments
 *   - isExitingSegment: at end, not at end
 */

import {
  haversineDistance,
  matchSessionToSegments,
  isEnteringSegment,
  isExitingSegment,
} from '../utils/segmentMatcher';
import type { RouteSegment, SegmentPoint } from '../types/segments';
import type { RoutePoint } from '../types/cardio';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoutePoint(lat: number, lng: number, timestampMs: number): RoutePoint {
  return { latitude: lat, longitude: lng, altitude: null, timestamp: timestampMs, speed: null, accuracy: null };
}

function makeSegmentPoint(lat: number, lng: number): SegmentPoint {
  return { latitude: lat, longitude: lng };
}

function makeSegment(overrides: Partial<RouteSegment> = {}): RouteSegment {
  return {
    id: 'seg1',
    name: 'Test Segment',
    creatorUid: 'uid1',
    creatorUsername: 'alice',
    activityType: 'run',
    route: [
      makeSegmentPoint(51.5000, -0.1000),
      makeSegmentPoint(51.5005, -0.1000),
      makeSegmentPoint(51.5010, -0.1000),
    ],
    startPoint: makeSegmentPoint(51.5000, -0.1000),
    endPoint: makeSegmentPoint(51.5010, -0.1000),
    distanceMeters: 111,
    visibility: 'public',
    bestEffortUid: null,
    bestEffortSeconds: null,
    bestEffortUsername: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── haversineDistance ────────────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    const p = makeSegmentPoint(51.5, -0.1);
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('returns ~111km for 1 degree of latitude difference at equator', () => {
    const p1 = makeSegmentPoint(0, 0);
    const p2 = makeSegmentPoint(1, 0);
    // 1° lat ≈ 111,195 m
    const dist = haversineDistance(p1, p2);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it('returns ~111km for 1 degree of longitude difference at equator', () => {
    const p1 = makeSegmentPoint(0, 0);
    const p2 = makeSegmentPoint(0, 1);
    const dist = haversineDistance(p1, p2);
    expect(dist).toBeGreaterThan(110_000);
    expect(dist).toBeLessThan(112_000);
  });

  it('accounts for latitude scaling on longitude distances', () => {
    // At 60° latitude, 1° longitude ≈ 55.6 km (cos(60°) = 0.5)
    const p1 = makeSegmentPoint(60, 0);
    const p2 = makeSegmentPoint(60, 1);
    const dist = haversineDistance(p1, p2);
    expect(dist).toBeGreaterThan(54_000);
    expect(dist).toBeLessThan(57_000);
  });

  it('returns a symmetric result', () => {
    const p1 = makeSegmentPoint(51.5, -0.1);
    const p2 = makeSegmentPoint(51.6, -0.2);
    expect(haversineDistance(p1, p2)).toBeCloseTo(haversineDistance(p2, p1), 5);
  });

  it('handles antipodal points (~20015 km)', () => {
    const p1 = makeSegmentPoint(0, 0);
    const p2 = makeSegmentPoint(0, 180);
    const dist = haversineDistance(p1, p2);
    // Half circumference ≈ 20,015 km
    expect(dist).toBeGreaterThan(20_000_000);
    expect(dist).toBeLessThan(20_100_000);
  });

  it('returns a small distance for nearby GPS points (~5m)', () => {
    // 0.00005° lat ≈ 5.6 m
    const p1 = makeSegmentPoint(51.5000, -0.1);
    const p2 = makeSegmentPoint(51.50005, -0.1);
    const dist = haversineDistance(p1, p2);
    expect(dist).toBeLessThan(10);
    expect(dist).toBeGreaterThan(0);
  });
});

// ─── matchSessionToSegments ───────────────────────────────────────────────────

describe('matchSessionToSegments', () => {
  it('returns empty array for empty session route', () => {
    const segment = makeSegment();
    expect(matchSessionToSegments([], [segment])).toEqual([]);
  });

  it('returns empty array for single-point session', () => {
    const segment = makeSegment();
    const session = [makeRoutePoint(51.5, -0.1, 0)];
    expect(matchSessionToSegments(session, [segment])).toEqual([]);
  });

  it('returns empty array when no segments provided', () => {
    const session = [
      makeRoutePoint(51.5000, -0.1, 0),
      makeRoutePoint(51.5010, -0.1, 60000),
    ];
    expect(matchSessionToSegments(session, [])).toEqual([]);
  });

  it('matches a session that exactly covers a segment', () => {
    // Session goes through all 3 segment points (start → mid → end)
    const session: RoutePoint[] = [
      makeRoutePoint(51.5000, -0.1000, 0),       // at segment start
      makeRoutePoint(51.5005, -0.1000, 30000),   // at segment mid
      makeRoutePoint(51.5010, -0.1000, 60000),   // at segment end
    ];
    const segment = makeSegment();
    const matches = matchSessionToSegments(session, [segment]);

    expect(matches).toHaveLength(1);
    expect(matches[0].segment.id).toBe('seg1');
    expect(matches[0].durationSeconds).toBe(60);
    expect(matches[0].startIndex).toBe(0);
    expect(matches[0].endIndex).toBe(2);
    expect(matches[0].isPR).toBe(false); // always false from matcher; set by service
  });

  it('matches a segment that is a sub-section of a longer session', () => {
    // Session continues past the segment end
    const session: RoutePoint[] = [
      makeRoutePoint(51.4990, -0.1000, 0),       // before segment start
      makeRoutePoint(51.4995, -0.1000, 15000),
      makeRoutePoint(51.5000, -0.1000, 30000),   // at segment start
      makeRoutePoint(51.5005, -0.1000, 60000),   // at segment mid
      makeRoutePoint(51.5010, -0.1000, 90000),   // at segment end
      makeRoutePoint(51.5015, -0.1000, 120000),  // after segment end
    ];
    const segment = makeSegment();
    const matches = matchSessionToSegments(session, [segment]);

    expect(matches).toHaveLength(1);
    expect(matches[0].durationSeconds).toBe(60); // 90s - 30s
    expect(matches[0].startIndex).toBe(2);
    expect(matches[0].endIndex).toBe(4);
  });

  it('does not match when start point is more than 50m away', () => {
    // Session starts ~200m north of segment start
    const session: RoutePoint[] = [
      makeRoutePoint(51.5020, -0.1000, 0),       // ~220m from segment start
      makeRoutePoint(51.5025, -0.1000, 30000),
      makeRoutePoint(51.5030, -0.1000, 60000),
    ];
    const segment = makeSegment();
    const matches = matchSessionToSegments(session, [segment]);
    expect(matches).toHaveLength(0);
  });

  it('does not match when end point is more than 50m away', () => {
    // Session starts at segment start but ends far from segment end
    const session: RoutePoint[] = [
      makeRoutePoint(51.5000, -0.1000, 0),       // at segment start
      makeRoutePoint(51.5002, -0.1000, 30000),
      makeRoutePoint(51.5004, -0.1000, 60000),   // never reaches segment end (51.5010)
    ];
    const segment = makeSegment();
    const matches = matchSessionToSegments(session, [segment]);
    expect(matches).toHaveLength(0);
  });

  it('does not match when coverage is below 90% threshold', () => {
    // Segment has 10 points spread over 0.01° lat (~1.1km).
    // Session only covers half of them — coverage ≈ 50%.
    const segmentRoute: SegmentPoint[] = Array.from({ length: 10 }, (_, i) =>
      makeSegmentPoint(51.5000 + i * 0.001, -0.1)
    );
    const segment = makeSegment({
      route: segmentRoute,
      startPoint: segmentRoute[0],
      endPoint: segmentRoute[9],
    });

    // Session covers start and end (within 50m) but misses most middle points
    // by being offset 200m eastward (large lng offset)
    const session: RoutePoint[] = [
      makeRoutePoint(51.5000, -0.1000, 0),    // at segment start
      // skip over middle — go directly east then come back
      makeRoutePoint(51.5000, -0.0970, 20000), // 200m east — far from segment track
      makeRoutePoint(51.5005, -0.0970, 40000), // still east
      makeRoutePoint(51.5009, -0.0970, 50000), // still east
      makeRoutePoint(51.5009, -0.1000, 60000), // at segment end
    ];
    const matches = matchSessionToSegments(session, [segment]);
    expect(matches).toHaveLength(0);
  });

  it('matches multiple segments in a single session', () => {
    const segment1 = makeSegment({ id: 'seg1', startPoint: makeSegmentPoint(51.5000, -0.1), endPoint: makeSegmentPoint(51.5010, -0.1) });
    const segment2 = makeSegment({
      id: 'seg2',
      route: [
        makeSegmentPoint(51.5020, -0.1),
        makeSegmentPoint(51.5025, -0.1),
        makeSegmentPoint(51.5030, -0.1),
      ],
      startPoint: makeSegmentPoint(51.5020, -0.1),
      endPoint: makeSegmentPoint(51.5030, -0.1),
    });

    const session: RoutePoint[] = [
      makeRoutePoint(51.5000, -0.1, 0),
      makeRoutePoint(51.5005, -0.1, 30000),
      makeRoutePoint(51.5010, -0.1, 60000),   // end of seg1
      makeRoutePoint(51.5015, -0.1, 90000),
      makeRoutePoint(51.5020, -0.1, 120000),  // start of seg2
      makeRoutePoint(51.5025, -0.1, 150000),
      makeRoutePoint(51.5030, -0.1, 180000),  // end of seg2
    ];

    const matches = matchSessionToSegments(session, [segment1, segment2]);
    expect(matches).toHaveLength(2);
    const ids = matches.map((m) => m.segment.id);
    expect(ids).toContain('seg1');
    expect(ids).toContain('seg2');
  });
});

// ─── isEnteringSegment ────────────────────────────────────────────────────────

describe('isEnteringSegment', () => {
  const seg = makeSegment({ startPoint: makeSegmentPoint(51.5, -0.1) });

  it('returns null for empty segments array', () => {
    const current = makeSegmentPoint(51.5, -0.1);
    expect(isEnteringSegment(current, [])).toBeNull();
  });

  it('returns segment when current point is within default 100m radius', () => {
    // ~55m from start
    const current = makeSegmentPoint(51.5005, -0.1);
    const result = isEnteringSegment(current, [seg]);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('seg1');
  });

  it('returns null when current point is outside radius', () => {
    // ~1.1km north of segment start
    const current = makeSegmentPoint(51.51, -0.1);
    const result = isEnteringSegment(current, [seg]);
    expect(result).toBeNull();
  });

  it('returns null when current point is exactly at radius boundary (edge)', () => {
    // haversineDistance to startPoint should be > 100m
    // ~111m north (1 degree lat ≈ 111km, so 0.001° ≈ 111m)
    const current = makeSegmentPoint(51.5010, -0.1);
    const result = isEnteringSegment(current, [seg], 100);
    // 0.001° lat ≈ 111m, which is > 100m, so should return null
    expect(result).toBeNull();
  });

  it('respects custom radius parameter', () => {
    // ~55m from start; within 60m but not within 40m
    const current = makeSegmentPoint(51.5005, -0.1);
    expect(isEnteringSegment(current, [seg], 60)).not.toBeNull();
    expect(isEnteringSegment(current, [seg], 40)).toBeNull();
  });

  it('returns the closest segment when multiple are within radius', () => {
    const seg1 = makeSegment({ id: 'seg1', startPoint: makeSegmentPoint(51.5002, -0.1) });
    const seg2 = makeSegment({ id: 'seg2', startPoint: makeSegmentPoint(51.5004, -0.1) });

    // Current point is very close to seg1's start
    const current = makeSegmentPoint(51.5002, -0.1001);
    const result = isEnteringSegment(current, [seg1, seg2], 100);
    expect(result?.id).toBe('seg1');
  });
});

// ─── isExitingSegment ─────────────────────────────────────────────────────────

describe('isExitingSegment', () => {
  const seg = makeSegment({ endPoint: makeSegmentPoint(51.5010, -0.1) });

  it('returns true when current point is at segment end point (0m)', () => {
    const current = makeSegmentPoint(51.5010, -0.1);
    expect(isExitingSegment(current, seg)).toBe(true);
  });

  it('returns true when current point is within 50m of end', () => {
    // ~22m from end
    const current = makeSegmentPoint(51.501002, -0.1001);
    expect(isExitingSegment(current, seg)).toBe(true);
  });

  it('returns false when current point is outside 50m of end', () => {
    // ~111m north of end
    const current = makeSegmentPoint(51.502, -0.1);
    expect(isExitingSegment(current, seg)).toBe(false);
  });

  it('returns false when current point is at segment start, not end', () => {
    const current = makeSegmentPoint(51.5000, -0.1);
    expect(isExitingSegment(current, seg)).toBe(false);
  });

  it('respects custom radius parameter', () => {
    // ~22m north of end (51.5012 is ~22m north of 51.5010)
    const current = makeSegmentPoint(51.5012, -0.1);
    expect(isExitingSegment(current, seg, 30)).toBe(true);
    expect(isExitingSegment(current, seg, 10)).toBe(false);
  });
});
