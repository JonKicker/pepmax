/**
 * Maps MuscleGroup values to SVG region IDs and computes
 * recency-based region colors from workout session data.
 */
import type { MuscleGroup } from '../types/exercise';
import type { WorkoutSession } from '../types/workout';
import { REGION_TO_MUSCLE, FRONT_MUSCLE_PATHS, BACK_MUSCLE_PATHS } from '../constants/bodyHubPaths';
import type { MuscleColorResult, MuscleRegionData, ImbalanceResult } from '../types/bodyHub';

// ─── Constants ──────────────────────────────────────────────────────────────

const GREEN = '#22C55E';
const YELLOW = '#EAB308';
const GRAY = '#9CA3AF';

const MS_PER_DAY = 86_400_000;

// ─── MuscleGroup → Region IDs ───────────────────────────────────────────────

/** Returns all SVG region IDs that map to the given MuscleGroup. */
export function getRegionIdsForMuscle(muscle: MuscleGroup): string[] {
  return Object.entries(REGION_TO_MUSCLE)
    .filter(([, m]) => m === muscle)
    .map(([id]) => id);
}

/** Returns the MuscleGroup for a given SVG region ID. */
export function getMuscleForRegion(regionId: string): MuscleGroup | null {
  return (REGION_TO_MUSCLE[regionId] as MuscleGroup) ?? null;
}

// ─── Per-Muscle Stats ───────────────────────────────────────────────────────

export type MuscleStats = {
  muscle: MuscleGroup;
  lastTrained: Date | null;
  daysSinceTraining: number | null;
  weeklySets: number;
  weeklyVolume: number;
  topExercises: { name: string; bestWeight: number; weightUnit: string }[];
};

/** Compute stats for every muscle group from recent sessions. */
export function computeAllMuscleStats(sessions: WorkoutSession[]): Map<string, MuscleStats> {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * MS_PER_DAY;

  // Accumulate per-muscle data
  const muscleMap = new Map<string, {
    lastTrained: Date | null;
    weeklySets: number;
    weeklyVolume: number;
    exerciseMap: Map<string, { name: string; bestWeight: number; weightUnit: string }>;
  }>();

  const allMuscles: MuscleGroup[] = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core',
    'Traps', 'Adductors', 'Abductors',
  ];

  // Initialize all muscles
  for (const muscle of allMuscles) {
    muscleMap.set(muscle, {
      lastTrained: null,
      weeklySets: 0,
      weeklyVolume: 0,
      exerciseMap: new Map(),
    });
  }

  for (const session of sessions) {
    if (session.status !== 'completed' || !session.exercises) continue;

    const sessionTime = session.startedAt?.toDate?.() ?? session.startedAt;
    const sessionDate = sessionTime instanceof Date ? sessionTime : new Date(sessionTime as any);

    for (const exercise of session.exercises) {
      const muscle = exercise.primaryMuscle;
      if (!muscle || muscle === 'Full Body') continue;

      const entry = muscleMap.get(muscle);
      if (!entry) continue;

      // Track last trained (most recent session)
      if (!entry.lastTrained || sessionDate > entry.lastTrained) {
        entry.lastTrained = sessionDate;
      }

      // Weekly stats (last 7 days only)
      if (sessionDate.getTime() >= sevenDaysAgo) {
        const completedSets = exercise.sets?.filter((s) => s.completed) ?? [];
        entry.weeklySets += completedSets.length;

        for (const set of completedSets) {
          entry.weeklyVolume += (set.weight ?? 0) * (set.reps ?? 0);
        }
      }

      // Top exercises (best weight across all time)
      const completedSets = exercise.sets?.filter((s) => s.completed) ?? [];
      const bestSet = completedSets.reduce<{ weight: number; unit: string } | null>((best, s) => {
        if (!s.weight) return best;
        if (!best || s.weight > best.weight) return { weight: s.weight, unit: s.weightUnit ?? 'lbs' };
        return best;
      }, null);

      if (bestSet) {
        const existing = entry.exerciseMap.get(exercise.exerciseId);
        if (!existing || bestSet.weight > existing.bestWeight) {
          entry.exerciseMap.set(exercise.exerciseId, {
            name: exercise.exerciseName,
            bestWeight: bestSet.weight,
            weightUnit: bestSet.unit,
          });
        }
      }
    }
  }

  // Convert to MuscleStats
  const result = new Map<string, MuscleStats>();
  for (const [muscle, entry] of muscleMap) {
    const daysSince = entry.lastTrained
      ? Math.floor((now - entry.lastTrained.getTime()) / MS_PER_DAY)
      : null;

    const topExercises = Array.from(entry.exerciseMap.values())
      .sort((a, b) => b.bestWeight - a.bestWeight)
      .slice(0, 3);

    result.set(muscle, {
      muscle: muscle as MuscleGroup,
      lastTrained: entry.lastTrained,
      daysSinceTraining: daysSince,
      weeklySets: entry.weeklySets,
      weeklyVolume: entry.weeklyVolume,
      topExercises,
    });
  }

  return result;
}

// ─── Region Color Computation ───────────────────────────────────────────────

/**
 * Compute fill color + opacity for a region based on muscle training recency.
 * Green: trained ≤48h ago (opacity scales 0.3–0.7 with weekly volume)
 * Yellow: trained 3–5 days ago (opacity 0.3)
 * Gray: 6+ days or never
 */
export function getRegionColor(stats: MuscleStats | undefined): MuscleColorResult {
  if (!stats || stats.daysSinceTraining === null) {
    return { fill: GRAY, fillOpacity: 0.15 };
  }

  const days = stats.daysSinceTraining;

  if (days <= 2) {
    // Green — opacity scales with weekly volume (0.3 at 1 set, 0.7 at 20+ sets)
    const volumeRatio = Math.min(stats.weeklySets / 20, 1);
    const opacity = 0.3 + volumeRatio * 0.4;
    return { fill: GREEN, fillOpacity: opacity };
  }

  if (days <= 5) {
    return { fill: YELLOW, fillOpacity: 0.3 };
  }

  return { fill: GRAY, fillOpacity: 0.15 };
}

/**
 * Build region color map for all regions on a given view using recency-based coloring.
 */
export function buildRegionColors(
  view: 'front' | 'back',
  muscleStats: Map<string, MuscleStats>,
): Record<string, MuscleColorResult> {
  const paths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;
  const result: Record<string, MuscleColorResult> = {};

  for (const regionId of Object.keys(paths)) {
    const muscle = getMuscleForRegion(regionId);
    if (!muscle) continue;
    const stats = muscleStats.get(muscle);
    result[regionId] = getRegionColor(stats);
  }

  return result;
}

// ─── Heat Map Engine ─────────────────────────────────────────────────────────

/** 5-stop gradient: blue → cyan → green → yellow → red */
const HEAT_STOPS: { ratio: number; r: number; g: number; b: number }[] = [
  { ratio: 0,    r: 0x3B, g: 0x82, b: 0xF6 }, // #3B82F6 blue
  { ratio: 0.25, r: 0x06, g: 0xB6, b: 0xD4 }, // #06B6D4 cyan
  { ratio: 0.5,  r: 0x22, g: 0xC5, b: 0x5E }, // #22C55E green
  { ratio: 0.75, r: 0xEA, g: 0xB3, b: 0x08 }, // #EAB308 yellow
  { ratio: 1,    r: 0xEF, g: 0x44, b: 0x44 }, // #EF4444 red
];

/** Linearly interpolate a 0-255 channel value. */
function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Convert r,g,b (0-255) to a hex color string. */
function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute fill color for a muscle region based on its weekly volume
 * relative to the maximum across all muscles.
 * Guard: if maxVolume === 0, return blue at 0.25 opacity (cold-end).
 */
export function getHeatMapColor(weeklyVolume: number, maxVolume: number): MuscleColorResult {
  if (maxVolume === 0) {
    return { fill: '#3B82F6', fillOpacity: 0.25 };
  }

  const ratio = Math.min(Math.max(weeklyVolume / maxVolume, 0), 1);

  // Find the two surrounding stops
  let lower = HEAT_STOPS[0];
  let upper = HEAT_STOPS[HEAT_STOPS.length - 1];

  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (ratio >= HEAT_STOPS[i].ratio && ratio <= HEAT_STOPS[i + 1].ratio) {
      lower = HEAT_STOPS[i];
      upper = HEAT_STOPS[i + 1];
      break;
    }
  }

  const span = upper.ratio - lower.ratio;
  const t = span === 0 ? 0 : (ratio - lower.ratio) / span;

  const r = lerpChannel(lower.r, upper.r, t);
  const g = lerpChannel(lower.g, upper.g, t);
  const b = lerpChannel(lower.b, upper.b, t);

  const fillOpacity = 0.25 + ratio * 0.55; // 0.25 at cold, 0.80 at hot

  return { fill: toHex(r, g, b), fillOpacity };
}

/** Antagonist muscle pairs for imbalance detection. */
export const ANTAGONIST_PAIRS: [MuscleGroup, MuscleGroup][] = [
  ['Chest', 'Back'],
  ['Biceps', 'Triceps'],
  ['Quads', 'Hamstrings'],
  ['Glutes', 'Core'],
  ['Shoulders', 'Traps'],
];

/**
 * Detect muscle imbalances from weekly volume data.
 * Skips pairs where both muscles have weeklyVolume === 0.
 * Flags an imbalance when the weaker side's ratio < 0.6.
 */
export function detectImbalances(muscleStats: Map<string, MuscleStats>): ImbalanceResult[] {
  const results: ImbalanceResult[] = [];

  for (const [muscleA, muscleB] of ANTAGONIST_PAIRS) {
    const statsA = muscleStats.get(muscleA);
    const statsB = muscleStats.get(muscleB);

    const volA = statsA?.weeklyVolume ?? 0;
    const volB = statsB?.weeklyVolume ?? 0;

    // Skip pairs where both are zero (no data)
    if (volA === 0 && volB === 0) continue;

    const maxVol = Math.max(volA, volB);
    const minVol = Math.min(volA, volB);
    const ratio = minVol / maxVol;

    if (ratio < 0.6) {
      const weak: MuscleGroup = volA <= volB ? muscleA : muscleB;
      const strong: MuscleGroup = volA <= volB ? muscleB : muscleA;
      results.push({ weak, strong, ratio });
    }
  }

  return results;
}

/**
 * Build region color map using volume-based heat map coloring.
 * Same signature as buildRegionColors for drop-in replacement.
 */
export function buildHeatMapColors(
  view: 'front' | 'back',
  muscleStats: Map<string, MuscleStats>,
): Record<string, MuscleColorResult> {
  const paths = view === 'front' ? FRONT_MUSCLE_PATHS : BACK_MUSCLE_PATHS;
  const result: Record<string, MuscleColorResult> = {};

  // Find max weekly volume across all muscles present in this view
  let maxVolume = 0;
  for (const regionId of Object.keys(paths)) {
    const muscle = getMuscleForRegion(regionId);
    if (!muscle) continue;
    const stats = muscleStats.get(muscle);
    if (stats && stats.weeklyVolume > maxVolume) {
      maxVolume = stats.weeklyVolume;
    }
  }

  for (const regionId of Object.keys(paths)) {
    const muscle = getMuscleForRegion(regionId);
    if (!muscle) continue;
    const stats = muscleStats.get(muscle);
    const weeklyVolume = stats?.weeklyVolume ?? 0;
    result[regionId] = getHeatMapColor(weeklyVolume, maxVolume);
  }

  return result;
}
