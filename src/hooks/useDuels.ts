/**
 * useDuels — hook wrapping duelService.
 *
 * Exposes activeDuels, pendingDuels (received), completedDuels, loading,
 * and CRUD actions.
 *
 * Refreshes on screen focus via useFocusEffect.
 *
 * Pending duels shown here are duels where opponentUid == me AND status == 'pending'
 * (i.e., challenges waiting for MY response), not challenges I've sent.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { auth } from '../services/firebase/index';
import {
  getMyDuels,
  createDuel as createDuelService,
  acceptDuel as acceptDuelService,
  declineDuel as declineDuelService,
} from '../services/duelService';
import type { DuelDoc, DuelMetric } from '../types/challenges';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDuels() {
  const [activeDuels, setActiveDuels] = useState<DuelDoc[]>([]);
  const [pendingDuels, setPendingDuels] = useState<DuelDoc[]>([]);
  const [completedDuels, setCompletedDuels] = useState<DuelDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    const [activeResult, pendingResult, completedResult] = await Promise.all([
      getMyDuels('active'),
      getMyDuels('pending'),
      getMyDuels('completed'),
    ]);

    if (!activeResult.error) setActiveDuels(activeResult.data ?? []);
    if (!completedResult.error) setCompletedDuels(completedResult.data ?? []);

    // Pending duels = only those where I'm the opponent (waiting for my response)
    if (!pendingResult.error) {
      const myUid = auth.currentUser?.uid ?? '';
      const received = (pendingResult.data ?? []).filter(
        (d) => d.opponentUid === myUid,
      );
      setPendingDuels(received);
    }

    setLoading(false);
  }, []);

  // Refresh whenever the screen that uses this hook comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const createDuel = useCallback(
    async (opponentUid: string, metric: DuelMetric, durationWeeks: 1 | 2) => {
      const result = await createDuelService(opponentUid, metric, durationWeeks);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const acceptDuel = useCallback(
    async (duelId: string) => {
      const result = await acceptDuelService(duelId);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const declineDuel = useCallback(
    async (duelId: string) => {
      const result = await declineDuelService(duelId);
      if (!result.error) {
        setPendingDuels((prev) => prev.filter((d) => d.id !== duelId));
      }
      return result;
    },
    [],
  );

  return {
    // State
    activeDuels,
    pendingDuels,
    completedDuels,
    loading,
    // Actions
    createDuel,
    acceptDuel,
    declineDuel,
    refresh,
  };
}
