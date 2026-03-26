/**
 * usePeptideFasting — shared hook for per-peptide fasting window state.
 *
 * Fetches doses from the last `lookbackHours` (default 12) to handle
 * windows that span midnight — we never use getTodaysDoses() here.
 *
 * Returns:
 *  - activeWindows: currently-active fasting windows
 *  - isAnyWindowActive: convenience boolean
 *  - loading: true while fetching
 *  - refresh: manual refetch trigger
 */
import { useState, useCallback, useEffect } from 'react';
import { getDoses } from '../services/peptideService';
import {
  computeActivePeptideFastingWindows,
} from '../utils/peptideFasting';
import type { DoseWindowInput } from '../utils/peptideFasting';
import type { ActivePeptideFastingWindow } from '../types/peptideFasting';
import type { Peptide } from '../types/peptide';

// Re-export for consumers that import from the hook
export type { ActivePeptideFastingWindow };

type UsePeptideFastingOptions = {
  /**
   * How far back to look for doses (hours).
   * Default 12 covers all realistic pre + post combinations (max 8 h each).
   */
  lookbackHours?: number;
  /**
   * Pre-loaded peptide list, used to enrich dose records with fasting windows.
   * If omitted the hook operates in warning-only mode (no enrichment).
   */
  peptides?: Peptide[];
};

type UsePeptideFastingResult = {
  activeWindows: ActivePeptideFastingWindow[];
  isAnyWindowActive: boolean;
  loading: boolean;
  refresh: () => void;
};

export function usePeptideFasting(
  options: UsePeptideFastingOptions = {},
): UsePeptideFastingResult {
  const { lookbackHours = 12, peptides = [] } = options;

  const [activeWindows, setActiveWindows] = useState<ActivePeptideFastingWindow[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const cutoff = new Date(Date.now() - lookbackHours * 3_600_000);
      const result = await getDoses({ startDate: cutoff });
      if (result.error || !result.data) {
        setActiveWindows([]);
        return;
      }

      // Build a lookup of peptide fasting configs keyed by peptideId
      const windowByPeptideId = new Map<string, Peptide['fastingWindow']>();
      for (const p of peptides) {
        if (p.fastingWindow) {
          windowByPeptideId.set(p.id, p.fastingWindow);
        }
      }

      // Map doses to DoseWindowInput, skipping those without a fasting config
      const doseInputs: DoseWindowInput[] = [];
      for (const dose of result.data) {
        const fw = windowByPeptideId.get(dose.peptideId);
        if (!fw) continue;
        doseInputs.push({
          peptideId: dose.peptideId,
          peptideName: dose.peptideName,
          doseTimestampMs: dose.timestamp.toDate().getTime(),
          fastingWindow: fw,
        });
      }

      const nowMs = Date.now();
      setActiveWindows(computeActivePeptideFastingWindows(doseInputs, nowMs));
    } catch {
      setActiveWindows([]);
    } finally {
      setLoading(false);
    }
  }, [lookbackHours, peptides]);

  useEffect(() => {
    compute();
    const intervalId = setInterval(compute, 60_000);
    return () => clearInterval(intervalId);
  }, [compute]);

  const isAnyWindowActive = activeWindows.length > 0;

  return {
    activeWindows,
    isAnyWindowActive,
    loading,
    refresh: compute,
  };
}
