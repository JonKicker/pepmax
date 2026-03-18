import type { ActivityType, DistanceUnit, RoutePoint } from '../types/cardio';

// ─── Distance ─────────────────────────────────────────────────────────────────

/** Haversine distance between two coordinates in meters */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format seconds into "M:SS" or "H:MM:SS" */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Format pace (seconds per km) into "M:SS /mi" or "M:SS /km" */
export function formatPace(secPerKm: number, unit: DistanceUnit): string {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return '--:-- /' + unit;
  const adjusted = unit === 'mi' ? secPerKm * 1.60934 : secPerKm;
  const m = Math.floor(adjusted / 60);
  const s = Math.floor(adjusted % 60);
  return `${m}:${String(s).padStart(2, '0')} /${unit}`;
}

/** Format distance (meters) into display string with unit */
export function formatDistance(meters: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    return `${metersToMiles(meters).toFixed(2)} mi`;
  }
  return `${metersToKm(meters).toFixed(2)} km`;
}

// ─── Calories ─────────────────────────────────────────────────────────────────

const MET: Record<ActivityType, number> = {
  run: 9.8,
  cycle: 7.5,
  walk: 3.5,
  swim: 6.0,
};

/** MET-based calorie calculation */
export function calculateCalories(
  activity: ActivityType,
  weightKg: number,
  durationHours: number
): number {
  return Math.round(MET[activity] * weightKg * durationHours);
}

// ─── Speed / Drift ────────────────────────────────────────────────────────────

/** Maximum plausible speed in m/s for GPS drift filtering */
export function maxSpeedForActivity(activity: ActivityType): number {
  switch (activity) {
    case 'run': return 12; // ~43 km/h
    case 'cycle': return 22; // ~79 km/h
    case 'walk': return 4;  // ~14 km/h
    case 'swim': return 3;  // ~11 km/h
  }
}

/** Calculate rolling pace from recent RoutePoints (last 30s window), returns sec/km */
export function rollingPace(points: RoutePoint[], windowMs = 30000): number {
  if (points.length < 2) return 0;
  const now = points[points.length - 1].timestamp;
  const windowPoints = points.filter((p) => now - p.timestamp <= windowMs);
  if (windowPoints.length < 2) return 0;

  let dist = 0;
  for (let i = 1; i < windowPoints.length; i++) {
    dist += haversineDistance(
      windowPoints[i - 1].latitude,
      windowPoints[i - 1].longitude,
      windowPoints[i].latitude,
      windowPoints[i].longitude
    );
  }
  const timeSec = (windowPoints[windowPoints.length - 1].timestamp - windowPoints[0].timestamp) / 1000;
  if (dist < 1 || timeSec < 1) return 0;
  return (timeSec / dist) * 1000; // seconds per km
}

// ─── Speech helpers ───────────────────────────────────────────────────────────

/** Speak-friendly pace "eight minutes thirty-two seconds per mile" */
export function speakPace(secPerKm: number, unit: DistanceUnit): string {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return 'pace unavailable';
  const adjusted = unit === 'mi' ? secPerKm * 1.60934 : secPerKm;
  const m = Math.floor(adjusted / 60);
  const s = Math.floor(adjusted % 60);
  const minPart = m === 1 ? '1 minute' : `${m} minutes`;
  const secPart = s === 0 ? '' : s === 1 ? ' 1 second' : ` ${s} seconds`;
  return `${minPart}${secPart} per ${unit === 'mi' ? 'mile' : 'kilometer'}`;
}

export function speakDistance(meters: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    const miles = metersToMiles(meters);
    return `${miles.toFixed(2)} miles`;
  }
  const km = metersToKm(meters);
  return `${km.toFixed(2)} kilometers`;
}

export function speakDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(h === 1 ? '1 hour' : `${h} hours`);
  if (m > 0) parts.push(m === 1 ? '1 minute' : `${m} minutes`);
  if (s > 0 && h === 0) parts.push(s === 1 ? '1 second' : `${s} seconds`);
  return parts.join(' ') || '0 seconds';
}
