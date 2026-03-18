import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { getPeptides, getDoses } from '../services/peptideService';
import { getSideEffects } from '../services/sideEffectService';
import {
  generateCompoundCurve,
  stepMsForRange,
  lookbackMs,
} from '../utils/halfLifeDecay';
import type { DecayPoint, TimelineRange } from '../utils/halfLifeDecay';
import type { Peptide, Dose } from '../types/peptide';
import type { SideEffectSeverity } from '../types/sideEffect';

export type { TimelineRange };

export type CompoundSeries = {
  peptideId: string;
  peptideName: string;
  color: string;
  hasHalfLife: boolean;
  curveData: DecayPoint[];
  doseMarkers: DecayPoint[];
};

export type SideEffectMarker = {
  x: number;
  emoji: string;
  label: string;
  severity: SideEffectSeverity;
  notes: string;
  peptideName?: string;
};

// Colorblind-safe 8-color palette
const COMPOUND_COLORS = [
  '#2E86C1',
  '#27AE60',
  '#8E44AD',
  '#E74C3C',
  '#00897B',
  '#E67E22',
  '#3498DB',
  '#C0392B',
];

function rangeMs(range: TimelineRange): number {
  switch (range) {
    case '7d':  return 7  * 24 * 3_600_000;
    case '14d': return 14 * 24 * 3_600_000;
    case '30d': return 30 * 24 * 3_600_000;
  }
}

function colorForPeptide(peptideId: string): string {
  return COMPOUND_COLORS[peptideId.charCodeAt(0) % COMPOUND_COLORS.length];
}

export function useHalfLifeTimeline(range: TimelineRange, refreshKey = 0): {
  series: CompoundSeries[];
  sideEffects: SideEffectMarker[];
  loading: boolean;
  error: string | null;
  yMax: number;
} {
  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [sideEffectMarkers, setSideEffectMarkers] = useState<SideEffectMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        setError(null);

        const endMs = Date.now();
        const startMs = endMs - rangeMs(range);
        const startDate = new Date(startMs);
        const endDate = new Date(endMs);

        const [pepResult, doseResult, seResult] = await Promise.all([
          getPeptides(),
          getDoses(),
          getSideEffects(startDate, endDate),
        ]);

        if (cancelled) return;

        if (pepResult.error || doseResult.error) {
          setError('Failed to load data. Pull to refresh.');
          setLoading(false);
          return;
        }

        setPeptides(pepResult.data ?? []);
        setDoses(doseResult.data ?? []);

        const seMarkers: SideEffectMarker[] = (seResult.data ?? []).map((se) => ({
          x: se.timestamp.toMillis(),
          emoji: se.emoji,
          label: se.label,
          severity: se.severity,
          notes: se.notes,
          peptideName: se.peptideName,
        }));
        setSideEffectMarkers(seMarkers);
        setLoading(false);
      }

      load();
      return () => { cancelled = true; };
    }, [range, refreshKey]),
  );

  const { series, yMax } = useMemo(() => {
    const endMs = Date.now();
    const startMs = endMs - rangeMs(range);
    const step = stepMsForRange(range);

    const seriesList: CompoundSeries[] = [];
    let globalMax = 100;

    for (const peptide of peptides) {
      const peptideDoses = doses.filter((d) => d.peptideId === peptide.id);
      if (peptideDoses.length === 0) continue;

      const color = colorForPeptide(peptide.id);
      const hasHalfLife = typeof peptide.halfLifeHours === 'number' && peptide.halfLifeHours > 0;

      // Dose markers — only those within the window
      const doseMarkers: DecayPoint[] = peptideDoses
        .filter((d) => {
          const ms = d.timestamp.toMillis();
          return ms >= startMs && ms <= endMs;
        })
        .map((d) => ({ x: d.timestamp.toMillis(), y: 0 }));

      let curveData: DecayPoint[] = [];
      if (hasHalfLife) {
        // Include lookback doses so accumulation is correct
        const lb = lookbackMs(peptide.halfLifeHours!);
        const dosesForCurve = peptideDoses
          .filter((d) => d.timestamp.toMillis() >= startMs - lb && d.timestamp.toMillis() <= endMs)
          .map((d) => ({ amount: d.amount, timestampMs: d.timestamp.toMillis() }));

        curveData = generateCompoundCurve(
          dosesForCurve,
          peptide.halfLifeHours!,
          startMs,
          endMs,
          step,
        );

        if (curveData.length > 0) {
          const curveMax = Math.max(...curveData.map((p) => p.y));
          if (curveMax > globalMax) globalMax = curveMax;
        }
      }

      seriesList.push({
        peptideId: peptide.id,
        peptideName: peptide.name,
        color,
        hasHalfLife,
        curveData,
        doseMarkers,
      });
    }

    return { series: seriesList, yMax: globalMax };
  }, [peptides, doses, range]);

  return { series, sideEffects: sideEffectMarkers, loading, error, yMax };
}
