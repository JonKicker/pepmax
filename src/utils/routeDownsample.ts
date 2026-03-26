/**
 * Route downsampling — Ramer-Douglas-Peucker (RDP) algorithm.
 *
 * RDP reduces the number of points in a polyline while preserving its shape.
 * Used before storing routes in Firestore to stay well under the 1 MB doc limit.
 *
 * Pure functions, no external dependencies.
 */

import type { SegmentPoint } from '../types/segments';

// ─── Perpendicular distance ────────────────────────────────────────────────────

/**
 * Returns the perpendicular distance (in degrees) from `point` to the line
 * segment defined by `lineStart` → `lineEnd`.
 *
 * Uses the standard point-to-line distance formula in Cartesian space.
 * For GPS coordinates this is an approximation (equirectangular), which is
 * accurate enough for the short distances involved in RDP epsilon tuning.
 */
export function perpendicularDistance(
  point: SegmentPoint,
  lineStart: SegmentPoint,
  lineEnd: SegmentPoint
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;

  // If start === end, return point-to-point distance
  if (dx === 0 && dy === 0) {
    const dLng = point.longitude - lineStart.longitude;
    const dLat = point.latitude - lineStart.latitude;
    return Math.sqrt(dLng * dLng + dLat * dLat);
  }

  // |cross product| / |line vector|
  const numerator = Math.abs(
    dy * point.longitude - dx * point.latitude + lineEnd.longitude * lineStart.latitude - lineEnd.latitude * lineStart.longitude
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);
  return numerator / denominator;
}

// ─── RDP core ─────────────────────────────────────────────────────────────────

/**
 * Iterative RDP implementation using an explicit stack.
 * Avoids call-stack overflow on large (5 000+) zigzag routes.
 * Returns a boolean mask — true = keep this point.
 */
function rdpMask(
  points: SegmentPoint[],
  epsilon: number,
  keep: boolean[]
): void {
  // Stack holds [startIndex, endIndex] pairs to process
  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end <= start + 1) continue;

    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }
}

/**
 * Apply RDP with a given epsilon and return the filtered points.
 */
function rdp(points: SegmentPoint[], epsilon: number): SegmentPoint[] {
  if (points.length <= 2) return [...points];

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  rdpMask(points, epsilon, keep);

  return points.filter((_, i) => keep[i]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Downsample a GPS route to at most `maxPoints` points using the
 * Ramer-Douglas-Peucker algorithm.
 *
 * - If `points.length <= maxPoints`, returns the array as-is (no copy).
 * - Auto-tunes epsilon: starts at 0.00001 degrees and doubles until the
 *   result has ≤ maxPoints points. Guaranteed termination because at
 *   epsilon → ∞ only the first and last points are kept (2 points).
 *
 * @param points   Input GPS coordinates.
 * @param maxPoints Maximum number of points in the output (default 500).
 * @returns Downsampled route.
 */
export function downsampleRoute(
  points: SegmentPoint[],
  maxPoints: number = 500
): SegmentPoint[] {
  // Edge cases
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];
  if (points.length <= maxPoints) return points;

  let epsilon = 0.00001; // ~1 m at equator

  // Double epsilon until we're within budget. Finite loop — at epsilon large
  // enough, RDP collapses all intermediate points, leaving exactly 2 points.
  let result = rdp(points, epsilon);
  while (result.length > maxPoints) {
    epsilon *= 2;
    result = rdp(points, epsilon);
  }

  return result;
}
