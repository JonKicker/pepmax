import { useState, useEffect, useCallback } from 'react';
import { getRecoveryScoreHistory } from '../services/recoveryScoreService';

export type RecoveryTimeRange = '1W' | '1M' | '3M' | '6M' | 'ALL';

function rangeToDays(range: RecoveryTimeRange): number {
  switch (range) {
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case 'ALL': return 3650;
  }
}

export function useRecoveryProgress(initialRange: RecoveryTimeRange = '1M') {
  const [data, setData] = useState<Array<{ date: string; score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<RecoveryTimeRange>(initialRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const days = rangeToDays(timeRange);
    const result = await getRecoveryScoreHistory(days);
    if (result.error) {
      setError(true);
    } else {
      setData(result.data ?? []);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, timeRange, setTimeRange, reload: load };
}
