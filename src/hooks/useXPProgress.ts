import { useState, useEffect, useCallback, useMemo } from 'react';
import { getXPLogForDateRange } from '../services/gamificationService';
import { toLocalDateKey } from '../utils/nutrition';
import type { XPLogEntry } from '../types/gamification';

export type XPTimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

function rangeStartDate(range: XPTimeRange): string {
  const d = new Date();
  switch (range) {
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case 'ALL': return '2000-01-01';
  }
  return toLocalDateKey(d);
}

export function useXPProgress(initialRange: XPTimeRange = '3M') {
  const [entries, setEntries] = useState<XPLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<XPTimeRange>(initialRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const startKey = rangeStartDate(timeRange);
    const result = await getXPLogForDateRange(startKey);
    if (result.error) {
      setError(true);
    } else {
      setEntries(result.data ?? []);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  // Aggregate by date and compute cumulative running total
  const cumulativeData = useMemo(() => {
    if (entries.length === 0) return [];

    // Group by dateKey, sum amounts
    const byDate = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.dateKey;
      byDate.set(key, (byDate.get(key) ?? 0) + entry.amount);
    }

    // Sort by date and compute running total
    const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return sorted.map(([date, amount]) => {
      cumulative += amount;
      return { x: new Date(date), y: cumulative, label: `${cumulative} XP\n${date.slice(5)}` };
    });
  }, [entries]);

  const totalEarned = entries.reduce((sum, e) => sum + e.amount, 0);

  return { cumulativeData, totalEarned, loading, error, timeRange, setTimeRange, reload: load };
}
