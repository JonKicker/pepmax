/**
 * Data hook for the Body Hub muscles layer.
 * Fetches recent workout sessions and computes per-muscle stats + region colors.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecentSessions } from '../services/workoutSessionService';
import {
  computeAllMuscleStats,
  buildRegionColors,
  getMuscleForRegion,
  type MuscleStats,
} from '../utils/muscleMapping';
import type { MuscleColorResult } from '../types/bodyHub';
import type { BodyView } from '../types/bodyHub';

type UseBodyHubMusclesResult = {
  regionColors: Record<string, MuscleColorResult>;
  muscleStats: Map<string, MuscleStats>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getStatsForRegion: (regionId: string) => MuscleStats | null;
};

export function useBodyHubMuscles(view: BodyView, enabled = true): UseBodyHubMusclesResult {
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

  const regionColors = buildRegionColors(view, muscleStats);

  const getStatsForRegion = useCallback(
    (regionId: string): MuscleStats | null => {
      const muscle = getMuscleForRegion(regionId);
      if (!muscle) return null;
      return muscleStats.get(muscle) ?? null;
    },
    [muscleStats]
  );

  return {
    regionColors,
    muscleStats,
    loading,
    error,
    refresh: fetchData,
    getStatsForRegion,
  };
}
