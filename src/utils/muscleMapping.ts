/**
 * Maps MuscleGroup values to SVG region IDs and computes
 * recency-based region colors from workout session data.
 */
import type { MuscleGroup } from '../types/exercise';
import type { WorkoutSession } from '../types/workout';
import { REGION_TO_MUSCLE, FRONT_MUSCLE_PATHS, BACK_MUSCLE_PATHS } from '../constants/bodyHubPaths';
import type { MuscleColorResult, MuscleRegionData } from '../types/bodyHub';

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
