import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Timestamp } from 'firebase/firestore';
import type { CardioSession, RoutePoint, Split, DistanceUnit, CardioSettings, HeartRatePoint } from '../types/cardio';
import { getSessionById, updateCardioSession } from '../services/cardioService';
import {
  haversineDistance,
  maxSpeedForActivity,
  rollingPace,
  calculateCalories,
  getHRZones,
  computeTimeInZones,
} from '../utils/cardio';
import { cacheSessionState, clearCachedSession, getCachedSession } from '../utils/cardioCache';
import { analytics, AnalyticsEvent } from '../services/analytics';

export function useCardioSession(
  sessionId: string,
  weightKg: number,
  settings: CardioSettings,
  distanceUnit: DistanceUnit
) {
  const [session, setSession] = useState<CardioSession | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [elapsedActive, setElapsedActive] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentPace, setCurrentPace] = useState(0);
  const [averagePace, setAveragePace] = useState(0);
  const [calories, setCalories] = useState(0);
  const [splits, setSplits] = useState<Split[]>([]);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [lapCount, setLapCount] = useState(0);
  const [newSplit, setNewSplit] = useState<Split | null>(null);

  const watcher = useRef<Location.LocationSubscription | null>(null);
  const pauseStartRef = useRef<number>(0);
  const totalPausedRef = useRef<number>(0);
  const activeStartRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<RoutePoint | null>(null);
  const splitDistRef = useRef<number>(0);
  const splitTimeRef = useRef<number>(0);
  const autoPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef = useRef<RoutePoint[]>([]);
  const distanceRef = useRef<number>(0);
  const elapsedActiveRef = useRef<number>(0);
  const splitsRef = useRef<Split[]>([]);
  const elevationGainRef = useRef<number>(0);
  const elevationLossRef = useRef<number>(0);
  const lapCountRef = useRef<number>(0);
  const caloriesRef = useRef<number>(0);
  const sessionRef = useRef<CardioSession | null>(null);
  // HR data — downsampled to 1 point per 5s (Ray condition: Firestore doc size)
  const hrDataRef = useRef<HeartRatePoint[]>([]);
  const hrLastTimestampRef = useRef<number>(0);
  const avgHeartRateRef = useRef<number>(0);
  const maxHeartRateRef = useRef<number>(0);
  // Refs for params that change between renders but are read inside stable callbacks
  const weightKgRef = useRef<number>(weightKg);
  const settingsRef = useRef<CardioSettings>(settings);
  const splitDistanceMRef = useRef<number>(distanceUnit === 'mi' ? 1609.344 : 1000);

  // Keep param refs in sync
  useEffect(() => { weightKgRef.current = weightKg; }, [weightKg]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => {
    splitDistanceMRef.current = distanceUnit === 'mi' ? 1609.344 : 1000;
  }, [distanceUnit]);

  // Load session from Firestore on mount, then check cache for recovery
  useEffect(() => {
    (async () => {
      const cached = await getCachedSession();
      const result = await getSessionById(sessionId);
      if (result.data) {
        sessionRef.current = result.data;
        setSession(result.data);

        if (cached && cached.sessionId === sessionId) {
          routeRef.current = cached.route;
          distanceRef.current = cached.distance;
          elapsedActiveRef.current = cached.elapsedActive;
          totalPausedRef.current = cached.totalPausedTime;
          splitsRef.current = cached.splits;
          lapCountRef.current = cached.lapCount;
          elevationGainRef.current = cached.elevationGain;
          elevationLossRef.current = cached.elevationLoss;

          setRoute(cached.route);
          setDistance(cached.distance);
          setElapsedActive(cached.elapsedActive);
          setSplits(cached.splits);
          setLapCount(cached.lapCount);
          setElevationGain(cached.elevationGain);
          setElevationLoss(cached.elevationLoss);
        }
      }
    })();

    return () => {
      stopWatcher();
      if (timerRef.current) clearInterval(timerRef.current);
      if (cacheTimerRef.current) clearInterval(cacheTimerRef.current);
    };
  }, [sessionId]);

  const stopWatcher = useCallback(() => {
    if (watcher.current) {
      watcher.current.remove();
      watcher.current = null;
    }
    if (autoPauseTimerRef.current) {
      clearTimeout(autoPauseTimerRef.current);
      autoPauseTimerRef.current = null;
    }
  }, []);

  const addRoutePoint = useCallback((point: RoutePoint) => {
    const sess = sessionRef.current;
    if (!sess) return;

    // GPS drift filter
    if (point.accuracy !== null && point.accuracy > 50) return;
    if (point.speed !== null && point.speed > maxSpeedForActivity(sess.activityType)) return;

    const last = lastPointRef.current;
    if (last) {
      const dist = haversineDistance(last.latitude, last.longitude, point.latitude, point.longitude);
      if (dist < 1) return; // ignore < 1m jitter

      distanceRef.current += dist;
      splitDistRef.current += dist;

      // Elevation
      if (last.altitude !== null && point.altitude !== null) {
        const diff = point.altitude - last.altitude;
        if (diff > 0) {
          elevationGainRef.current += diff;
          setElevationGain(elevationGainRef.current);
        } else {
          elevationLossRef.current += Math.abs(diff);
          setElevationLoss(elevationLossRef.current);
        }
      }

      // Split check — distance threshold respects user's unit preference
      if (splitDistRef.current >= splitDistanceMRef.current) {
        const splitTime = elapsedActiveRef.current - splitTimeRef.current;
        const pace = splitTime > 0 ? (splitTime / splitDistRef.current) * 1000 : 0;
        const elevChange = elevationGainRef.current - splitsRef.current.reduce((s, sp) => s + sp.elevationChange, 0);
        const split: Split = {
          splitNumber: splitsRef.current.length + 1,
          distance: splitDistRef.current,
          time: splitTime,
          pace,
          elevationChange: elevChange,
        };
        splitsRef.current = [...splitsRef.current, split];
        setSplits([...splitsRef.current]);
        setNewSplit(split);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        splitDistRef.current = 0;
        splitTimeRef.current = elapsedActiveRef.current;
        setTimeout(() => setNewSplit(null), 3000);
      }
    }

    lastPointRef.current = point;
    routeRef.current = [...routeRef.current, point];
    setRoute([...routeRef.current]);
    setDistance(distanceRef.current);

    // Rolling pace
    const roll = rollingPace(routeRef.current);
    setCurrentPace(roll);

    // Average pace
    if (elapsedActiveRef.current > 0 && distanceRef.current > 0) {
      const avg = (elapsedActiveRef.current / distanceRef.current) * 1000;
      setAveragePace(avg);
    }

    // Calories — use weightKg ref so value is always current
    const cal = calculateCalories(sess.activityType, weightKgRef.current, elapsedActiveRef.current / 3600);
    caloriesRef.current = cal;
    setCalories(cal);

    // Auto-pause: respect user settings, not hardcoded logic
    if (autoPauseTimerRef.current) clearTimeout(autoPauseTimerRef.current);
    if (point.speed !== null && point.speed < 0.22) {
      autoPauseTimerRef.current = setTimeout(() => {
        const currentSess = sessionRef.current;
        const currentSettings = settingsRef.current;
        if (!currentSess || currentSess.indoorMode) return;
        const shouldAutoPause =
          (currentSess.activityType === 'run' && currentSettings.autoPauseRun) ||
          (currentSess.activityType === 'cycle' && currentSettings.autoPauseCycle);
        if (shouldAutoPause) {
          pause();
        }
      }, 10000);
    }
  }, []);

  const startTimer = useCallback(() => {
    activeStartRef.current = Date.now() - elapsedActiveRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeStartRef.current) / 1000);
      elapsedActiveRef.current = elapsed;
      setElapsedActive(elapsed);
    }, 1000);
  }, []);

  const startCacheTimer = useCallback(() => {
    if (cacheTimerRef.current) return; // already running
    cacheTimerRef.current = setInterval(() => {
      cacheSessionState({
        sessionId,
        route: routeRef.current,
        distance: distanceRef.current,
        elapsedActive: elapsedActiveRef.current,
        totalPausedTime: totalPausedRef.current,
        splits: splitsRef.current,
        lapCount: lapCountRef.current,
        elevationGain: elevationGainRef.current,
        elevationLoss: elevationLossRef.current,
        lastSavedAt: Date.now(),
      });
    }, 30000);
  }, [sessionId]);

  const stopCacheTimer = useCallback(() => {
    if (cacheTimerRef.current) {
      clearInterval(cacheTimerRef.current);
      cacheTimerRef.current = null;
    }
  }, []);

  const startWatcher = useCallback(async () => {
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 1000,
      },
      (loc) => {
        const point: RoutePoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude,
          timestamp: loc.timestamp,
          speed: loc.coords.speed,
          accuracy: loc.coords.accuracy,
        };
        addRoutePoint(point);
      }
    );
    watcher.current = sub;
  }, [addRoutePoint]);

  const start = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('active');
    startTimer();
    const sess = sessionRef.current;
    if (sess && !sess.indoorMode) {
      await startWatcher();
    }
    startCacheTimer();
    analytics.track(AnalyticsEvent.CARDIO_SESSION_STARTED, {
      activity_type: sessionRef.current?.activityType ?? 'unknown',
      indoor_mode: sessionRef.current?.indoorMode ? 1 : 0,
    });
  }, [startTimer, startWatcher, startCacheTimer]);

  const pause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus('paused');
    pauseStartRef.current = Date.now();
    stopWatcher();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Leave cache timer running during pause so in-progress data is preserved
  }, [stopWatcher]);

  const resume = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const paused = (Date.now() - pauseStartRef.current) / 1000;
    totalPausedRef.current += paused;
    setStatus('active');
    startTimer();
    const sess = sessionRef.current;
    if (sess && !sess.indoorMode) {
      await startWatcher();
    }
    // Restart cache timer in case it was somehow cleared during pause
    startCacheTimer();
  }, [startTimer, startWatcher, startCacheTimer]);

  const stop = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopWatcher();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopCacheTimer();

    const finalDistance = distanceRef.current;
    const finalElapsed = elapsedActiveRef.current;
    const finalPace = finalElapsed > 0 && finalDistance > 0
      ? (finalElapsed / finalDistance) * 1000
      : 0;

    // Build HR fields if monitor was used
    const hrData = hrDataRef.current;
    const hasHR = hrData.length > 0;
    const maxHR = settingsRef.current.maxHeartRate ?? 180;
    const zones = hasHR ? getHRZones(maxHR) : [];
    const timeInZones = hasHR ? computeTimeInZones(hrData, zones, maxHR) : undefined;

    await updateCardioSession(sessionId, {
      status: 'completed',
      endedAt: Timestamp.now(),
      route: routeRef.current,
      distance: finalDistance,
      duration: finalElapsed,
      totalPausedTime: totalPausedRef.current,
      averagePace: finalPace,
      splits: splitsRef.current,
      calories: caloriesRef.current,
      elevationGain: elevationGainRef.current,
      elevationLoss: elevationLossRef.current,
      lapCount: lapCountRef.current,
      ...(hasHR && {
        avgHeartRate: avgHeartRateRef.current,
        maxHeartRate: maxHeartRateRef.current,
        heartRateData: hrData,
        timeInZones,
      }),
    });

    await clearCachedSession();
    analytics.track(AnalyticsEvent.CARDIO_SESSION_COMPLETED, {
      activity_type: sessionRef.current?.activityType ?? 'unknown',
      duration_minutes: Math.round(finalElapsed / 60),
      distance_m: Math.round(finalDistance),
    });
  }, [stopWatcher, stopCacheTimer, sessionId]);

  const addLap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lapCountRef.current += 1;
    setLapCount(lapCountRef.current);

    const sess = sessionRef.current;
    if (!sess || !sess.poolLength) return;

    let lapMeters = 0;
    if (sess.poolLength === '25m') lapMeters = 25;
    else if (sess.poolLength === '50m') lapMeters = 50;
    else if (sess.poolLength === '25yd') lapMeters = 22.86;
    else if (sess.poolLength === '50yd') lapMeters = 45.72;
    else if (sess.poolLength === 'custom') lapMeters = sess.poolLengthCustomM ?? 25;

    distanceRef.current += lapMeters;
    setDistance(distanceRef.current);
  }, []);

  /** Called by active-session when HR monitor delivers a BPM reading.
   *  Downsamples to 1 point per 5 seconds to keep Firestore doc size bounded.
   */
  const addHeartRatePoint = useCallback((bpm: number, timestamp: number) => {
    if (bpm <= 0 || bpm > 300) return;
    const SAMPLE_INTERVAL_MS = 5000;
    if (timestamp - hrLastTimestampRef.current < SAMPLE_INTERVAL_MS) return;

    hrLastTimestampRef.current = timestamp;
    hrDataRef.current.push({ timestamp, bpm });

    // Update rolling average and max
    const data = hrDataRef.current;
    const sum = data.reduce((s, p) => s + p.bpm, 0);
    avgHeartRateRef.current = Math.round(sum / data.length);
    if (bpm > maxHeartRateRef.current) maxHeartRateRef.current = bpm;
  }, []);

  const abandon = useCallback(async () => {
    stopWatcher();
    if (timerRef.current) clearInterval(timerRef.current);
    stopCacheTimer();
    await updateCardioSession(sessionId, {
      status: 'abandoned',
      endedAt: Timestamp.now(),
    });
    await clearCachedSession();
  }, [stopWatcher, stopCacheTimer, sessionId]);

  return {
    session,
    route,
    status,
    elapsedActive,
    distance,
    currentPace,
    averagePace,
    calories,
    splits,
    elevationGain,
    elevationLoss,
    lapCount,
    newSplit,
    start,
    pause,
    resume,
    stop,
    addLap,
    abandon,
    addHeartRatePoint,
  };
}
