import { useState, useEffect, useCallback } from 'react';
import { getSessionsInDateRange, detectNewPRs } from '../services/cardioService';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const start = rangeStartDate(timeRange);
    const end = new Date();
    const type = activityType === 'all' ? undefined : activityType;
    const result = await getSessionsInDateRange(start, end, type);
    if (result.error || !result.data) {
      setError(true);
    } else {
      setSessions(result.data);
    }
    setLoading(false);
  }, [activityType, timeRange]);

  useEffect(() => { load(); }, [load]);

  // Pace trend: avg pace per session over time
  const paceTrend: PaceTrendPoint[] = sessions
    .filter((s) => s.averagePace > 0)
    .map((s) => ({ x: s.startedAt.toDate(), y: s.averagePace }));

  // Distance by week
  const weekMap = new Map<string, number>();
  for (const s of sessions) {
    const wk = weekKeyFromDate(s.startedAt.toDate());
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + s.distance);
  }
  const distanceByWeek: DistanceWeekPoint[] = Array.from(weekMap.entries()).map(([wk, dist]) => ({
    x: wk,
    y: dist,
  }));

  // Frequency by day
  const dayMap = new Map<string, { count: number; activityType: ActivityType }>();
  for (const s of sessions) {
    const dk = dateKey(s.startedAt.toDate());
    const existing = dayMap.get(dk);
    dayMap.set(dk, {
      count: (existing?.count ?? 0) + 1,
      activityType: s.activityType, // last activity wins for color
    });
  }
  const frequencyByDay: FrequencyDay[] = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    count: v.count,
    activityType: v.activityType,
  }));

  // Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  if (frequencyByDay.length > 0) {
    const sorted = [...frequencyByDay].sort((a, b) => b.date.localeCompare(a.date));
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86400000));

    // Current streak: count back from today/yesterday
    if (sorted[0].date === today || sorted[0].date === yesterday) {
      let streak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date);
        const curr = new Date(sorted[i].date);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (Math.round(diff) === 1) {
          streak++;
        } else {
          break;
        }
      }
      currentStreak = streak;
    }

    // Longest streak
    const asc = [...frequencyByDay].sort((a, b) => a.date.localeCompare(b.date));
    let streak = 1;
    for (let i = 1; i < asc.length; i++) {
      const prev = new Date(asc[i - 1].date);
      const curr = new Date(asc[i].date);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (Math.round(diff) === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Personal bests (computed across all sessions for this activity type)
  const personalBests: CardioPR[] = [];
  if (sessions.length > 0) {
    // Pick the "best" session for each metric to show as the current PR
    const allForPRs = sessions;

    // Fastest avg pace
    const paced = allForPRs.filter((s) => s.averagePace > 0);
    if (paced.length > 0) {
      const best = paced.reduce((a, b) => a.averagePace < b.averagePace ? a : b);
      personalBests.push({ metric: 'fastestPace', activityType: best.activityType, value: best.averagePace, sessionId: best.id, achievedAt: best.startedAt });
    }

    // Longest distance
    const distBest = allForPRs.reduce((a, b) => a.distance > b.distance ? a : b);
    if (distBest.distance > 0) {
      personalBests.push({ metric: 'longestDistance', activityType: distBest.activityType, value: distBest.distance, sessionId: distBest.id, achievedAt: distBest.startedAt });
    }

    // Longest duration
    const durBest = allForPRs.reduce((a, b) => a.duration > b.duration ? a : b);
    if (durBest.duration > 0) {
      personalBests.push({ metric: 'longestDuration', activityType: durBest.activityType, value: durBest.duration, sessionId: durBest.id, achievedAt: durBest.startedAt });
    }

    // Most calories
    const calBest = allForPRs.reduce((a, b) => a.calories > b.calories ? a : b);
    if (calBest.calories > 0) {
      personalBests.push({ metric: 'mostCalories', activityType: calBest.activityType, value: calBest.calories, sessionId: calBest.id, achievedAt: calBest.startedAt });
    }

    // Most elevation
    const elevBest = allForPRs.reduce((a, b) => a.elevationGain > b.elevationGain ? a : b);
    if (elevBest.elevationGain > 0) {
      personalBests.push({ metric: 'mostElevation', activityType: elevBest.activityType, value: elevBest.elevationGain, sessionId: elevBest.id, achievedAt: elevBest.startedAt });
    }

    // Fastest single split
    const allSplits = allForPRs.flatMap((s) => s.splits.map((sp) => ({ ...sp, sessionId: s.id, activityType: s.activityType, startedAt: s.startedAt })));
    const validSplits = allSplits.filter((sp) => sp.pace > 0);
    if (validSplits.length > 0) {
      const bestSplit = validSplits.reduce((a, b) => a.pace < b.pace ? a : b);
      personalBests.push({ metric: 'fastestSplit', activityType: bestSplit.activityType, value: bestSplit.pace, sessionId: bestSplit.sessionId, achievedAt: bestSplit.startedAt });
    }
  }

  // Pace trend direction
  let paceTrendLabel = '';
  if (paceTrend.length >= 3) {
    const recent = paceTrend.slice(-3);
    const first = recent[0].y;
    const last = recent[recent.length - 1].y;
    const pctChange = (last - first) / first;
    if (pctChange < -0.03) paceTrendLabel = 'Getting Faster!';
    else if (pctChange > 0.03) paceTrendLabel = 'Slowing Down';
    else paceTrendLabel = 'Holding Steady';
  }

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
