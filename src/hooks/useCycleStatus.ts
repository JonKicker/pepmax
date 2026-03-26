import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getActiveCycles } from '../services/cycleService';
import { toLocalDateStr } from '../utils/cyclePlanner';
import type { Cycle, PlannedDose } from '../types/cycle';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveCycleInfo = {
  cycle: Cycle;
  currentWeek: number;
  totalWeeks: number | null; // null = open-ended
  currentDose: number;
  nextDoseDate: string | null;
  completedCount: number;
  missedCount: number;
  totalPlanned: number;
  todaysDose: PlannedDose | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeInfo(cycle: Cycle): ActiveCycleInfo {
  const today = toLocalDateStr(new Date());

  const [sy, sm, sd] = cycle.startDate.split('-').map(Number);
  const startMs = new Date(sy, sm - 1, sd).getTime();
  const nowMs = Date.now();
  const daysDiff = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
  const currentWeek = Math.floor(daysDiff / 7) + 1;

  const todaysDose = cycle.plannedDoses.find((pd) => pd.date === today) ?? null;

  // Current dose = amount from the most recent planned dose on or before today
  const pastDoses = cycle.plannedDoses.filter((pd) => pd.date <= today);
  const currentDose =
    pastDoses.length > 0 ? pastDoses[pastDoses.length - 1].amount : cycle.startingDose;

  // Next dose = earliest future dose not yet completed
  const futureDoses = cycle.plannedDoses.filter(
    (pd) => pd.date > today && !pd.completedAt,
  );
  const nextDoseDate = futureDoses.length > 0 ? futureDoses[0].date : null;

  const completedCount = cycle.plannedDoses.filter((pd) => pd.completedAt != null).length;
  // Missed = past dates with no completedAt (yellow, not red — no shaming)
  const missedCount = cycle.plannedDoses.filter(
    (pd) => pd.date < today && pd.completedAt == null,
  ).length;

  return {
    cycle,
    currentWeek,
    totalWeeks: cycle.durationWeeks,
    currentDose,
    nextDoseDate,
    completedCount,
    missedCount,
    totalPlanned: cycle.plannedDoses.length,
    todaysDose,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCycleStatus() {
  const [activeCycles, setActiveCycles] = useState<ActiveCycleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getActiveCycles();
    if (result.error) {
      setError('Failed to load active cycles.');
    } else {
      setActiveCycles((result.data ?? []).map(computeInfo));
      setError(null);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { activeCycles, loading, error, refresh };
}
