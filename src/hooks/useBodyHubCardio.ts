/**
 * Data hook for the Body Hub cardio layer.
 *
 * Fetches cardio sessions, weekly summary, resting HR, and gym leg sets
 * then computes HeartData, LungData, LegData, and regionColors for leg regions.
 */
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getRecentSessions as getRecentCardioSessions,
  getThisWeekCardioSummary,
} from '../services/cardioService';
import { fetchRestingHeartRate } from '../services/healthKitService';
import { getRecentSessions as getRecentGymSessions } from '../services/workoutSessionService';
import {
  CARDIO_FRONT_LEG_REGIONS,
  CARDIO_BACK_LEG_REGIONS,
} from '../constants/bodyHubPaths';
import { LAYER_COLORS } from '../types/bodyHub';
import type { BodyView, HeartData, LungData, LegData } from '../types/bodyHub';
import type { MuscleGroup } from '../types/exercise';

// ─── Named Constants ─────────────────────────────────────────────────────────

/** Muscle groups that qualify as leg-targeting for cross-module mileage logic. */
const LEG_MUSCLE_GROUPS: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];

/** Weekly mileage threshold above which a cross-module fatigue warning is shown. */
const CROSS_MODULE_MILEAGE_THRESHOLD = 15;

/** WHO recommended weekly aerobic minutes — used in effort score formula. */
const WHO_WEEKLY_AEROBIC_MINUTES = 150;

/** Cardio organ/region IDs used by body-hub.tsx to identify tapped regions. */
export const CARDIO_REGION_IDS = {
  heart: 'heart',
  leftLung: 'leftLung',
  rightLung: 'rightLung',
  legs: 'legs',
} as const;

export type CardioRegionId = (typeof CARDIO_REGION_IDS)[keyof typeof CARDIO_REGION_IDS];

// ─── Return Type ─────────────────────────────────────────────────────────────

type UseBodyHubCardioResult = {
  heartData: HeartData | null;
  lungData: LungData | null;
  legData: LegData | null;
  /** Leg region colors keyed by region ID (e.g. leftQuad → cardio blue fill) */
  regionColors: Record<string, { fill: string; fillOpacity: number }>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METERS_PER_MILE = 1609.344;

function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/** Map 0–100 mileage intensity to a fill opacity between 0.25 and 0.80. */
function mileageToOpacity(miles: number): number {
  if (miles <= 0) return 0;
  const clamped = Math.min(miles, CROSS_MODULE_MILEAGE_THRESHOLD);
  const ratio = clamped / CROSS_MODULE_MILEAGE_THRESHOLD;
  return 0.25 + ratio * 0.55;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBodyHubCardio(view: BodyView, enabled = true): UseBodyHubCardioResult {
  const [heartData, setHeartData] = useState<HeartData | null>(null);
  const [lungData, setLungData] = useState<LungData | null>(null);
  const [legData, setLegData] = useState<LegData | null>(null);
  const [regionColors, setRegionColors] = useState<Record<string, { fill: string; fillOpacity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().slice(0, 10);

      // Run all fetches in parallel
      const [cardioResult, summaryResult, restingBpm, gymResult] = await Promise.all([
        getRecentCardioSessions(20),
        getThisWeekCardioSummary(),
        fetchRestingHeartRate(today),
        getRecentGymSessions(20),
      ]);

      const cardioSessions = cardioResult.data ?? [];
      const weeklySummary = summaryResult.data;
      const gymSessions = gymResult.data ?? [];

      // ── HeartData ──────────────────────────────────────────────────────────

      // bpmHistory: up to 7 unique dates with an avgHeartRate
      const bpmByDate: Record<string, number[]> = {};
      for (const s of cardioSessions) {
        if (s.avgHeartRate && s.avgHeartRate > 0) {
          const dateKey = s.startedAt.toDate().toISOString().slice(0, 10);
          if (!bpmByDate[dateKey]) bpmByDate[dateKey] = [];
          bpmByDate[dateKey].push(s.avgHeartRate);
        }
      }
      const bpmHistory = Object.entries(bpmByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, values]) => ({
          date,
          value: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
        }));

      // hrZones: aggregate timeInZones across sessions — Ray note #1: handle missing
      const zoneMinutesMap: Record<number, { label: string; minutes: number; color: string }> = {};
      for (const s of cardioSessions) {
        if (!s.timeInZones) continue; // guard: optional field
        for (const tz of s.timeInZones) {
          if (!zoneMinutesMap[tz.zone]) {
            zoneMinutesMap[tz.zone] = { label: tz.name, minutes: 0, color: tz.color };
          }
          zoneMinutesMap[tz.zone].minutes += Math.round(tz.seconds / 60);
        }
      }
      const hrZones = Object.entries(zoneMinutesMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([zone, data]) => ({ zone: Number(zone), ...data }));

      // lastSession: most recent completed cardio session
      const lastCardioSession = cardioSessions[0] ?? null;
      const lastSession = lastCardioSession
        ? {
            type: lastCardioSession.activityType,
            duration: lastCardioSession.duration,
            distance: lastCardioSession.distance,
            date: lastCardioSession.startedAt.toDate().toISOString().slice(0, 10),
          }
        : null;

      setHeartData({
        restingBpm,
        bpmHistory,
        hrZones,
        vo2max: null, // no fetchVO2Max available per spec
        lastSession,
      });

      // ── LungData ───────────────────────────────────────────────────────────

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

      const thisWeekSessions = cardioSessions.filter((s) => {
        const d = s.startedAt.toDate();
        return d >= sevenDaysAgo && d <= now;
      });
      const lastWeekSessions = cardioSessions.filter((s) => {
        const d = s.startedAt.toDate();
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
      });

      const weeklyCardioMinutes = weeklySummary
        ? Math.round(weeklySummary.totalDurationSecs / 60)
        : Math.round(thisWeekSessions.reduce((sum, s) => sum + s.duration, 0) / 60);

      const weeklyDistanceM = weeklySummary
        ? weeklySummary.totalDistanceM
        : thisWeekSessions.reduce((sum, s) => sum + s.distance, 0);

      const lastWeekMinutes = Math.round(
        lastWeekSessions.reduce((sum, s) => sum + s.duration, 0) / 60
      );
      const lastWeekDistance = metersToMiles(
        lastWeekSessions.reduce((sum, s) => sum + s.distance, 0)
      );

      // effortScore: ratio to WHO_WEEKLY_AEROBIC_MINUTES, capped 0–100
      const effortScore = Math.min(
        100,
        Math.round((weeklyCardioMinutes / WHO_WEEKLY_AEROBIC_MINUTES) * 100)
      );

      setLungData({
        weeklyCardioMinutes,
        weeklyDistance: metersToMiles(weeklyDistanceM),
        lastWeekMinutes,
        lastWeekDistance,
        effortScore,
      });

      // ── LegData ────────────────────────────────────────────────────────────

      const weeklyMileage = metersToMiles(
        thisWeekSessions.reduce((sum, s) => sum + s.distance, 0)
      );

      // Activity breakdown by type
      const byType: Record<string, number> = {};
      for (const s of thisWeekSessions) {
        if (!byType[s.activityType]) byType[s.activityType] = 0;
        byType[s.activityType] += metersToMiles(s.distance);
      }
      const activityBreakdown = Object.entries(byType).map(([type, miles]) => ({
        type,
        miles: Math.round(miles * 10) / 10,
      }));

      const weeklyCalories = thisWeekSessions.reduce((sum, s) => sum + (s.calories ?? 0), 0);

      // Gym leg sets: count completed sets for leg muscle groups this week
      let gymLegSets = 0;
      for (const session of gymSessions) {
        const sessionDate = session.startedAt.toDate();
        if (sessionDate < sevenDaysAgo || sessionDate > now) continue;
        for (const exercise of session.exercises) {
          if (LEG_MUSCLE_GROUPS.includes(exercise.primaryMuscle)) {
            gymLegSets += exercise.sets.filter((set) => set.completed).length;
          }
        }
      }

      // Cross-module warning: high mileage AND gym leg work this week
      const crossModuleWarning =
        weeklyMileage >= CROSS_MODULE_MILEAGE_THRESHOLD && gymLegSets > 0;

      setLegData({
        weeklyMileage: Math.round(weeklyMileage * 10) / 10,
        activityBreakdown,
        averagePaceTrend: [], // requires multi-week history beyond 20 sessions; no-op for now
        weeklyCalories,
        gymLegSets,
        crossModuleWarning,
      });

      // ── Region Colors (leg fills) ──────────────────────────────────────────

      const fillOpacity = mileageToOpacity(weeklyMileage);

      if (weeklyMileage > 0) {
        const allLegRegions = [
          ...CARDIO_FRONT_LEG_REGIONS,
          ...CARDIO_BACK_LEG_REGIONS,
        ];
        const colors: Record<string, { fill: string; fillOpacity: number }> = {};
        for (const regionId of allLegRegions) {
          colors[regionId] = { fill: LAYER_COLORS.cardio, fillOpacity };
        }
        setRegionColors(colors);
      } else {
        setRegionColors({});
      }
    } catch (err) {
      setError('Failed to load cardio data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        fetchedRef.current = false;
        fetchData().then(() => {
          fetchedRef.current = true;
        });
      }
    }, [enabled, fetchData])
  );

  return {
    heartData,
    lungData,
    legData,
    regionColors,
    loading,
    error,
    refresh: fetchData,
  };
}
