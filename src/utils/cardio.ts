import type {
  ActivityType,
  DistanceUnit,
  RoutePoint,
  CardioPR,
  HeartRatePoint,
  HeartRateZone,
  TimeInZone,
} from '../types/cardio';

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

// ─── Goal check ──────────────────────────────────────────────────────────────

/** Check if a session's goal was achieved */
export function isGoalMet(session: { goals: { type: string; value: number } | null; distance: number; duration: number; averagePace: number }): boolean {
  if (!session.goals || session.goals.type === 'none') return false;
  if (session.goals.type === 'distance') return session.distance >= session.goals.value;
  if (session.goals.type === 'time') return session.duration >= session.goals.value;
  if (session.goals.type === 'pace') return session.averagePace > 0 && session.averagePace <= session.goals.value;
  return false;
}

// ─── Route map helpers ───────────────────────────────────────────────────────

/** Get pace-based color: green (fast), yellow (avg), red (slow) */
export function getPaceColor(pace: number, avgPace: number): string {
  if (!pace || !avgPace || !isFinite(pace) || !isFinite(avgPace)) return '#F39C12'; // yellow default
  const ratio = pace / avgPace;
  if (ratio <= 0.9) return '#27AE60'; // fast — green
  if (ratio >= 1.1) return '#E74C3C'; // slow — red
  return '#F39C12'; // average — yellow
}

/** Compute MapView region to fit entire route with padding */
export function getRouteBounds(route: RoutePoint[]): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  if (route.length === 0) {
    return { latitude: 0, longitude: 0, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  }

  let minLat = route[0].latitude;
  let maxLat = route[0].latitude;
  let minLng = route[0].longitude;
  let maxLng = route[0].longitude;

  for (const p of route) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  const pad = 0.2; // 20% padding
  const latDelta = Math.max((maxLat - minLat) * (1 + pad), 0.005);
  const lngDelta = Math.max((maxLng - minLng) * (1 + pad), 0.005);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/** Build pace-colored polyline segments from route points */
export function buildPaceSegments(
  route: RoutePoint[],
  avgPace: number
): { coordinates: { latitude: number; longitude: number }[]; color: string }[] {
  if (route.length < 2) return [];

  const SEGMENT_SIZE = 5; // points per segment
  const segments: { coordinates: { latitude: number; longitude: number }[]; color: string }[] = [];

  for (let i = 0; i < route.length - 1; i += SEGMENT_SIZE) {
    const end = Math.min(i + SEGMENT_SIZE + 1, route.length);
    const chunk = route.slice(i, end);

    // Calculate segment pace
    let dist = 0;
    for (let j = 1; j < chunk.length; j++) {
      dist += haversineDistance(chunk[j - 1].latitude, chunk[j - 1].longitude, chunk[j].latitude, chunk[j].longitude);
    }
    const timeSec = (chunk[chunk.length - 1].timestamp - chunk[0].timestamp) / 1000;
    const segPace = dist > 0 && timeSec > 0 ? (timeSec / dist) * 1000 : avgPace;

    segments.push({
      coordinates: chunk.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      color: getPaceColor(segPace, avgPace),
    });
  }

  return segments;
}

/** Find mile/km marker positions along a route */
export function getMileMarkers(
  route: RoutePoint[],
  unitMeters: number // 1609.344 for miles, 1000 for km
): { latitude: number; longitude: number; label: string }[] {
  if (route.length < 2) return [];

  const markers: { latitude: number; longitude: number; label: string }[] = [];
  let totalDist = 0;
  let nextMarker = unitMeters;
  let markerNum = 1;

  for (let i = 1; i < route.length; i++) {
    const d = haversineDistance(route[i - 1].latitude, route[i - 1].longitude, route[i].latitude, route[i].longitude);
    totalDist += d;
    if (totalDist >= nextMarker) {
      markers.push({
        latitude: route[i].latitude,
        longitude: route[i].longitude,
        label: String(markerNum),
      });
      markerNum++;
      nextMarker += unitMeters;
    }
  }

  return markers;
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

// ─── PR display helpers ──────────────────────────────────────────────────────

export const PR_LABELS: Record<string, string> = {
  fastestPace: 'Fastest Pace',
  fastestSplit: 'Fastest Split',
  longestDistance: 'Longest Distance',
  longestDuration: 'Longest Duration',
  mostCalories: 'Most Calories',
  mostElevation: 'Most Elevation',
};

export function formatPRValue(pr: CardioPR, unit: DistanceUnit): string {
  switch (pr.metric) {
    case 'fastestPace':
    case 'fastestSplit':
      return formatPace(pr.value, unit);
    case 'longestDistance':
      return formatDistance(pr.value, unit);
    case 'longestDuration':
      return formatDuration(pr.value);
    case 'mostCalories':
      return `${Math.round(pr.value)} kcal`;
    case 'mostElevation':
      return `${Math.round(pr.value)} m`;
    default:
      return String(pr.value);
  }
}

// ─── Heart rate utils ────────────────────────────────────────────────────────

export function estimateMaxHR(age: number): number {
  return Math.round(220 - age);
}

export function getHRZones(maxHR: number): HeartRateZone[] {
  return [
    { zone: 1, name: 'Recovery',  minPct: 0.50, maxPct: 0.60, color: '#3498DB' },
    { zone: 2, name: 'Aerobic',   minPct: 0.60, maxPct: 0.70, color: '#2ECC71' },
    { zone: 3, name: 'Tempo',     minPct: 0.70, maxPct: 0.80, color: '#F39C12' },
    { zone: 4, name: 'Threshold', minPct: 0.80, maxPct: 0.90, color: '#E67E22' },
    { zone: 5, name: 'Max',       minPct: 0.90, maxPct: 1.00, color: '#E74C3C' },
  ];
}

export function getZoneForBpm(bpm: number, zones: HeartRateZone[], maxHR: number): HeartRateZone | null {
  if (bpm <= 0 || maxHR <= 0) return null;
  const pct = bpm / maxHR;
  return zones.find((z) => pct >= z.minPct && pct < z.maxPct) ?? zones[zones.length - 1];
}

export function computeTimeInZones(hrData: HeartRatePoint[], zones: HeartRateZone[], maxHR: number): TimeInZone[] {
  // Each stored point represents SAMPLE_INTERVAL_S seconds (downsampled at 5s intervals)
  const SAMPLE_INTERVAL_S = 5;
  const zoneSeconds: Record<number, number> = {};
  zones.forEach((z) => { zoneSeconds[z.zone] = 0; });

  for (const point of hrData) {
    const zone = getZoneForBpm(point.bpm, zones, maxHR);
    if (zone) {
      zoneSeconds[zone.zone] += SAMPLE_INTERVAL_S;
    }
  }

  return zones.map((z) => ({
    zone: z.zone,
    name: z.name,
    seconds: zoneSeconds[z.zone] ?? 0,
    color: z.color,
  }));
}

export function getTrainingEffect(timeInZones: TimeInZone[]): string {
  const total = timeInZones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) return 'No Data';
  const pcts = timeInZones.map((z) => z.seconds / total);
  if ((pcts[3] ?? 0) + (pcts[4] ?? 0) >= 0.30) return 'High Intensity';
  if ((pcts[2] ?? 0) >= 0.40) return 'Threshold Training';
  if ((pcts[1] ?? 0) >= 0.40) return 'Aerobic Fitness';
  return 'Recovery';
}
