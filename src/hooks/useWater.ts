/**
 * useWater — hook for today's hydration state.
 *
 * Exposes:
 *  - totalOz, goalOz, entries, progress (0–1), goalReached
 *  - logWater(oz), undoLast(), setGoal(oz)
 *  - loading, error
 *
 * Refreshes on screen focus (useFocusEffect).
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getTodayWaterLog,
  logWater as logWaterService,
  undoLastWater,
  setWaterGoal,
} from '../services/waterService';
import type { WaterEntry } from '../types/water';
import { DEFAULT_WATER_GOAL_OZ, MAX_DAILY_OZ, MAX_SINGLE_LOG_OZ } from '../types/water';

type WaterState = {
  totalOz: number;
  goalOz: number;
  entries: WaterEntry[];
  progress: number;
  goalReached: boolean;
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: WaterState = {
  totalOz: 0,
  goalOz: DEFAULT_WATER_GOAL_OZ,
  entries: [],
  progress: 0,
  goalReached: false,
  loading: true,
  error: null,
};

export function useWater() {
  const [state, setState] = useState<WaterState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const result = await getTodayWaterLog();

    if (result.error || !result.data) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.error?.message ?? 'Failed to load water log',
      }));
      return;
    }

    const { totalOz, goalOz, entries } = result.data;
    const progress = goalOz > 0 ? Math.min(totalOz / goalOz, 1) : 0;

    setState({
      totalOz,
      goalOz,
      entries,
      progress,
      goalReached: totalOz >= goalOz,
      loading: false,
      error: null,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const logWater = useCallback(
    async (oz: number) => {
      if (oz <= 0 || oz > MAX_SINGLE_LOG_OZ) return;
      if (state.totalOz >= MAX_DAILY_OZ) return;

      const result = await logWaterService(oz, state.totalOz, state.goalOz);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [state.totalOz, state.goalOz, load]
  );

  const undoLast = useCallback(async () => {
    if (state.entries.length === 0) return;

    const result = await undoLastWater(state.entries, state.totalOz);
    if (!result.error) {
      await load();
    }
    return result;
  }, [state.entries, state.totalOz, load]);

  const setGoal = useCallback(
    async (goalOz: number) => {
      const result = await setWaterGoal(goalOz);
      if (!result.error) {
        await load();
      }
      return result;
    },
    [load]
  );

  return {
    totalOz: state.totalOz,
    goalOz: state.goalOz,
    entries: state.entries,
    progress: state.progress,
    goalReached: state.goalReached,
    loading: state.loading,
    error: state.error,
    logWater,
    undoLast,
    setGoal,
    refresh: load,
  };
}
