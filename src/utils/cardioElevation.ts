/**
 * cardioElevation — pure functions for elevation profile data processing.
 * RAY #8: Downsampling to 200 points happens HERE in the util, not in the component.
 * RAY #F5: Null altitude values are handled gracefully.
 */
import { haversineDistance } from './cardio';
import type { RoutePoint } from '../types/cardio';

export type ElevationPoint = {
  x: number; // cumulative distance in meters
  y: number; // altitude in meters
};

/**
 * buildElevationProfile
 * Converts a route to an elevation profile ready for Victory Native charts.
 * - Filters out points with null altitude (RAY #F5)
 * - Downsamples to MAX_POINTS if input exceeds that (RAY #8)
 * - x = cumulative distance, y = altitude
 * - unit param accepts 'mi' or 'km' — x values are in meters regardless,
 *   callers should convert for display labels
 */
export function buildElevationProfile(
  route: RoutePoint[],
  _unit: string,
): ElevationPoint[] {
  const MAX_POINTS = 200;

  // Filter to only points with valid altitude (RAY #F5)
  const validPoints = route.filter(
    (p): p is RoutePoint & { altitude: number } => p.altitude !== null,
  );

  if (validPoints.length === 0) return [];
  if (validPoints.length === 1) {
    return [{ x: 0, y: validPoints[0].altitude }];
  }

  // Build cumulative distances first
  const withDistance: { altitude: number; cumulativeDistance: number }[] = [];
  let cumulative = 0;
  withDistance.push({ altitude: validPoints[0].altitude, cumulativeDistance: 0 });

  for (let i = 1; i < validPoints.length; i++) {
    const dist = haversineDistance(
      validPoints[i - 1].latitude,
      validPoints[i - 1].longitude,
      validPoints[i].latitude,
      validPoints[i].longitude,
    );
    cumulative += dist;
    withDistance.push({ altitude: validPoints[i].altitude, cumulativeDistance: cumulative });
  }

  // Downsample to MAX_POINTS if needed (RAY #8)
  const downsampled = downsamplePoints(withDistance, MAX_POINTS);

  return downsampled.map((p) => ({
    x: p.cumulativeDistance,
    y: p.altitude,
  }));
}

/**
 * downsamplePoints using evenly-spaced index selection.
 * Preserves first and last points.
 */
function downsamplePoints<T>(
  points: T[],
  maxPoints: number,
): T[] {
  if (points.length <= maxPoints) return points;

  const result: T[] = [];
  const step = (points.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    result.push(points[Math.min(idx, points.length - 1)]);
  }

  return result;
}
