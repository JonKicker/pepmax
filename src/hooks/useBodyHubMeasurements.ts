/**
 * Data hook for the Body Hub measurements layer.
 * Fetches measurement history and computes latest values + trends.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getMeasurementHistory } from '../services/bodyMeasurementService';
import type { BodyMeasurement, CircumferenceMeasurements } from '../types/bodyMeasurement';
import { MEASUREMENT_POINTS } from '../constants/bodyHubPaths';
import type { MeasurementPointData, MeasurementField, BodyView } from '../types/bodyHub';

type UseBodyHubMeasurementsResult = {
  points: MeasurementPointData[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getPointData: (field: MeasurementField) => MeasurementPointData | null;
};

/**
 * Compute trend by comparing latest to average of prior 3 entries.
 * >1% = up, <-1% = down, else flat.
 */
function computeTrend(history: number[]): 'up' | 'down' | 'flat' | 'none' {
  if (history.length < 2) return 'none';

  const latest = history[0];
  const prior = history.slice(1, 4);
  if (prior.length === 0) return 'none';

  const avg = prior.reduce((sum, v) => sum + v, 0) / prior.length;
  if (avg === 0) return 'none';

  const delta = (latest - avg) / avg;
  if (delta > 0.01) return 'up';
  if (delta < -0.01) return 'down';
  return 'flat';
}

export function useBodyHubMeasurements(view: BodyView, enabled = true): UseBodyHubMeasurementsResult {
  const [points, setPoints] = useState<MeasurementPointData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getMeasurementHistory();
      if (result.error) {
        setError(result.error.message ?? String(result.error));
        return;
      }

      const measurements = result.data ?? [];
      // Sort newest first
      const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));

      const unit = sorted[0]?.measurementUnit ?? 'in';

      // Build point data for each measurement field
      const pointData: MeasurementPointData[] = MEASUREMENT_POINTS.map((point) => {
        const field = point.field as keyof CircumferenceMeasurements;

        // Extract history for this field (newest first)
        const history: { date: string; value: number }[] = [];
        for (const m of sorted) {
          const val = m.measurements?.[field];
          if (val != null && val > 0) {
            history.push({ date: m.date, value: val });
          }
          if (history.length >= 8) break;
        }

        const latestValue = history.length > 0 ? history[0].value : null;
        const trend = computeTrend(history.map((h) => h.value));

        return {
          field: point.field,
          label: point.label,
          latestValue,
          unit,
          trend,
          history,
        };
      });

      setPoints(pointData);
    } catch (err) {
      setError('Failed to load measurement data');
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

  const getPointData = useCallback(
    (field: MeasurementField): MeasurementPointData | null => {
      return points.find((p) => p.field === field) ?? null;
    },
    [points]
  );

  return {
    points,
    loading,
    error,
    refresh: fetchData,
    getPointData,
  };
}
