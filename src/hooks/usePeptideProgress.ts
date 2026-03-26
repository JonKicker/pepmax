import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDoses } from '../services/peptideService';
import { toLocalDateKey } from '../utils/nutrition';
import type { Dose } from '../types/peptide';

export type PeptideTimeRange = '1W' | '1M' | '3M' | '6M' | 'ALL';

function rangeStartDate(range: PeptideTimeRange): Date {
  const d = new Date();
  switch (range) {
    case '1W': d.setDate(d.getDate() - 7); break;
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case 'ALL': return new Date(2000, 0, 1);
  }
  return d;
}

export type DoseFrequencyPoint = {
  date: string;
  count: number;
};

export function usePeptideProgress(initialRange: PeptideTimeRange = '1M') {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<PeptideTimeRange>(initialRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const startDate = rangeStartDate(timeRange);
    const result = await getDoses({ startDate });
    if (result.error) {
      setError(true);
    } else {
      setDoses(result.data ?? []);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  const dosesPerDay = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const dose of doses) {
      // Skip doses with no valid timestamp to avoid corrupting chart data
      if (!dose.timestamp?.toDate) continue;
      const dateKey = toLocalDateKey(dose.timestamp.toDate());
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1);
    }
    return Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [doses]);

  const { totalDoses, avgPerDay } = useMemo(() => {
    const total = doses.filter((d) => d.timestamp?.toDate).length;
    const avg = dosesPerDay.length > 0 ? Math.round((total / dosesPerDay.length) * 10) / 10 : 0;
    return { totalDoses: total, avgPerDay: avg };
  }, [doses, dosesPerDay]);

  return { dosesPerDay, totalDoses, avgPerDay, loading, error, timeRange, setTimeRange, reload: load };
}
