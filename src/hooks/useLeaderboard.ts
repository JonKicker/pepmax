/**
 * useLeaderboard — hook for leaderboard data with category/timeframe/scope switching.
 *
 * Exposes:
 *   entries          — ordered list of LeaderboardEntry for current board
 *   userRank         — current user's rank data for current category/timeframe
 *   totalParticipants — total count of ranked users
 *   loading          — fetch in progress
 *   category         — currently selected LeaderboardCategory
 *   setCategory      — category setter
 *   timeframe        — currently selected LeaderboardTimeframe
 *   setTimeframe     — timeframe setter
 *   scope            — 'global' | 'friends' | 'crew'
 *   setScope         — scope setter
 *   selectedCrewId   — crew ID when scope === 'crew'
 *   setSelectedCrewId — crew ID setter
 *   refresh          — manual re-fetch
 *
 * Refreshes on screen focus via useFocusEffect.
 * Scope-switching re-fetches automatically.
 *
 * For 'friends' and 'crew' scopes, callers must pass friendUids / crewMemberUids
 * via the options object; these are not fetched internally to keep the hook lean.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getGlobalLeaderboard,
  getUserRank,
  getFriendsLeaderboard,
  getCrewLeaderboard,
} from '../services/leaderboardService';
import type {
  LeaderboardCategory,
  LeaderboardTimeframe,
  LeaderboardScope,
  LeaderboardEntry,
  UserLeaderboardRank,
} from '../types/social';

// ─── Options ──────────────────────────────────────────────────────────────────

export type UseLeaderboardOptions = {
  /** UIDs of the current user's friends. Required when scope === 'friends'. */
  friendUids?: string[];
  /** UIDs of members in the selected crew. Required when scope === 'crew'. */
  crewMemberUids?: string[];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const [category, setCategory] = useState<LeaderboardCategory>('weeklyVolume');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserLeaderboardRank | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  // Keep options in a ref so refresh can always read the latest values
  // without needing to be in the dependency array.
  const optionsRef = useRef<UseLeaderboardOptions>(options);
  optionsRef.current = options;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch leaderboard entries based on scope
      if (scope === 'global') {
        const result = await getGlobalLeaderboard(category, timeframe);
        if (!result.error && result.data) {
          setEntries(result.data.entries);
          setTotalParticipants(result.data.totalParticipants);
        } else {
          setEntries([]);
          setTotalParticipants(0);
        }
      } else if (scope === 'friends') {
        const friendUids = optionsRef.current.friendUids ?? [];
        const result = await getFriendsLeaderboard(category, timeframe, friendUids);
        if (!result.error && result.data) {
          setEntries(result.data);
          setTotalParticipants(result.data.length);
        } else {
          setEntries([]);
          setTotalParticipants(0);
        }
      } else if (scope === 'crew') {
        const memberUids = optionsRef.current.crewMemberUids ?? [];
        const result = await getCrewLeaderboard(category, timeframe, memberUids);
        if (!result.error && result.data) {
          setEntries(result.data);
          setTotalParticipants(result.data.length);
        } else {
          setEntries([]);
          setTotalParticipants(0);
        }
      }

      // Fetch the current user's rank for global scope
      if (scope === 'global') {
        const rankResult = await getUserRank(category, timeframe);
        setUserRank(rankResult.error ? null : rankResult.data);
      } else {
        // For friends/crew scopes, userRank is derived from the entries list
        setUserRank(null);
      }
    } finally {
      setLoading(false);
    }
  }, [category, timeframe, scope]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Re-fetch whenever the user changes category, timeframe, scope, or crew.
  // mountedRef guards against duplicating the initial load handled by useFocusEffect above.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return; // Skip initial render — useFocusEffect handles first load
    }
    refresh();
  }, [category, timeframe, scope, selectedCrewId, refresh]);

  // ── Setters that also trigger refresh ────────────────────────────────────

  const handleSetCategory = useCallback(
    (newCategory: LeaderboardCategory) => {
      setCategory(newCategory);
    },
    [],
  );

  const handleSetTimeframe = useCallback(
    (newTimeframe: LeaderboardTimeframe) => {
      setTimeframe(newTimeframe);
    },
    [],
  );

  const handleSetScope = useCallback(
    (newScope: LeaderboardScope) => {
      setScope(newScope);
    },
    [],
  );

  return {
    entries,
    userRank,
    totalParticipants,
    loading,
    category,
    setCategory: handleSetCategory,
    timeframe,
    setTimeframe: handleSetTimeframe,
    scope,
    setScope: handleSetScope,
    selectedCrewId,
    setSelectedCrewId,
    refresh,
  };
}
