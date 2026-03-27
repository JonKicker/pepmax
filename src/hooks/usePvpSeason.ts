/**
 * usePvpSeason — hook for season and weekly league data.
 *
 * Fetches on mount and refreshes when the screen comes into focus.
 * Computes league standings client-side from the league document.
 * Exposes claimReward() which calls the CF via pvpService.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { auth } from '../services/firebase/index';
import {
  getCurrentSeason,
  getUserSeasonProgress,
  getUserWeeklyLeague,
  claimSeasonReward,
} from '../services/pvpService';
import { computeStandings, formatTimeRemaining } from '../utils/pvpLeagueUtils';
import type { SeasonDoc, UserSeasonProgress, WeeklyLeagueDoc, LeagueStanding } from '../types/pvp';

type PvpSeasonState = {
  season: SeasonDoc | null;
  progress: UserSeasonProgress | null;
  league: WeeklyLeagueDoc | null;
  standings: LeagueStanding[];
  myStanding: LeagueStanding | null;
  timeRemaining: string;
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: PvpSeasonState = {
  season: null,
  progress: null,
  league: null,
  standings: [],
  myStanding: null,
  timeRemaining: '',
  loading: true,
  error: null,
};

export function usePvpSeason(): PvpSeasonState & {
  claimReward: () => Promise<void>;
  refreshLeague: () => void;
} {
  const [state, setState] = useState<PvpSeasonState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Not authenticated',
      }));
      return;
    }

    // Fetch season and league in parallel
    const [seasonResult, leagueResult] = await Promise.all([
      getCurrentSeason(),
      getUserWeeklyLeague(uid),
    ]);

    if (seasonResult.error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: seasonResult.error?.message ?? 'Failed to load season',
      }));
      return;
    }

    const season = seasonResult.data;
    let progress: UserSeasonProgress | null = null;

    if (season) {
      const progressResult = await getUserSeasonProgress(uid, season.id);
      if (!progressResult.error) {
        progress = progressResult.data;
      }
    }

    const league = leagueResult.error ? null : leagueResult.data;

    // Compute standings client-side
    let standings: LeagueStanding[] = [];
    let myStanding: LeagueStanding | null = null;

    if (league) {
      standings = computeStandings(
        league.members,
        league.promotionSlots,
        league.relegationSlots,
      );
      myStanding = standings.find((s) => s.member.uid === uid) ?? null;
    }

    const timeRemaining =
      season && season.status === 'active'
        ? formatTimeRemaining(season.endDate, Date.now())
        : '';

    setState({
      season,
      progress,
      league,
      standings,
      myStanding,
      timeRemaining,
      loading: false,
      error: null,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const claimReward = useCallback(async () => {
    const seasonId = state.season?.id;
    if (!seasonId) return;

    const result = await claimSeasonReward(seasonId);
    if (!result.error && result.data) {
      // Refresh state to reflect claimed reward
      await load();
    }
  }, [state.season, load]);

  const refreshLeague = useCallback(() => {
    load();
  }, [load]);

  return {
    ...state,
    claimReward,
    refreshLeague,
  };
}
