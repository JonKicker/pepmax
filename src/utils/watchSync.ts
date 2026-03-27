/**
 * Watch sync utilities — fire-and-forget helpers that push app state
 * to the Apple Watch via updateApplicationContext.
 *
 * Every function guards with isWatchConnectivityAvailable() and never throws.
 * Callers import and call after data loads — no await needed.
 */
import { updateWatchState, sendToWatch, isWatchConnectivityAvailable } from '../services/watchConnectivity';
import { createCardioSession } from '../services/cardioService';
import { addDose } from '../services/peptideService';
import { Timestamp, increment, arrayUnion } from 'firebase/firestore';
import { orderBy, limit, where } from 'firebase/firestore';
import { analytics, AnalyticsEvent } from '../services/analytics';
import { awardXP } from '../services/gamificationService';
import { decrementInventoryOnDose } from '../services/inventoryService';
import { getTodayRecoveryScore } from '../services/recoveryScoreService';
import { mergeDocument, queryDocuments, COLLECTIONS } from '../services/firebase/firestore';
import { toLocalDateKey } from './nutrition';
import { DEFAULT_WATER_GOAL_OZ } from '../types/water';
import type { FoodLogEntry } from '../types/nutrition';
import type { WorkoutSession } from '../types/workout';
import type { ActivityType, RoutePoint, Split, HeartRatePoint, TimeInZone } from '../types/cardio';
import type { InjectionSite } from '../types/peptide';
import type { RecoveryScoreDoc } from '../types/recoveryScore';

// ─── Premium flag (set by PremiumContext) ───────────────────────────────────

let _isPremium = false;
export function setWatchSyncPremiumStatus(premium: boolean): void {
  _isPremium = premium;
}

/**
 * Push today's nutrition totals + targets to the watch.
 * Called after the nutrition screen loads or the user logs food.
 * Fire-and-forget — never awaited, never throws.
 */
export function pushNutritionToWatch(
  entries: FoodLogEntry[],
  targets: { calories: number; protein: number; carbs: number; fat: number },
  water?: { waterOz?: number; waterGoalOz?: number; hydrationIntervalHours?: number }
): void {
  if (!isWatchConnectivityAvailable()) return;

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  updateWatchState({
    type: 'NUTRITION',
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    calorieTarget: targets.calories,
    proteinTarget: targets.protein,
    carbsTarget: targets.carbs,
    fatTarget: targets.fat,
    waterOz: water?.waterOz ?? null,
    waterGoalOz: water?.waterGoalOz ?? null,
    hydrationIntervalHours: water?.hydrationIntervalHours ?? null,
    isPremium: _isPremium,
    updatedAt: Date.now(),
  }).catch(() => {}); // fire-and-forget
}

/**
 * Push cardio settings and weekly stats to the watch.
 * Uses updateApplicationContext (background) — latest-only.
 * Called after cardio history loads or user changes cardio settings.
 * Fire-and-forget — never awaited, never throws.
 */
export function pushCardioSettingsToWatch(
  weeklyDistanceMiles: number,
  weeklyGoalMiles: number,
  lastActivitySummary: string,
  maxHeartRate?: number,
  distanceUnit?: string,
  autoPauseEnabled?: boolean,
): void {
  if (!isWatchConnectivityAvailable()) return;

  updateWatchState({
    type: 'CARDIO',
    weeklyDistanceMiles,
    weeklyGoalMiles,
    lastActivitySummary,
    maxHeartRate: maxHeartRate ?? null,
    distanceUnit: distanceUnit ?? 'mi',
    autoPauseEnabled: autoPauseEnabled ?? true,
    isPremium: _isPremium,
    updatedAt: Date.now(),
  }).catch(() => {}); // fire-and-forget
}

/**
 * Handle a CARDIO_SESSION_COMPLETE message from the watch.
 * The watch ran an independent GPS cardio session and is sending the full result.
 * Validates required fields, then writes to Firestore using the existing cardio service.
 *
 * Called from the app's root watch message listener.
 */
export async function handleWatchCardioSessionComplete(
  payload: Record<string, unknown>
): Promise<void> {
  // Validate required fields at system boundary
  if (
    typeof payload.activityType !== 'string' ||
    typeof payload.startedAt !== 'number' ||
    typeof payload.endedAt !== 'number' ||
    typeof payload.distance !== 'number' ||
    typeof payload.duration !== 'number'
  ) {
    return;
  }

  const route: RoutePoint[] = Array.isArray(payload.route)
    ? (payload.route as Record<string, unknown>[]).filter(
        (p) =>
          typeof p.latitude === 'number' &&
          typeof p.longitude === 'number' &&
          typeof p.timestamp === 'number'
      ).map((p) => ({
        latitude: p.latitude as number,
        longitude: p.longitude as number,
        altitude: typeof p.altitude === 'number' ? p.altitude : null,
        timestamp: p.timestamp as number,
        speed: typeof p.speed === 'number' ? p.speed : null,
        accuracy: typeof p.accuracy === 'number' ? p.accuracy : null,
      }))
    : [];

  const splits: Split[] = Array.isArray(payload.splits)
    ? (payload.splits as Record<string, unknown>[]).filter(
        (s) => typeof s.splitNumber === 'number' && typeof s.pace === 'number'
      ).map((s) => ({
        splitNumber: s.splitNumber as number,
        distance: (s.distance as number) ?? 0,
        time: (s.time as number) ?? 0,
        pace: s.pace as number,
        elevationChange: (s.elevationChange as number) ?? 0,
      }))
    : [];

  const hasHR =
    typeof payload.avgHeartRate === 'number' &&
    Array.isArray(payload.heartRateData) &&
    (payload.heartRateData as unknown[]).length > 0;

  const heartRateData: HeartRatePoint[] | undefined = hasHR
    ? (payload.heartRateData as Record<string, unknown>[])
        .filter(
          (h) => typeof h.timestamp === 'number' && typeof h.bpm === 'number'
        )
        .map((h) => ({
          timestamp: h.timestamp as number,
          bpm: h.bpm as number,
        }))
    : undefined;

  const timeInZones: TimeInZone[] | undefined = hasHR && Array.isArray(payload.timeInZones)
    ? (payload.timeInZones as Record<string, unknown>[]).map((z) => ({
        zone: z.zone as number,
        name: z.name as string,
        seconds: z.seconds as number,
        color: z.color as string,
      }))
    : undefined;

  // Map watch activity types to phone ActivityType union.
  // Watch adds 'hike' and 'custom' which don't exist on the phone type.
  const validPhoneTypes: ActivityType[] = ['run', 'cycle', 'walk', 'swim'];
  const rawType = payload.activityType as string;
  const mappedActivityType: ActivityType =
    rawType === 'hike' ? 'walk' :
    rawType === 'custom' ? 'run' :
    (validPhoneTypes.includes(rawType as ActivityType) ? rawType as ActivityType : 'run');

  await createCardioSession({
    activityType: mappedActivityType,
    startedAt: Timestamp.fromMillis(payload.startedAt as number),
    endedAt: Timestamp.fromMillis(payload.endedAt as number),
    status: 'completed',
    route,
    distance: payload.distance as number,
    duration: payload.duration as number,
    totalPausedTime: (payload.totalPausedTime as number) ?? 0,
    averagePace: (payload.averagePace as number) ?? 0,
    splits,
    calories: (payload.calories as number) ?? 0,
    elevationGain: (payload.elevationGain as number) ?? 0,
    elevationLoss: (payload.elevationLoss as number) ?? 0,
    goals: null,
    indoorMode: (payload.indoorMode as boolean) ?? false,
    notes: '',
    lapCount: null,
    poolLength: null,
    poolLengthCustomM: null,
    source: 'watch',
    ...(hasHR && {
      avgHeartRate: payload.avgHeartRate as number,
      maxHeartRate: (payload.maxHeartRate as number) ?? undefined,
      heartRateData,
      timeInZones,
    }),
  });
}

/**
 * Push an active workout plan to the watch when a session starts on the phone.
 * Uses the real-time sendToWatch channel so the watch can begin logging immediately.
 * Fire-and-forget — never awaited, never throws.
 *
 * The watch parses this as type "ACTIVE_WORKOUT" and starts WatchWorkoutManager.
 */
export function pushActiveWorkoutToWatch(
  session: WorkoutSession,
  templateTargetReps?: number[], // per-exercise reps from template (parallel to exercises array)
): void {
  if (!isWatchConnectivityAvailable()) return;

  const exercises = session.exercises.map((ex, i) => ({
    name: ex.exerciseName,
    targetSets: ex.sets.length,
    targetReps: templateTargetReps?.[i] ?? ex.sets[0]?.reps ?? 0,
    targetWeight: ex.sets[0]?.weight ?? 0,
    restSeconds: ex.restSeconds ?? 90,
    logged: [],
  }));

  sendToWatch('WORKOUT_UPDATE', {
    contextType: 'ACTIVE_WORKOUT',
    type: 'ACTIVE_WORKOUT',
    sessionId: session.id,
    exercises,
    startTime: Date.now(),
    isPremium: _isPremium,
  }).catch(() => {}); // fire-and-forget
}

/**
 * Push current peptide state to the watch.
 * Called after peptide screen loads (useFocusEffect) or after a dose is logged.
 * Fire-and-forget — never awaited, never throws.
 */
export function pushPeptideToWatch(
  peptide: { id: string; name: string; defaultDose: number; unit: string },
  lastDose: { site: string; timestamp: Date } | null,
  suggestedNextSite: string,
  daysUntilResupply: number,
  recentSites: string[],
  scheduledDoseTimes: number[],
): void {
  if (!isWatchConnectivityAvailable()) return;

  updateWatchState({
    type: 'PEPTIDE',
    compoundName: peptide.name,
    doseAmount: String(peptide.defaultDose),
    unit: peptide.unit,
    peptideId: peptide.id,
    nextDoseTime: scheduledDoseTimes.length > 0 ? scheduledDoseTimes[0] : null,
    lastInjectionSite: lastDose?.site ?? '',
    suggestedNextSite,
    daysUntilResupply,
    recentSites,
    scheduledDoseTimes,
    isPremium: _isPremium,
    updatedAt: Date.now(),
  }).catch(() => {}); // fire-and-forget
}

/**
 * Handle a PEPTIDE_DOSE_LOGGED message from the watch.
 * Validates all fields, writes the dose to Firestore, awards XP and analytics.
 * Fire-and-forget side-effects (analytics, XP, inventory) never block the write.
 *
 * Called from the app's root watch message listener.
 */
export async function handleWatchPeptideDoseLogged(
  payload: Record<string, unknown>
): Promise<void> {
  // Validate required fields at system boundary
  if (
    typeof payload.peptideId !== 'string' ||
    typeof payload.peptideName !== 'string' ||
    typeof payload.amount !== 'number' ||
    payload.amount <= 0 ||
    payload.amount > 10000 ||
    typeof payload.unit !== 'string' ||
    typeof payload.site !== 'string' ||
    typeof payload.timestamp !== 'number'
  ) {
    return;
  }

  // Map watch site string to phone InjectionSite type (fallback 'other')
  const validSites: InjectionSite[] = [
    'leftDelt', 'rightDelt', 'leftGlute', 'rightGlute',
    'leftQuad', 'rightQuad', 'abdomenLeft', 'abdomenRight', 'other',
  ];
  const rawSite = payload.site as string;
  const mappedSite: InjectionSite = validSites.includes(rawSite as InjectionSite)
    ? (rawSite as InjectionSite)
    : 'other';

  await addDose({
    peptideId: payload.peptideId as string,
    peptideName: payload.peptideName as string,
    amount: payload.amount as number,
    unit: payload.unit as 'mg' | 'mcg' | 'IU',
    site: mappedSite,
    timestamp: Timestamp.fromMillis(payload.timestamp as number),
    mood: 3,
    notes: '',
    source: 'watch',
  });

  // Fire-and-forget side effects — never block the write above
  analytics.track(AnalyticsEvent.WATCH_DOSE_LOGGED, {
    peptide_name: payload.peptideName as string,
    method: 'watch',
  });
  awardXP(15, 'log_dose', 'peptides').catch(() => {});
  decrementInventoryOnDose(
    payload.peptideId as string,
    payload.amount as number,
    payload.unit as string,
  ).catch(() => {});
}

/**
 * Push today's recovery readiness data to the watch, including 7-day HR/HRV trends.
 * Called from morning check-in completion and on app foreground.
 * Never throws.
 */
export async function pushReadinessToWatch(): Promise<void> {
  if (!isWatchConnectivityAvailable()) return;

  const todayResult = await getTodayRecoveryScore();
  if (todayResult.error || !todayResult.data) return;
  const doc = todayResult.data;

  // Compute trends from 7-day history (full docs for HR/HRV values)
  let hrTrend = 'stable';
  let hrvTrend = 'stable';

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateKey = toLocalDateKey(startDate);

    const historyResult = await queryDocuments<RecoveryScoreDoc>(COLLECTIONS.RECOVERY_LOG, [
      where('date', '>=', startDateKey),
      orderBy('date', 'desc'),
      limit(7),
    ]);

    const history = historyResult.data ?? [];

    if (history.length >= 3) {
      // history[0] is today — compare today against prior days (indices 1–3)
      const prior = history.slice(1, 4);
      const rhrValues = prior.map(h => h.restingHR).filter((v): v is number => v != null && v > 0);
      const hrvValues = prior.map(h => h.hrv).filter((v): v is number => v != null && v > 0);
      const avgRHR = rhrValues.length > 0 ? rhrValues.reduce((s, v) => s + v, 0) / rhrValues.length : 0;
      const avgHRV = hrvValues.length > 0 ? hrvValues.reduce((s, v) => s + v, 0) / hrvValues.length : 0;

      if (doc.restingHR && avgRHR > 0) {
        const rhrDelta = (doc.restingHR - avgRHR) / avgRHR;
        hrTrend = rhrDelta > 0.05 ? 'up' : rhrDelta < -0.05 ? 'down' : 'stable';
      }
      if (doc.hrv && avgHRV > 0) {
        const hrvDelta = (doc.hrv - avgHRV) / avgHRV;
        hrvTrend = hrvDelta > 0.05 ? 'up' : hrvDelta < -0.05 ? 'down' : 'stable';
      }
    }
  } catch {
    // Non-fatal — keep defaults of 'stable'
  }

  const loadScore = doc.subScores?.trainingLoad ?? 70;
  const trainingLoadLabel = loadScore < 40 ? 'heavy' : loadScore <= 70 ? 'moderate' : 'light';

  updateWatchState({
    type: 'READINESS',
    score: doc.recoveryScore,
    sleepHours: doc.sleepHours ?? 0,
    restingHR: doc.restingHR ?? 0,
    hrvMs: doc.hrv ?? 0,
    recommendation: (doc.recommendations ?? [])[0] ?? '',
    sleepQuality: doc.sleepQuality ?? null,
    hrTrend,
    hrvTrend,
    trainingLoadLabel,
    isPremium: _isPremium,
    updatedAt: Date.now(),
  }).catch(() => {}); // fire-and-forget
}

/**
 * Handle a WATER_LOGGED message from the watch.
 * Validates fields and merges today's water intake doc to Firestore.
 * Called from the app's root watch message listener.
 */
export async function handleWatchWaterLogged(
  payload: Record<string, unknown>
): Promise<void> {
  if (
    typeof payload.ozLogged !== 'number' ||
    payload.ozLogged <= 0 ||
    payload.ozLogged > 128 ||
    typeof payload.timestamp !== 'number'
  ) {
    return;
  }

  const today = toLocalDateKey(new Date()); // YYYY-MM-DD in local timezone
  const loggedAt = Timestamp.fromMillis(payload.timestamp as number);

  // Use FieldValue.increment() to avoid race conditions when phone and watch
  // log simultaneously. arrayUnion() appends the entry to the log array.
  const entry = {
    oz: payload.ozLogged as number,
    loggedAt,
    source: 'watch',
  };

  await mergeDocument(COLLECTIONS.WATER_LOG, today, {
    totalOz: increment(payload.ozLogged as number),
    entries: arrayUnion(entry),
    lastLoggedAt: loggedAt,
    // goalOz is only set on first write (merge won't overwrite an existing value).
    // Ensures docs created by the watch before the phone loads today have a valid goal.
    goalOz: DEFAULT_WATER_GOAL_OZ,
    source: 'watch',
  });
}
