import { RDA_VALUES } from '../constants/nutrition';
import { toLocalDateKey } from './nutrition';
import type { FoodLogEntry } from '../types/nutrition';

export type MicroAggregate = {
  nutrientKey: string;
  avgDaily: number;
  rdaPercent: number;
  dailyValues: number[];
  dailyRdaPercents: number[];
};

export type AggregationResult = {
  nutrients: MicroAggregate[];
  totalFoodsLogged: number;
  foodsWithMicroData: number;
  daysInRange: number;
};

function buildDateRange(days: number): string[] {
  const today = toLocalDateKey();
  const [y, m, d] = today.split('-').map(Number);
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(y, m - 1, d - i);
    result.push(toLocalDateKey(date));
  }
  return result;
}

export function aggregateMicronutrients(
  entries: FoodLogEntry[],
  days: 7 | 30,
): AggregationResult {
  const dateRange = buildDateRange(days);
  const entriesByDate = new Map<string, FoodLogEntry[]>();
  for (const date of dateRange) {
    entriesByDate.set(date, []);
  }
  for (const entry of entries) {
    if (entriesByDate.has(entry.date)) {
      entriesByDate.get(entry.date)!.push(entry);
    }
  }

  const totalFoodsLogged = entries.length;
  const foodsWithMicroData = entries.filter((e) => e.micronutrients != null).length;

  const nutrientKeys = Object.keys(RDA_VALUES);
  const nutrients: MicroAggregate[] = nutrientKeys.map((key) => {
    const dailyValues: number[] = dateRange.map((date) => {
      const dayEntries = entriesByDate.get(date) ?? [];
      return dayEntries.reduce((sum, entry) => {
        if (!entry.micronutrients) return sum;
        // keyed by RDA_VALUES key — guaranteed subset of Micronutrients fields
        const val = (entry.micronutrients as Record<string, number | null>)[key];
        return sum + (val ?? 0);
      }, 0);
    });

    const totalSum = dailyValues.reduce((a, b) => a + b, 0);
    const avgDaily = totalSum / days;
    const rda = RDA_VALUES[key];
    const rdaPercent = rda > 0 ? (avgDaily / rda) * 100 : 0;
    const dailyRdaPercents = dailyValues.map((v) => (rda > 0 ? (v / rda) * 100 : 0));

    return { nutrientKey: key, avgDaily, rdaPercent, dailyValues, dailyRdaPercents };
  });

  nutrients.sort((a, b) => a.rdaPercent - b.rdaPercent);

  return { nutrients, totalFoodsLogged, foodsWithMicroData, daysInRange: days };
}

export function getDashboardTrafficLight(rdaPercent: number): 'green' | 'yellow' | 'red' {
  if (rdaPercent >= 90) return 'green';
  if (rdaPercent >= 50) return 'yellow';
  return 'red';
}

export function getNeedsAttentionNutrients(entries: FoodLogEntry[]): Set<string> {
  const today = toLocalDateKey();
  const [y, m, d] = today.split('-').map(Number);

  // Evaluates the most recent 28 days (4 complete weeks).
  // Days 29–30 of the 30-day chart window are intentionally excluded —
  // an unequal final week would skew the per-week RDA average.
  const weeks: string[][] = Array.from({ length: 4 }, (_, wi) => {
    const result: string[] = [];
    for (let di = 0; di < 7; di++) {
      const daysBack = (3 - wi) * 7 + (6 - di);
      const date = new Date(y, m - 1, d - daysBack);
      result.push(toLocalDateKey(date));
    }
    return result;
  });

  const entriesByDate = new Map<string, FoodLogEntry[]>();
  for (const entry of entries) {
    if (!entriesByDate.has(entry.date)) entriesByDate.set(entry.date, []);
    entriesByDate.get(entry.date)!.push(entry);
  }

  const needsAttention = new Set<string>();
  const nutrientKeys = Object.keys(RDA_VALUES);

  for (const key of nutrientKeys) {
    const rda = RDA_VALUES[key];
    if (rda <= 0) continue;
    let redWeeks = 0;
    for (const week of weeks) {
      const weekTotal = week.reduce((sum, date) => {
        const dayEntries = entriesByDate.get(date) ?? [];
        return sum + dayEntries.reduce((s, e) => {
          if (!e.micronutrients) return s;
          const val = (e.micronutrients as Record<string, number | null>)[key];
          return s + (val ?? 0);
        }, 0);
      }, 0);
      const weekAvg = weekTotal / 7;
      const weekRdaPct = (weekAvg / rda) * 100;
      if (weekRdaPct < 50) redWeeks++;
    }
    if (redWeeks >= 3) needsAttention.add(key);
  }

  return needsAttention;
}
