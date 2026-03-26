import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDailyTotalsForRange } from '../services/nutritionService';
import { toLocalDateKey } from '../utils/nutrition';
import type { DailyMacroPoint } from '../services/nutritionService';

export type NutritionTimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

function rangeStartDate(range: NutritionTimeRange): string {
  const d = new Date();
  switch (range) {
    case '1W': d.setDate(d.getDate() - 7); break;
    case '1M': d.setMonth(d.getMonth() - 1); break;
    case '3M': d.setMonth(d.getMonth() - 3); break;
    case '6M': d.setMonth(d.getMonth() - 6); break;
    case '1Y': d.setFullYear(d.getFullYear() - 1); break;
    case 'ALL': return '2000-01-01';
  }
  return toLocalDateKey(d);
}

export function useNutritionProgress(initialRange: NutritionTimeRange = '1M') {
  const [data, setData] = useState<DailyMacroPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<NutritionTimeRange>(initialRange);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const start = rangeStartDate(timeRange);
    const end = toLocalDateKey(new Date());
    const result = await getDailyTotalsForRange(start, end);
    if (result.error) {
      setError(true);
    } else {
      setData(result.data ?? []);
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  const averages = useMemo(() => {
    if (data.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const sum = data.reduce((acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return {
      calories: Math.round(sum.calories / data.length),
      protein: Math.round(sum.protein / data.length),
      carbs: Math.round(sum.carbs / data.length),
      fat: Math.round(sum.fat / data.length),
    };
  }, [data]);

  return { data, averages, loading, error, timeRange, setTimeRange, reload: load };
}
