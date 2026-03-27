/**
 * Data hook for the Body Hub muscles layer.
 * Fetches recent workout sessions and computes per-muscle stats + region colors.
 * Supports 'recency' and 'volume' heat map modes.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getRecentSessions } from '../services/workoutSessionService';
import {
  computeAllMuscleStats,
  buildRegionColors,
  buildHeatMapColors,
  detectImbalances,
  getMuscleForRegion,
  type MuscleStats,
} from '../utils/muscleMapping';
import type { MuscleColorResult, BodyView, HeatMapMode, ImbalanceResult, VolumeSummary } from '../types/bodyHub';

type UseBodyHubMusclesResult = {
  regionColors: Record<string, MuscleColorResult>;
  muscleStats: Map<string, MuscleStats>;
  imbalances: ImbalanceResult[];
  volumeSummary: VolumeSummary;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getStatsForRegion: (regionId: string) => MuscleStats | null;
};

export function useBodyHubMuscles(
  view: BodyView,
  enabled = true,
  mode: HeatMapMode = 'recency',
): UseBodyHubMusclesResult {
  const [muscleStats, setMuscleStats] = useState<Map<string, MuscleStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getRecentSessions(50);
      if (result.error) {
        setError(result.error.message ?? String(result.error));
        return;
      }

      const sessions = result.data ?? [];
      const stats = computeAllMuscleStats(sessions);
      setMuscleStats(stats);
    } catch (err) {
      setError('Failed to load workout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [enabled, fetchData]);

  const regionColors = useMemo(
    () =>
      mode === 'volume'
        ? buildHeatMapColors(view, muscleStats)
        : buildRegionColors(view, muscleStats),
    [view, muscleStats, mode],
  );

  const imbalances = useMemo(() => detectImbalances(muscleStats), [muscleStats]);

  const volumeSummary = useMemo((): VolumeSummary => {
    let totalSets = 0;
    let totalVolume = 0;

    for (const stats of muscleStats.values()) {
      totalSets += stats.weeklySets;
      totalVolume += stats.weeklyVolume;
    }

    return {
      totalSets,
      totalVolume,
      imbalanceCount: imbalances.length,
    };
  }, [muscleStats, imbalances]);

  const getStatsForRegion = useCallback(
    (regionId: string): MuscleStats | null => {
      const muscle = getMuscleForRegion(regionId);
      if (!muscle) return null;
      return muscleStats.get(muscle) ?? null;
    },
    [muscleStats],
  );

  return {
    regionColors,
    muscleStats,
    imbalances,
    volumeSummary,
    loading,
    error,
    refresh: fetchData,
    getStatsForRegion,
  };
}
