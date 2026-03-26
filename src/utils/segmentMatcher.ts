/**
 * Segment matching algorithm.
 *
 * Detects when a completed (or in-progress) cardio session route overlaps
 * a known RouteSegment, extracts the elapsed time for that portion, and
 * supports live "approaching / active" detection.
 *
 * Pure functions, no external dependencies, no Firestore access.
 */

import type { SegmentPoint, RouteSegment, SegmentMatch } from '../types/segments';
import type { RoutePoint } from '../types/cardio';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Radius used to match session start/end to segment start/end (meters) */
const ENDPOINT_MATCH_RADIUS_M = 50;

/** Radius used to check intermediate points against the segment track (meters) */
const TRACK_MATCH_RADIUS_M = 30;

/** Minimum fraction of segment points that must lie within TRACK_MATCH_RADIUS_M */
const COVERAGE_THRESHOLD = 0.9;

// ─── Haversine distance ───────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

/**
 * Returns the great-circle distance in meters between two GPS coordinates.
 * Uses the Haversine formula.
 */
export function haversineDistance(p1: SegmentPoint, p2: SegmentPoint): number {
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// ─── Nearest-point helpers ────────────────────────────────────────────────────

/**
 * Finds the index in `track` that is closest to `target` and within
 * `radiusMeters`. Returns -1 if no point qualifies.
 */
function findNearestIndex(
  track: RoutePoint[],
  target: SegmentPoint,
  radiusMeters: number
): number {
  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < track.length; i++) {
    const dist = haversineDistance(track[i], target);
    if (dist < radiusMeters && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Returns the minimum distance from `point` to any point in `track` (meters).
 */
function minDistanceToTrack(point: SegmentPoint, track: RoutePoint[]): number {
  let minDist = Infinity;
  for (const tp of track) {
    const d = haversineDistance(point, tp);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// ─── Session matching ─────────────────────────────────────────────────────────

/**
 * Match a completed session route against a list of known segments.
 *
 * Matching criteria for each segment:
 *   1. A session point exists within ENDPOINT_MATCH_RADIUS_M of the segment's
 *      startPoint (determines startIndex).
 *   2. A session point exists within ENDPOINT_MATCH_RADIUS_M of the segment's
 *      endPoint, AFTER the startIndex (determines endIndex).
 *   3. At least COVERAGE_THRESHOLD (90%) of the segment's route points lie
 *      within TRACK_MATCH_RADIUS_M of the session sub-track.
 *
 * Duration is computed from the RoutePoint timestamps of the matched sub-track.
 *
 * @param sessionRoute  Full GPS route from a CardioSession (RoutePoint[]).
 * @param segments      Candidate segments to test against.
 * @returns             Array of SegmentMatch — one entry per matched segment.
 */
export function matchSessionToSegments(
  sessionRoute: RoutePoint[],
  segments: RouteSegment[]
): SegmentMatch[] {
  if (sessionRoute.length < 2) return [];

  const matches: SegmentMatch[] = [];

  for (const segment of segments) {
    // 1. Find where the session enters the segment start
    const startIdx = findNearestIndex(sessionRoute, segment.startPoint, ENDPOINT_MATCH_RADIUS_M);
    if (startIdx === -1) continue;

    // 2. Find where the session exits the segment end (must be after startIdx)
    const subTrack = sessionRoute.slice(startIdx);
    const relativeEndIdx = findNearestIndex(subTrack, segment.endPoint, ENDPOINT_MATCH_RADIUS_M);
    if (relativeEndIdx === -1) continue;

    const endIdx = startIdx + relativeEndIdx;
    if (endIdx <= startIdx) continue;

    // 3. Check 90%+ of segment route points are within 30m of the matched sub-track
    const subSession = sessionRoute.slice(startIdx, endIdx + 1);
    const segmentPoints = segment.route;
    if (segmentPoints.length === 0) continue;

    let coveredCount = 0;
    for (const sp of segmentPoints) {
      const d = minDistanceToTrack(sp, subSession);
      if (d <= TRACK_MATCH_RADIUS_M) coveredCount++;
    }

    const coverage = coveredCount / segmentPoints.length;
    if (coverage < COVERAGE_THRESHOLD) continue;

    // 4. Extract elapsed time from timestamps
    const startTs = sessionRoute[startIdx].timestamp;
    const endTs = sessionRoute[endIdx].timestamp;
    const durationSeconds = Math.round((endTs - startTs) / 1000);
    if (durationSeconds <= 0) continue;

    matches.push({
      segment,
      durationSeconds,
      startIndex: startIdx,
      endIndex: endIdx,
      isPR: false, // Determined by the caller (segmentService) after DB lookup
    });
  }

  return matches;
}

// ─── Live detection ───────────────────────────────────────────────────────────

/**
 * Check whether the current GPS point is within `radiusMeters` of any
 * segment's start point. Used for live "approaching" detection during an
 * active session.
 *
 * @param currentPoint   The user's current GPS coordinate.
 * @param segments       Pre-fetched nearby segments.
 * @param radiusMeters   Approach radius (default 100 m).
 * @returns              The closest matching segment, or null.
 */
export function isEnteringSegment(
  currentPoint: SegmentPoint,
  segments: RouteSegment[],
  radiusMeters: number = 100
): RouteSegment | null {
  let closest: RouteSegment | null = null;
  let closestDist = Infinity;

  for (const segment of segments) {
    const dist = haversineDistance(currentPoint, segment.startPoint);
    if (dist <= radiusMeters && dist < closestDist) {
      closestDist = dist;
      closest = segment;
    }
  }

  return closest;
}

/**
 * Check whether the current GPS point is within `radiusMeters` of the
 * segment's end point. Used for live "exiting" detection to trigger the
 * segment completion overlay.
 *
 * @param currentPoint   The user's current GPS coordinate.
 * @param segment        The segment currently being ridden/run.
 * @param radiusMeters   Exit radius (default 50 m).
 * @returns              true if the user is at/near the end of the segment.
 */
export function isExitingSegment(
  currentPoint: SegmentPoint,
  segment: RouteSegment,
  radiusMeters: number = 50
): boolean {
  const dist = haversineDistance(currentPoint, segment.endPoint);
  return dist <= radiusMeters;
}
