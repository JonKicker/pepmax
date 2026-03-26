import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSessionsInDateRange } from '../services/cardioService';
import type { CardioSession, ActivityType, CardioPR } from '../types/cardio';

export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

function rangeStartDate(range: TimeRange): Date {
  const now = new Date();
  if (range === '1m') return new Date(now.getTime() - 30 * 86400000);
  if (range === '3m') return new Date(now.getTime() - 90 * 86400000);
  if (range === '6m') return new Date(now.getTime() - 180 * 86400000);
  if (range === '1y') return new Date(now.getTime() - 365 * 86400000);
  // 'all' — 10 years back
  return new Date(now.getTime() - 3650 * 86400000);
}

const ALL_TIME_START = new Date(Date.now() - 3650 * 86400000);

function weekKeyFromDate(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + 3 - ((copy.getDay() + 6) % 7));
  const week = Math.floor((copy.getTime() - new Date(copy.getFullYear(), 0, 4).getTime()) / 604800000) + 1;
  return `${copy.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type PaceTrendPoint = { x: Date; y: number };
export type DistanceWeekPoint = { x: string; y: number };
export type FrequencyDay = { date: string; count: number; activityType: ActivityType };

export function useCardioProgress(activityType: ActivityType | 'all', timeRange: TimeRange) {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [allTimeSessions, setAllTimeSessions] = useState<CardioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const type = activityType === 'all' ? undefined : activityType;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const start = rangeStartDate(timeRange);
    const end = new Date();

    // Parallel fetch: time-ranged data for charts + all-time data for personal bests
    const [ranged, allTime] = await Promise.all([
      getSessionsInDateRange(start, end, type),
      getSessionsInDateRange(ALL_TIME_START, end, type),
    ]);

    if (ranged.error || allTime.error) {
      setError(true);
    } else {
      setSessions(ranged.data ?? []);
      setAllTimeSessions(allTime.data ?? []);
    }
    setLoading(false);
  }, [activityType, timeRange]);

  useEffect(() => { load(); }, [load]);

  // ── Memoized chart derivations ────────────────────────────────────────────

  const paceTrend = useMemo<PaceTrendPoint[]>(() =>
    sessions
      .filter((s) => s.averagePace > 0)
      .map((s) => ({ x: s.startedAt.toDate(), y: s.averagePace })),
    [sessions]
  );

  const distanceByWeek = useMemo<DistanceWeekPoint[]>(() => {
    const weekMap = new Map<string, number>();
    for (const s of sessions) {
      const wk = weekKeyFromDate(s.startedAt.toDate());
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + s.distance);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, dist]) => ({ x: wk, y: dist }));
  }, [sessions]);

  const frequencyByDay = useMemo<FrequencyDay[]>(() => {
    const dayMap = new Map<string, { count: number; activityType: ActivityType }>();
    for (const s of sessions) {
      const dk = dateKey(s.startedAt.toDate());
      const existing = dayMap.get(dk);
      dayMap.set(dk, {
        count: (existing?.count ?? 0) + 1,
        activityType: s.activityType,
      });
    }
    return Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      activityType: v.activityType,
    }));
  }, [sessions]);

  // ── Streaks (derived from frequencyByDay) ────────────────────────────────

  const { currentStreak, longestStreak } = useMemo(() => {
    if (frequencyByDay.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const sorted = [...frequencyByDay].sort((a, b) => b.date.localeCompare(a.date));
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86400000));

    let current = 0;
    if (sorted[0].date === today || sorted[0].date === yesterday) {
      let streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date);
        const curr = new Date(sorted[i].date);
        const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diff === 1) { streak++; } else { break; }
      }
      current = streak;
    }

    const asc = [...frequencyByDay].sort((a, b) => a.date.localeCompare(b.date));
    let best = 1;
    let streak = 1;
    for (let i = 1; i < asc.length; i++) {
      const prev = new Date(asc[i - 1].date);
      const curr = new Date(asc[i].date);
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        streak++;
      } else {
        best = Math.max(best, streak);
        streak = 1;
      }
    }
    best = Math.max(best, streak);

    return { currentStreak: current, longestStreak: best };
  }, [frequencyByDay]);

  // ── Personal bests — computed from ALL-TIME sessions, not time-ranged ────

  const personalBests = useMemo<CardioPR[]>(() => {
    if (allTimeSessions.length === 0) return [];
    const result: CardioPR[] = [];

    const paced = allTimeSessions.filter((s) => s.averagePace > 0);
    if (paced.length > 0) {
      const best = paced.reduce((a, b) => a.averagePace < b.averagePace ? a : b);
      result.push({ metric: 'fastestPace', activityType: best.activityType, value: best.averagePace, sessionId: best.id, achievedAt: best.startedAt });
    }

    const distBest = allTimeSessions.reduce((a, b) => a.distance > b.distance ? a : b);
    if (distBest.distance > 0) {
      result.push({ metric: 'longestDistance', activityType: distBest.activityType, value: distBest.distance, sessionId: distBest.id, achievedAt: distBest.startedAt });
    }

    const durBest = allTimeSessions.reduce((a, b) => a.duration > b.duration ? a : b);
    if (durBest.duration > 0) {
      result.push({ metric: 'longestDuration', activityType: durBest.activityType, value: durBest.duration, sessionId: durBest.id, achievedAt: durBest.startedAt });
    }

    const calBest = allTimeSessions.reduce((a, b) => a.calories > b.calories ? a : b);
    if (calBest.calories > 0) {
      result.push({ metric: 'mostCalories', activityType: calBest.activityType, value: calBest.calories, sessionId: calBest.id, achievedAt: calBest.startedAt });
    }

    const elevBest = allTimeSessions.reduce((a, b) => a.elevationGain > b.elevationGain ? a : b);
    if (elevBest.elevationGain > 0) {
      result.push({ metric: 'mostElevation', activityType: elevBest.activityType, value: elevBest.elevationGain, sessionId: elevBest.id, achievedAt: elevBest.startedAt });
    }

    const allSplits = allTimeSessions.flatMap((s) =>
      s.splits.filter((sp) => sp.pace > 0).map((sp) => ({ ...sp, sessionId: s.id, activityType: s.activityType, startedAt: s.startedAt }))
    );
    if (allSplits.length > 0) {
      const bestSplit = allSplits.reduce((a, b) => a.pace < b.pace ? a : b);
      result.push({ metric: 'fastestSplit', activityType: bestSplit.activityType, value: bestSplit.pace, sessionId: bestSplit.sessionId, achievedAt: bestSplit.startedAt });
    }

    return result;
  }, [allTimeSessions]);

  const paceTrendLabel = useMemo(() => {
    if (paceTrend.length < 3) return '';
    const recent = paceTrend.slice(-3);
    const first = recent[0].y;
    const last = recent[recent.length - 1].y;
    const pctChange = (last - first) / first;
    if (pctChange < -0.03) return 'Getting Faster!';
    if (pctChange > 0.03) return 'Slowing Down';
    return 'Holding Steady';
  }, [paceTrend]);

  return {
    sessions,
    paceTrend,
    paceTrendLabel,
    distanceByWeek,
    frequencyByDay,
    personalBests,
    currentStreak,
    longestStreak,
    loading,
    error,
    reload: load,
  };
}
