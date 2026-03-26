/**
 * useXP — the single hook all modules call to award XP.
 *
 * Usage:
 *   const { awardXP } = useXP();
 *   // After saving a dose:
 *   awardXP(15, 'log_dose', 'peptides').catch(() => {});
 *
 * The hook is fire-and-forget safe: callers can discard the returned promise.
 * Any failure in XP logic never propagates to the calling module.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGamificationUI } from '../contexts/GamificationContext';
import {
  awardXP as serviceAwardXP,
  getRecentXPLog,
  getUnlockedAchievements,
} from '../services/gamificationService';
import { checkAndUnlockAchievements } from '../services/achievementChecker';
import { getLevelForXP } from '../utils/xpEngine';
import { analytics, AnalyticsEvent } from '../services/analytics';
import { onActionCompleted } from '../services/progressCoordinator';
import type { XPSource, XPModule, XPLogEntry, AchievementDoc, LevelInfo } from '../types/gamification';

export type UseXPReturn = {
  level: number;
  totalXP: number;
  levelInfo: LevelInfo;
  todayXP: number;
  recentLog: XPLogEntry[];
  achievements: Record<string, AchievementDoc>;
  loading: boolean;
  awardXP: (
    amount: number,
    source: XPSource,
    module: XPModule,
    exempt?: boolean,
  ) => Promise<void>;
  refreshLog: () => Promise<void>;
};

export function useXP(): UseXPReturn {
  const { userProfile, refreshProfile } = useAuth();
  const { showXPToast, showLevelUpModal } = useGamificationUI();

  const [recentLog, setRecentLog] = useState<XPLogEntry[]>([]);
  const [achievements, setAchievements] = useState<Record<string, AchievementDoc>>({});
  const [loading, setLoading] = useState(true);

  // Derived from profile (single source of truth — no separate state)
  const gamification = userProfile?.gamification;
  const totalXP = gamification?.totalXP ?? 0;
  const level = gamification?.level ?? 1;
  const todayXP = gamification?.todayXP ?? 0;
  const levelInfo = getLevelForXP(totalXP);

  // Track which modules have earned XP today for the "all_in" achievement
  const modulesEarnedTodayRef = useRef<Set<string>>(new Set());
  const unlockedIdsRef = useRef<Set<string>>(new Set(Object.keys(achievements)));

  // Keep unlockedIds ref in sync with achievements state
  useEffect(() => {
    unlockedIdsRef.current = new Set(Object.keys(achievements));
  }, [achievements]);

  // Load recent log + achievements on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [logResult, achieveResult] = await Promise.allSettled([
        getRecentXPLog(20),
        getUnlockedAchievements(),
      ]);
      if (cancelled) return;
      if (logResult.status === 'fulfilled' && logResult.value.data) {
        setRecentLog(logResult.value.data);
      }
      if (achieveResult.status === 'fulfilled' && achieveResult.value.data) {
        setAchievements(achieveResult.value.data);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const refreshLog = useCallback(async () => {
    const result = await getRecentXPLog(20);
    if (result.data) setRecentLog(result.data);
  }, []);

  const awardXP = useCallback(
    async (
      amount: number,
      source: XPSource,
      module: XPModule,
      exempt = false,
    ): Promise<void> => {
      try {
        const result = await serviceAwardXP(amount, source, module, exempt);
        if (result.error || !result.data) return;

        const { xpAwarded, leveledUp, newLevel } = result.data;

        if (xpAwarded > 0) {
          showXPToast(xpAwarded, source);
          analytics.track(AnalyticsEvent.XP_AWARDED, {
            amount: xpAwarded,
            source,
            module,
            exempt,
          });
        }

        // Notify progressCoordinator so quests (and future challenges/duels)
        // can react to this action. Fire-and-forget — failures are swallowed internally.
        onActionCompleted({ source, module, metadata: { amount: xpAwarded } });

        if (leveledUp) {
          showLevelUpModal(newLevel, result.data.newTotal);
          analytics.track(AnalyticsEvent.LEVEL_UP, { new_level: newLevel });
        }

        // Track modules earned today for "all_in" achievement
        if (module !== 'system' && module !== 'recovery') {
          modulesEarnedTodayRef.current.add(module);
        }

        // Refresh profile so level/XP update in the hook's derived values
        refreshProfile().catch(() => {});

        // Check achievements — skip for bonus awards to prevent loops
        if (source !== 'achievement_bonus') {
          // macroTargetDays is the persistent counter on the profile (incremented by
          // gamificationService when source === 'macro_targets_hit'). After awardXP
          // returns, the service has already written the incremented value to Firestore,
          // but the local profile hasn't been refreshed yet — so we compute the
          // optimistic value ourselves to avoid an off-by-one on the unlock check.
          const persistedMacroTargetDays = gamification?.macroTargetDays ?? 0;
          const macroTargetDays =
            source === 'macro_targets_hit'
              ? persistedMacroTargetDays + 1
              : persistedMacroTargetDays;

          const newlyUnlocked = await checkAndUnlockAchievements({
            totalXP: result.data.newTotal,
            level: newLevel,
            module,
            source,
            unlockedIds: unlockedIdsRef.current,
            modulesEarnedToday: modulesEarnedTodayRef.current,
            streakCurrent: 0, // passed in via integration points that have streak data
            daysOnPlanLast30: 0,
            macroTargetDays,
          });

          for (const def of newlyUnlocked) {
            showXPToast(def.xpReward, 'achievement_bonus');
            analytics.track(AnalyticsEvent.ACHIEVEMENT_UNLOCKED, {
              achievement_id: def.id,
              achievement_title: def.title,
              xp_reward: def.xpReward,
            });
            // Update local achievements state optimistically.
            // Timestamps are null until the next refreshLog() call overwrites them.
            setAchievements((prev) => ({
              ...prev,
              [def.id]: {
                unlockedAt: null as any,
                xpAwarded: def.xpReward,
                createdAt: null as any,
                updatedAt: null as any,
              },
            }));
          }

          // Refresh log if anything was awarded
          if (xpAwarded > 0 || newlyUnlocked.length > 0) {
            refreshLog().catch(() => {});
          }
        }
      } catch {
        // Never propagate — XP failures must not affect the parent action
      }
    },
    [gamification, showXPToast, showLevelUpModal, refreshProfile, refreshLog],
  );

  return {
    level,
    totalXP,
    levelInfo,
    todayXP,
    recentLog,
    achievements,
    loading,
    awardXP,
    refreshLog,
  };
}
