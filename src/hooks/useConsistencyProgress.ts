import { useState, useEffect, useCallback, useMemo } from 'react';
import { getConsistencyDocs } from '../services/consistencyService';
import { toLocalDateKey } from '../utils/nutrition';
import type { DayConsistency } from '../types/consistency';

export type ConsistencyTimeRange = '1M' | '3M' | '6M';

function rangeStartDate(range: ConsistencyTimeRange): string {
  const d = new Date();
  switch (range) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
  }
  return toLocalDateKey(d);
}

/**
 * Get the ISO week start (Monday) for a date string YYYY-MM-DD.
 */
function weekStart(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const day = d.getDay(); // 0 = Sun
  const daysFromMon = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysFromMon);
  return toLocalDateKey(d);
}

export type WeekBucket = {
  weekStartKey: string;   // YYYY-MM-DD of Monday
  days: DayConsistency[];
  percent: number;        // (full + partial) / non-rest * 100
};

export function useConsistencyProgress(initialRange: ConsistencyTimeRange = '3M') {
  const [docs, setDocs] = useState<DayConsistency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<ConsistencyTimeRange>(initialRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const startKey = rangeStartDate(timeRange);
    const endKey = toLocalDateKey();
    const result = await getConsistencyDocs(startKey, endKey);
    if (result.error) {
      setError(true);
    } else {
      setDocs(result.data ?? []);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  // Group into weekly buckets and compute consistency %
  const weeklyData = useMemo(() => {
    if (docs.length === 0) return [];

    const buckets = new Map<string, DayConsistency[]>();
    for (const doc of docs) {
      const ws = weekStart(doc.date);
      const existing = buckets.get(ws) ?? [];
      existing.push(doc);
      buckets.set(ws, existing);
    }

    const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([ws, days]): WeekBucket => {
      const nonRest = days.filter((d) => d.status !== 'rest');
      const onPlan = nonRest.filter((d) => d.status === 'full' || d.status === 'partial');
      const percent = nonRest.length > 0 ? Math.round((onPlan.length / nonRest.length) * 100) : 100;
      return { weekStartKey: ws, days, percent };
    });
  }, [docs]);

  // Chart data points
  const chartData = useMemo(() => {
    return weeklyData.map((bucket) => ({
      x: new Date(bucket.weekStartKey),
      y: bucket.percent,
      label: `${bucket.percent}%\nWk ${bucket.weekStartKey.slice(5)}`,
    }));
  }, [weeklyData]);

  const currentWeekPct = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].percent : null;
  const bestWeekPct = weeklyData.length > 0 ? Math.max(...weeklyData.map((b) => b.percent)) : null;
  const avgPct =
    weeklyData.length > 0
      ? Math.round(weeklyData.reduce((sum, b) => sum + b.percent, 0) / weeklyData.length)
      : null;

  return {
    chartData,
    weeklyData,
    currentWeekPct,
    bestWeekPct,
    avgPct,
    loading,
    error,
    timeRange,
    setTimeRange,
    reload: load,
  };
}
