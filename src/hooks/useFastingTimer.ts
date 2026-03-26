/**
 * useFastingTimer — derives live FastingTimerData from the user's fasting config
 * and the current clock, plus provides actions for breaking the fast.
 *
 * Interval pattern:
 * - useFocusEffect reloads config when the screen is focused (catches config changes).
 * - setInterval(1000) drives the live countdown display only.
 * - Interval is cleaned up on unmount / focus loss to avoid background drains.
 *
 * On fasting window completion (transition from fasting → eating state):
 * - Calls onActionCompleted('fasting_complete') fire-and-forget for quests/challenges/duels.
 * - Awards 10 XP via the useXP hook.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useXP } from './useXP';
import { getFastingConfig, logFastComplete, logBreakFast, hasTodayFastingLog, getWeeklyCompletionCount } from '../services/fastingService';
import { onActionCompleted } from '../services/progressCoordinator';
import { toLocalDateKey } from '../utils/nutrition';
import type { FastingConfig, FastingTimerData, FastingState } from '../types/fasting';

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Parses "HH:mm" into { hours, minutes }.
 */
function parseHHmm(hhmm: string): { hours: number; minutes: number } {
  const parts = hhmm.split(':');
  return {
    hours: parseInt(parts[0] ?? '0', 10),
    minutes: parseInt(parts[1] ?? '0', 10),
  };
}

/**
 * Returns the number of milliseconds from midnight to "HH:mm".
 */
function hmToMs(hhmm: string): number {
  const { hours, minutes } = parseHHmm(hhmm);
  return (hours * 60 + minutes) * 60 * 1000;
}

/**
 * Derives FastingTimerData from the current time and config.
 *
 * Logic:
 * - windowStartMs and windowEndMs are offsets from midnight in ms.
 * - If windowEnd < windowStart the eating window crosses midnight.
 * - nowMs = milliseconds since midnight (local time).
 *
 * Returns state 'eating' when inside the window, 'fasting' outside.
 */
function deriveTimerData(config: FastingConfig, now: Date): FastingTimerData {
  const startMs = hmToMs(config.eatingWindowStart);
  const endMs = hmToMs(config.eatingWindowEnd);

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const nowMs = now.getTime() - midnight.getTime();

  // Determine the full eating window duration (wraps midnight if end < start)
  const eatingDurationMs =
    endMs > startMs
      ? endMs - startMs
      : 24 * 60 * 60 * 1000 - startMs + endMs;

  const fastingDurationMs = 24 * 60 * 60 * 1000 - eatingDurationMs;

  // Is the user currently in the eating window?
  let isEating: boolean;
  if (endMs > startMs) {
    // Normal window (e.g. 12:00 – 20:00)
    isEating = nowMs >= startMs && nowMs < endMs;
  } else {
    // Overnight window (e.g. 20:00 – 04:00)
    isEating = nowMs >= startMs || nowMs < endMs;
  }

  const state: FastingState = isEating ? 'eating' : 'fasting';

  let timeRemainingMs: number;
  let totalDurationMs: number;

  if (isEating) {
    totalDurationMs = eatingDurationMs;
    // Time until eating window ends
    if (endMs > startMs) {
      timeRemainingMs = endMs - nowMs;
    } else {
      // Crossed midnight — window ends at endMs tomorrow
      timeRemainingMs = nowMs >= startMs
        ? 24 * 60 * 60 * 1000 - nowMs + endMs
        : endMs - nowMs;
    }
  } else {
    totalDurationMs = fastingDurationMs;
    // Time until eating window starts
    if (nowMs < startMs) {
      timeRemainingMs = startMs - nowMs;
    } else {
      // Past end, waiting for next day's start
      timeRemainingMs = 24 * 60 * 60 * 1000 - nowMs + startMs;
    }
  }

  const elapsed = totalDurationMs - timeRemainingMs;
  const progress = totalDurationMs > 0 ? Math.max(0, Math.min(1, elapsed / totalDurationMs)) : 0;

  return {
    state,
    timeRemainingMs: Math.max(0, timeRemainingMs),
    totalDurationMs,
    progress,
    protocolLabel: config.protocol === 'custom' ? 'Custom' : config.protocol,
    windowStart: config.eatingWindowStart,
    windowEnd: config.eatingWindowEnd,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type UseFastingTimerReturn = {
  timerData: FastingTimerData | null;
  config: FastingConfig | null;
  loading: boolean;
  /** Count of completed fasting days in the past 7-day window (not a consecutive streak). */
  weeklyCompletionCount: number;
  /** True if the user has broken today's fast (persists across re-renders). */
  hasBrokenToday: boolean;
  breakFast: () => Promise<void>;
  /** Manual "Mark Fasting Complete" — deduplicates, awards XP, and fires onActionCompleted. */
  markFastComplete: () => Promise<void>;
  refreshConfig: () => Promise<void>;
};

export function useFastingTimer(): UseFastingTimerReturn {
  const { currentUser } = useAuth();
  const { awardXP } = useXP();

  const [config, setConfig] = useState<FastingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerData, setTimerData] = useState<FastingTimerData | null>(null);
  const [weeklyCompletionCount, setWeeklyCompletionCount] = useState(0);
  const [hasBrokenToday, setHasBrokenToday] = useState(false);

  // Track whether we already fired the completion event for the current eating window
  // transition to avoid duplicate XP awards when the component re-renders.
  const windowCompletedFiredRef = useRef(false);
  // Track previous state to detect the fasting → eating transition
  const prevStateRef = useRef<FastingState | null>(null);

  const loadConfig = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    const result = await getFastingConfig();
    setConfig(result.data ?? null);

    if (result.data) {
      const derived = deriveTimerData(result.data, new Date());
      setTimerData(derived);
    } else {
      setTimerData({ state: 'unconfigured', timeRemainingMs: 0, totalDurationMs: 0, progress: 0, protocolLabel: '', windowStart: '', windowEnd: '' });
    }

    // Load weekly completion count in parallel
    const countResult = await getWeeklyCompletionCount();
    setWeeklyCompletionCount(countResult.data ?? 0);

    setLoading(false);
  }, [currentUser?.uid]);

  // Reload on focus (catches config changes from setup screen)
  useFocusEffect(
    useCallback(() => {
      loadConfig();
      windowCompletedFiredRef.current = false;
      setHasBrokenToday(false);
    }, [loadConfig]),
  );

  // Live countdown: update every second
  useEffect(() => {
    if (!config) return;

    const tick = () => {
      const now = new Date();
      const derived = deriveTimerData(config, now);
      setTimerData(derived);

      // Detect fasting → eating transition (window just opened)
      if (prevStateRef.current === 'fasting' && derived.state === 'eating') {
        if (!windowCompletedFiredRef.current) {
          windowCompletedFiredRef.current = true;

          // Fire-and-forget: award XP for completing a full fasting window.
          // awardXP enforces the 200 XP/day cap internally in gamificationService
          // via computeRemainingDailyCap — no additional guard needed here.
          awardXP(10, 'fasting_complete', 'nutrition').catch(() => {});

          // Notify progress coordinator for quests / challenges / duels
          onActionCompleted({ source: 'fasting_complete', module: 'nutrition', metadata: {} });
        }
      }

      prevStateRef.current = derived.state;
    };

    tick(); // immediate update on config load
    const intervalId = setInterval(tick, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [config, awardXP]);

  const breakFast = useCallback(async () => {
    if (!currentUser?.uid) return;
    const date = toLocalDateKey();
    await logBreakFast(date);
    setHasBrokenToday(true);
    // Refresh weekly completion count after breaking
    const countResult = await getWeeklyCompletionCount();
    setWeeklyCompletionCount(countResult.data ?? 0);
  }, [currentUser?.uid]);

  /**
   * Manual "Mark Fasting Complete" action.
   *
   * Deduplication: checks whether a completed log already exists for today
   * (written by the automatic fasting→eating transition) before writing again.
   * Uses windowCompletedFiredRef as a fast in-memory guard, then falls back to
   * a Firestore read for the case where the screen was remounted.
   *
   * Awards 10 XP and fires onActionCompleted — same as the automatic path —
   * so quests, challenges, and duels always receive credit regardless of which
   * path completes the fast.
   *
   * awardXP enforces the 200 XP/day cap internally in gamificationService
   * via computeRemainingDailyCap, so double-award is impossible even if the
   * dedup check were to race.
   */
  const markFastComplete = useCallback(async () => {
    if (!currentUser?.uid) return;
    const date = toLocalDateKey();

    // Fast guard: automatic transition already fired this session
    if (windowCompletedFiredRef.current) return;

    // Firestore dedup: another session or app restart may have already logged today
    const alreadyLogged = await hasTodayFastingLog(date);
    if (alreadyLogged) return;

    // Mark as fired before the async write to prevent concurrent double-taps
    windowCompletedFiredRef.current = true;

    await logFastComplete(date);

    // Award XP — cap is enforced inside gamificationService
    awardXP(10, 'fasting_complete', 'nutrition').catch(() => {});

    // Notify progress coordinator for quests / challenges / duels
    onActionCompleted({ source: 'fasting_complete', module: 'nutrition', metadata: {} });

    // Refresh weekly completion count
    const countResult = await getWeeklyCompletionCount();
    setWeeklyCompletionCount(countResult.data ?? 0);
  }, [currentUser?.uid, awardXP]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return { timerData, config, loading, weeklyCompletionCount, hasBrokenToday, breakFast, markFastComplete, refreshConfig };
}
