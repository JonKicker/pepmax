/**
 * useChallenges — state hook for community challenges.
 *
 * Exposes: activeChallenges, upcomingChallenges, completedChallenges,
 *          loading, joinChallenge, leaveChallenge, refresh, filter, setFilter
 *
 * Uses useFocusEffect for initial load on screen focus.
 * Filter state allows narrowing by ChallengeType or 'all'.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { ChallengeDoc, ChallengeType } from '../types/challenges';
import {
  getActiveChallenges,
  getUpcomingChallenges,
  getCompletedChallenges,
  joinChallenge as serviceJoin,
  leaveChallenge as serviceLeave,
} from '../services/challengeService';
import { analytics, AnalyticsEvent } from '../services/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChallengeFilter = ChallengeType | 'all';

export type UseChallengesResult = {
  activeChallenges: ChallengeDoc[];
  upcomingChallenges: ChallengeDoc[];
  completedChallenges: ChallengeDoc[];
  loading: boolean;
  error: Error | null;
  filter: ChallengeFilter;
  setFilter: (filter: ChallengeFilter) => void;
  joinChallenge: (challengeId: string) => Promise<Error | null>;
  leaveChallenge: (challengeId: string) => Promise<Error | null>;
  refresh: () => void;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChallenges(): UseChallengesResult {
  const [activeChallenges, setActiveChallenges] = useState<ChallengeDoc[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<ChallengeDoc[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<ChallengeFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [activeResult, upcomingResult, completedResult] = await Promise.all([
      getActiveChallenges(),
      getUpcomingChallenges(),
      getCompletedChallenges(),
    ]);

    if (activeResult.error) {
      setError(activeResult.error);
    } else {
      setActiveChallenges(activeResult.data ?? []);
    }

    if (upcomingResult.error) {
      setError(upcomingResult.error);
    } else {
      setUpcomingChallenges(upcomingResult.data ?? []);
    }

    if (completedResult.error) {
      setError(completedResult.error);
    } else {
      setCompletedChallenges(completedResult.data ?? []);
    }

    setLoading(false);
  }, [refreshKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const joinChallenge = useCallback(async (challengeId: string): Promise<Error | null> => {
    const result = await serviceJoin(challengeId);
    if (result.error) return result.error;

    analytics.track(AnalyticsEvent.CHALLENGE_JOINED, { challengeId });

    // Optimistically update active challenges participantCount
    setActiveChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, participantCount: c.participantCount + 1 }
          : c,
      ),
    );
    // Also check upcoming
    setUpcomingChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, participantCount: c.participantCount + 1 }
          : c,
      ),
    );
    return null;
  }, []);

  const leaveChallenge = useCallback(async (challengeId: string): Promise<Error | null> => {
    const result = await serviceLeave(challengeId);
    if (result.error) return result.error;

    analytics.track(AnalyticsEvent.CHALLENGE_LEFT, { challengeId });

    // Optimistically update participantCount
    setActiveChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, participantCount: Math.max(0, c.participantCount - 1) }
          : c,
      ),
    );
    setUpcomingChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, participantCount: Math.max(0, c.participantCount - 1) }
          : c,
      ),
    );
    return null;
  }, []);

  // Apply filter
  const applyFilter = useCallback(
    (challenges: ChallengeDoc[]) => {
      if (filter === 'all') return challenges;
      return challenges.filter((c) => c.type === filter);
    },
    [filter],
  );

  return {
    activeChallenges: applyFilter(activeChallenges),
    upcomingChallenges: applyFilter(upcomingChallenges),
    completedChallenges: applyFilter(completedChallenges),
    loading,
    error,
    filter,
    setFilter,
    joinChallenge,
    leaveChallenge,
    refresh,
  };
}
