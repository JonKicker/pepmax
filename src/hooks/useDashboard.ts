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
import type { DashboardCardId, DashboardData } from '../types/dashboard';
import { DEFAULT_CARD_ORDER as DEFAULT_ORDER } from '../types/dashboard';

type DashboardState = {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  errors: Record<string, boolean>;
  cardOrder: DashboardCardId[];
  hiddenCards: DashboardCardId[];
  onboardingDismissed: boolean;
};

export function useDashboard() {
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
      const data = await fetchDashboardData({ forceRefresh });

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
          // Migration: ensure existing users see smartInsights before aiInsight
          if (!order.includes('smartInsights')) {
            const aiIdx = order.indexOf('aiInsight');
            const spliced = [...order];
            if (aiIdx >= 0) {
              spliced.splice(aiIdx, 0, 'smartInsights');
            } else {
              spliced.push('smartInsights');
            }
            return spliced;
          }
          return order;
        })(),
        hiddenCards: prefs?.hiddenCards ?? [],
        onboardingDismissed: prefs?.onboardingDismissed ?? false,
      }));
    } catch (e) {
      console.error('[useDashboard] load error:', e);
      setState((prev) => ({ ...prev, loading: false, refreshing: false }));
    }
  }, []);

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

  return {
    ...state,
    refresh,
    toggleCardVisibility,
    dismissOnboarding,
  };
}
