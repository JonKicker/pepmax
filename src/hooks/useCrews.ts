/**
 * useCrews — hook wrapping crewService.
 *
 * Exposes:
 *   crews        — list of CrewDoc the user belongs to
 *   loading      — fetch in progress
 *   canCreateMore — true if user has fewer than 5 crews
 *   createCrew   — create a new crew
 *   joinCrew     — join via invite code
 *   leaveCrew    — leave a crew
 *   refresh      — manual re-fetch
 *
 * Refreshes on screen focus via useFocusEffect.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getMyCrews,
  createCrew as createCrewService,
  joinCrew as joinCrewService,
  leaveCrew as leaveCrewService,
} from '../services/crewService';
import type { CrewDoc } from '../types/social';

const MAX_CREWS = 5;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrews() {
  const [crews, setCrews] = useState<CrewDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getMyCrews();
    if (!result.error) {
      setCrews(result.data ?? []);
    }
    setLoading(false);
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const createCrew = useCallback(
    async (name: string, avatarEmoji?: string) => {
      const result = await createCrewService(name, avatarEmoji);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const joinCrew = useCallback(
    async (inviteCode: string) => {
      const result = await joinCrewService(inviteCode);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const leaveCrew = useCallback(
    async (crewId: string) => {
      const result = await leaveCrewService(crewId);
      if (!result.error) {
        setCrews((prev) => prev.filter((c) => c.id !== crewId));
      }
      return result;
    },
    [],
  );

  return {
    crews,
    loading,
    canCreateMore: crews.length < MAX_CREWS,
    createCrew,
    joinCrew,
    leaveCrew,
    refresh,
  };
}
