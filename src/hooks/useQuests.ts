/**
 * useQuests — daily quest state for the current user.
 *
 * Loads on mount and on screen focus (useFocusEffect).
 * Quest completion is driven externally via progressCoordinator;
 * refreshQuests() can be called to pull the latest state.
 *
 * Active-module filtering: the user's profile `goals` array is mapped to XPModules
 * via goalsToModules() so that users who have not selected (e.g.) cardio as a goal
 * will never receive cardio quests. recovery is always included for all users.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getTodayQuests, claimQuestBonus, goalsToModules } from '../services/questService';
import { toLocalDateKey } from '../utils/nutrition';
import { useAuth } from '../contexts/AuthContext';
import type { Quest } from '../types/challenges';

export type UseQuestsReturn = {
  quests: Quest[];
  completedCount: number;
  allDone: boolean;
  bonusClaimed: boolean;
  loading: boolean;
  error: Error | null;
  claimBonus: () => Promise<void>;
  refreshQuests: () => Promise<void>;
};

export function useQuests(): UseQuestsReturn {
  const { userProfile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Derive active modules from the user's profile goals.
  // goalsToModules always includes 'recovery'; all other modules map from goals.
  // Falls back to undefined (all modules) when profile is not yet loaded.
  const userGoals = userProfile?.goals;
  const activeModules = userGoals && userGoals.length > 0
    ? goalsToModules(userGoals)
    : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getTodayQuests(activeModules);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setQuests(result.data.quests);
      setBonusClaimed(result.data.bonusClaimed);
    }
    setLoading(false);
  // activeModules is intentionally excluded from the dependency array:
  // quest documents are created once per day and cached in Firestore, so
  // re-running load() when goals change would produce a no-op (the doc already
  // exists). Including it would cause a re-fetch loop if the profile updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refreshQuests = useCallback(async () => {
    await load();
  }, [load]);

  const claimBonus = useCallback(async () => {
    const dateKey = toLocalDateKey();
    const result = await claimQuestBonus(dateKey);
    if (!result.error) {
      setBonusClaimed(true);
    }
  }, []);

  const completedCount = quests.filter((q) => q.status === 'completed').length;
  const allDone = quests.length > 0 && completedCount === quests.length;

  return {
    quests,
    completedCount,
    allDone,
    bonusClaimed,
    loading,
    error,
    claimBonus,
    refreshQuests,
  };
}
