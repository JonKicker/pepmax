/**
 * useDashboard — hook for dashboard data, loading, refresh, and preferences.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchDashboardData,
  invalidateCache,
  getCacheAge,
  saveDashboardPreferences,
} from '../services/dashboardService';
import { toggleRestDay as toggleRestDayService } from '../services/consistencyService';
import type { DashboardCardId, DashboardData } from '../types/dashboard';
import { DEFAULT_CARD_ORDER as DEFAULT_ORDER } from '../types/dashboard';
import type { UserProfile } from '../types/profile';

type DashboardState = {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  errors: Record<string, boolean>;
  cardOrder: DashboardCardId[];
  hiddenCards: DashboardCardId[];
  onboardingDismissed: boolean;
};

export function useDashboard(userProfile?: UserProfile | null) {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    refreshing: false,
    errors: {},
    cardOrder: DEFAULT_ORDER,
    hiddenCards: [],
    onboardingDismissed: false,
  });

  const load = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchDashboardData({ forceRefresh, userProfile });

      const prefs = data.preferences;
      setState((prev) => ({
        ...prev,
        data,
        loading: false,
        refreshing: false,
        errors: {
          peptides: data.doses === null,
          nutrition: data.totals === null,
          training: data.recentSessions === null,
          cardio: data.recentCardio === null,
          bodyWeight: data.recentWeights === null,
        },
        cardOrder: (() => {
          const order = prefs?.cardOrder ?? DEFAULT_ORDER;
          let result = [...order];
          // Migration: ensure smartInsights is before aiInsight
          if (!result.includes('smartInsights')) {
            const aiIdx = result.indexOf('aiInsight');
            if (aiIdx >= 0) {
              result.splice(aiIdx, 0, 'smartInsights');
            } else {
              result.push('smartInsights');
            }
          }
          // Migration: ensure consistency is after greeting
          if (!result.includes('consistency')) {
            const greetingIdx = result.indexOf('greeting');
            if (greetingIdx >= 0) {
              result.splice(greetingIdx + 1, 0, 'consistency');
            } else {
              result.unshift('consistency');
            }
          }
          // Migration: ensure recovery is after greeting
          if (!result.includes('recovery')) {
            const greetingIdx = result.indexOf('greeting');
            if (greetingIdx >= 0) {
              result.splice(greetingIdx + 1, 0, 'recovery');
            } else {
              result.unshift('recovery');
            }
          }
          // Migration: ensure bodyHub is after recovery
          if (!result.includes('bodyHub')) {
            const recoveryIdx = result.indexOf('recovery');
            if (recoveryIdx >= 0) {
              result.splice(recoveryIdx + 1, 0, 'bodyHub');
            } else {
              result.push('bodyHub');
            }
          }
          // Migration: ensure quests is after bodyHub
          if (!result.includes('quests')) {
            const bodyHubIdx = result.indexOf('bodyHub');
            if (bodyHubIdx >= 0) {
              result.splice(bodyHubIdx + 1, 0, 'quests');
            } else {
              const recoveryIdx = result.indexOf('recovery');
              if (recoveryIdx >= 0) {
                result.splice(recoveryIdx + 1, 0, 'quests');
              } else {
                result.push('quests');
              }
            }
          }
          // Migration: append hydration if not present
          if (!result.includes('hydration')) {
            result.push('hydration');
          }
          return result;
        })(),
        hiddenCards: prefs?.hiddenCards ?? [],
        onboardingDismissed: prefs?.onboardingDismissed ?? false,
      }));
    } catch (e) {
      console.error('[useDashboard] load error:', e);
      setState((prev) => ({ ...prev, loading: false, refreshing: false }));
    }
  }, [userProfile]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function init() {
        // If cache is older than 30s, force refresh on focus
        const forceRefresh = getCacheAge() > 30_000;
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: prev.data === null }));
          await load(forceRefresh);
        }
      }

      init();
      return () => { cancelled = true; };
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    invalidateCache();
    await load(true);
  }, [load]);

  const toggleCardVisibility = useCallback(async (cardId: DashboardCardId) => {
    setState((prev) => {
      const isHidden = prev.hiddenCards.includes(cardId);
      const hiddenCards = isHidden
        ? prev.hiddenCards.filter((c) => c !== cardId)
        : [...prev.hiddenCards, cardId];

      // Fire and forget save
      saveDashboardPreferences({ hiddenCards }).catch(console.error);

      return { ...prev, hiddenCards };
    });
  }, []);

  const dismissOnboarding = useCallback(async () => {
    setState((prev) => ({ ...prev, onboardingDismissed: true }));
    saveDashboardPreferences({ onboardingDismissed: true }).catch(console.error);
  }, []);

  const reorderCards = useCallback((cardId: DashboardCardId, direction: 'up' | 'down') => {
    setState((prev) => {
      const order = [...prev.cardOrder];
      const idx = order.indexOf(cardId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= order.length) return prev;
      [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];
      saveDashboardPreferences({ cardOrder: order }).catch(console.error);
      return { ...prev, cardOrder: order };
    });
  }, []);

  const toggleRestDay = useCallback(async (dateKey: string) => {
    // Always marks as rest (true). Unmarking requires separate UI — not implemented yet.
    await toggleRestDayService(dateKey, true);
    invalidateCache();
    await load(true);
  }, [load]);

  return {
    ...state,
    refresh,
    toggleCardVisibility,
    dismissOnboarding,
    reorderCards,
    toggleRestDay,
  };
}
