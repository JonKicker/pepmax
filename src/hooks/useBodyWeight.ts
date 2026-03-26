/**
 * useBodyWeight — manages weight entries, time range filtering, and stats.
 *
 * Fetches all entries once on mount, filters client-side for time range tabs.
 */
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  logWeight as logWeightService,
  getTodaysWeight,
  getWeightHistory,
  deleteWeightEntry,
  computeWeightStats,
} from '../services/bodyWeightService';
import type { BodyWeightEntry, BodyWeightInput, TimeRange, WeightStats } from '../types/bodyTracking';

function getStartDate(range: TimeRange): string | undefined {
  if (range === 'ALL') return undefined;
  const now = new Date();
  const offsets: Record<Exclude<TimeRange, 'ALL'>, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  };
  now.setDate(now.getDate() - offsets[range]);
  return now.toISOString().slice(0, 10);
}

export function useBodyWeight(todayKey: string) {
  const [allEntries, setAllEntries] = useState<BodyWeightEntry[]>([]);
  const [todaysEntry, setTodaysEntry] = useState<BodyWeightEntry | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cancelled: { current: boolean }) => {
    setLoading(true);
    setError(null);

    const [historyResult, todayResult] = await Promise.all([
      getWeightHistory(),
      getTodaysWeight(todayKey),
    ]);

    if (cancelled.current) return;

    if (historyResult.error) {
      setError('Failed to load weight history.');
    } else {
      setAllEntries(historyResult.data ?? []);
    }

    if (!todayResult.error && todayResult.data) {
      setTodaysEntry(todayResult.data);
    }

    setLoading(false);
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      const cancelled = { current: false };
      load(cancelled);
      return () => { cancelled.current = true; };
    }, [load]),
  );

  // Filter entries by selected time range
  const entries = useMemo(() => {
    const start = getStartDate(timeRange);
    if (!start) return allEntries;
    return allEntries.filter((e) => e.date >= start);
  }, [allEntries, timeRange]);

  const stats: WeightStats | null = useMemo(() => computeWeightStats(entries), [entries]);

  const logWeight = useCallback(async (input: BodyWeightInput) => {
    const result = await logWeightService(input);
    if (!result.error) {
      await load({ current: false });
    }
    return result;
  }, [load]);

  const deleteEntry = useCallback(async (date: string) => {
    const result = await deleteWeightEntry(date);
    if (!result.error) {
      await load({ current: false });
    }
    return result;
  }, [load]);

  return {
    entries,
    allEntries,
    todaysEntry,
    stats,
    timeRange,
    setTimeRange,
    loading,
    error,
    logWeight,
    deleteEntry,
    refresh: () => load({ current: false }),
  };
}
