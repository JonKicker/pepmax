import type { BodyMeasurement, CircumferenceMeasurements } from '../types/bodyMeasurement';
import type { TimeRange } from '../types/bodyTracking';

/** Filter entries to the given time range */
export function filterByTimeRange(
  entries: BodyMeasurement[],
  range: TimeRange,
): BodyMeasurement[] {
  if (range === 'ALL') return entries;
  const now = new Date();
  const cutoff = new Date();
  switch (range) {
    case '1W': cutoff.setDate(now.getDate() - 7); break;
    case '1M': cutoff.setMonth(now.getMonth() - 1); break;
    case '3M': cutoff.setMonth(now.getMonth() - 3); break;
    case '6M': cutoff.setMonth(now.getMonth() - 6); break;
    case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
  }
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return entries.filter((e) => e.date >= cutoffStr);
}

type NumericMeasurementKey = 'weight' | 'bodyFatPercent' | keyof CircumferenceMeasurements;

function getValue(entry: BodyMeasurement, field: NumericMeasurementKey): number | undefined {
  if (field === 'weight') return entry.weight;
  if (field === 'bodyFatPercent') return entry.bodyFatPercent;
  return entry.measurements[field as keyof CircumferenceMeasurements];
}

/** Group by ISO week (Mon–Sun) and return average value per week */
export function computeWeeklyAverages(
  entries: BodyMeasurement[],
  field: NumericMeasurementKey,
): { weekStart: string; avg: number }[] {
  const weeks: Record<string, number[]> = {};

  for (const entry of entries) {
    const val = getValue(entry, field);
    if (val == null) continue;
    const date = new Date(entry.date);
    // ISO week start = Monday
    const day = date.getDay(); // 0=Sun,1=Mon,...
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    const key = monday.toISOString().split('T')[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(val);
  }

  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, values]) => ({
      weekStart,
      avg: parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2)),
    }));
}

export type PersonalBests = {
  lowestWeight?: { value: number; date: string };
  lowestBodyFat?: { value: number; date: string };
  lowestWaist?: { value: number; date: string };
};

/** Find personal best (lowest) values across all entries */
export function findPersonalBests(entries: BodyMeasurement[]): PersonalBests {
  const bests: PersonalBests = {};

  for (const entry of entries) {
    if (entry.weight != null) {
      if (!bests.lowestWeight || entry.weight < bests.lowestWeight.value) {
        bests.lowestWeight = { value: entry.weight, date: entry.date };
      }
    }
    if (entry.bodyFatPercent != null) {
      if (!bests.lowestBodyFat || entry.bodyFatPercent < bests.lowestBodyFat.value) {
        bests.lowestBodyFat = { value: entry.bodyFatPercent, date: entry.date };
      }
    }
    if (entry.measurements.waist != null) {
      if (!bests.lowestWaist || entry.measurements.waist < bests.lowestWaist.value) {
        bests.lowestWaist = { value: entry.measurements.waist, date: entry.date };
      }
    }
  }

  return bests;
}

/** Compute delta of a field over the last 30 days */
export function computeMonthlyChange(
  entries: BodyMeasurement[],
  field: NumericMeasurementKey,
): number | null {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const recent = sorted.filter((e) => e.date >= cutoffStr);
  if (recent.length < 2) return null;

  const first = getValue(recent[0], field);
  const last = getValue(recent[recent.length - 1], field);
  if (first == null || last == null) return null;

  return parseFloat((last - first).toFixed(2));
}
