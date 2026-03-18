/**
 * useWorkoutSession — live workout state management hook.
 *
 * Manages elapsed timer, set completion, auto-save, and session lifecycle.
 * Pattern mirrors useCardioSession: ref-based state for stale-closure
 * prevention, immediate Firestore writes on set completion, periodic
 * AsyncStorage cache for crash recovery.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createSession,
  updateSession,
  getSessionById,
} from '../services/workoutSessionService';
import { detectAndUpdatePRs } from '../services/personalRecordService';
import { getTemplateById } from '../services/templateService';
import { findExerciseById } from '../services/exerciseService';
import { exerciseLibrary } from '../data/exerciseLibrary';
import { setLastWeight } from '../utils/weightMemory';
import { consumePendingBareMinimum } from '../utils/sessionPreviewStore';
import type { Exercise } from '../types/exercise';
import type {
  WorkoutSession,
  SessionExercise,
  SessionSet,
} from '../types/workout';
import type { PRDetectionResult } from '../types/personalRecord';

const CACHE_KEY = '@active_workout_session';
const CACHE_INTERVAL_MS = 30_000;

export type WorkoutSessionHook = {
  session: WorkoutSession | null;
  elapsedSeconds: number;
  isLoading: boolean;
  error: string | null;
  startSession: (templateId?: string | null) => Promise<string | null>;
  resumeSession: (sessionId: string) => Promise<void>;
  completeSet: (
    exerciseIndex: number,
    setIndex: number,
    data: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number; rpe: number | null },
  ) => Promise<{ prResult: PRDetectionResult | null; isLastSet: boolean; exerciseName: string } | null>;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseIndex: number) => void;
  swapExercise: (exerciseIndex: number, newExercise: Exercise) => void;
  updateExerciseNotes: (exerciseIndex: number, notes: string) => void;
  finishWorkout: (notes: string, rating: number | null) => Promise<void>;
  abandonWorkout: () => Promise<void>;
};

export function useWorkoutSession(): WorkoutSessionHook {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<WorkoutSession | null>(null);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cacheTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const syncSession = useCallback((s: WorkoutSession | null) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  // ─── Timer management ──────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    startTimeRef.current = Date.now() - elapsedRef.current * 1000;
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      elapsedRef.current = secs;
      setElapsedSeconds(secs);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Cache management ──────────────────────────────────────────────────────

  const cacheSession = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          sessionId: sessionRef.current.id,
          elapsed: elapsedRef.current,
        }),
      );
    } catch {
      // Silent fail — cache is a convenience, not critical.
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Silent fail.
    }
  }, []);

  const startCacheTimer = useCallback(() => {
    if (cacheTimerRef.current) return;
    cacheTimerRef.current = setInterval(cacheSession, CACHE_INTERVAL_MS);
  }, [cacheSession]);

  const stopCacheTimer = useCallback(() => {
    if (cacheTimerRef.current) {
      clearInterval(cacheTimerRef.current);
      cacheTimerRef.current = null;
    }
  }, []);

  // ─── Firestore sync helper ────────────────────────────────────────────────

  const saveExercises = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    await updateSession(s.id, { exercises: s.exercises });
  }, []);

  // ─── Start a new session ──────────────────────────────────────────────────

  const startSessionFn = useCallback(
    async (templateId?: string | null): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      let exercises: SessionExercise[] = [];
      let templateName = 'Quick Workout';
      let bareMinimumData: { timeCap: number; originalTotalSets: number } | null = null;

      if (templateId) {
        const tplResult = await getTemplateById(templateId);
        if (tplResult.error || !tplResult.data) {
          setError('Failed to load template.');
          setIsLoading(false);
          return null;
        }
        const tpl = tplResult.data;
        templateName = tpl.name;

        // Check for pending bare minimum override, validating it belongs to this template
        const rawPending = consumePendingBareMinimum();
        const pending = rawPending?.templateId === templateId ? rawPending : null;
        const sourceExercises = pending ? pending.exercises : tpl.exercises;

        exercises = sourceExercises.map((te) => {
          const libExercise = findExerciseById(exerciseLibrary, te.exerciseId);
          return {
            exerciseId: te.exerciseId,
            exerciseName: te.exerciseName,
            primaryMuscle: libExercise?.primaryMuscles[0] ?? 'Chest',
            order: te.order,
            supersetGroup: te.supersetGroup ?? null,
            sets: Array.from({ length: te.targetSets }, (_, i) => ({
              setNumber: i + 1,
              weight: te.targetWeight ?? 0,
              weightUnit: 'lbs' as const,
              reps: 0,
              rpe: null,
              completed: false,
              completedAt: null,
              isPersonalRecord: false,
            })),
            notes: '',
            restSeconds: te.restSeconds ?? 90,
          };
        });

        if (pending) {
          bareMinimumData = { timeCap: pending.timeCap, originalTotalSets: pending.originalTotalSets };
        }
      }

      const input = {
        templateId: templateId ?? null,
        templateName,
        startedAt: Timestamp.now(),
        endedAt: null,
        status: 'active' as const,
        exercises,
        totalVolume: 0,
        totalSets: 0,
        duration: 0,
        notes: '',
        rating: null,
        isBareMinimum: bareMinimumData != null,
        ...(bareMinimumData && {
          bareMinimumTimeCap: bareMinimumData.timeCap,
          originalTotalSets: bareMinimumData.originalTotalSets,
        }),
      };

      const result = await createSession(input);
      if (result.error) {
        setError('Failed to create workout session.');
        setIsLoading(false);
        return null;
      }

      const newSession: WorkoutSession = { id: result.data!, ...input };
      syncSession(newSession);
      elapsedRef.current = 0;
      setElapsedSeconds(0);
      startTimer();
      startCacheTimer();

      try {
        await activateKeepAwakeAsync('workout-session');
      } catch {
        // Non-critical — screen may sleep.
      }

      setIsLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return result.data!;
    },
    [syncSession, startTimer, startCacheTimer],
  );

  // ─── Resume an existing session ───────────────────────────────────────────

  const resumeSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      setError(null);

      const result = await getSessionById(sessionId);
      if (result.error || !result.data) {
        setError('Failed to load session.');
        setIsLoading(false);
        return;
      }

      const s = result.data;

      // Only resume active sessions — reject completed/abandoned
      if (s.status !== 'active') {
        setError('This workout has already been finished.');
        setIsLoading(false);
        return;
      }

      syncSession(s);

      // Calculate elapsed from startedAt
      const startMs = s.startedAt instanceof Timestamp
        ? s.startedAt.toMillis()
        : Date.now();
      elapsedRef.current = Math.floor((Date.now() - startMs) / 1000);
      setElapsedSeconds(elapsedRef.current);

      startTimer();
      startCacheTimer();

      try {
        await activateKeepAwakeAsync('workout-session');
      } catch {
        // Non-critical.
      }

      setIsLoading(false);
    },
    [syncSession, startTimer, startCacheTimer],
  );

  // ─── Set operations ───────────────────────────────────────────────────────

  const completeSet = useCallback(
    async (
      exerciseIndex: number,
      setIndex: number,
      data: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number; rpe: number | null },
    ): Promise<{ prResult: PRDetectionResult | null; isLastSet: boolean; exerciseName: string } | null> => {
      const s = sessionRef.current;
      if (!s) return null;

      const exercise = s.exercises[exerciseIndex];
      if (!exercise) return null;

      const set = exercise.sets[setIndex];
      if (!set) return null;

      const isLastSet = setIndex === exercise.sets.length - 1;
      const exerciseName = exercise.exerciseName;

      // Detect PRs via dedicated service (4 PR types)
      let prResult: PRDetectionResult | null = null;
      if (data.weight > 0 && data.reps > 0) {
        const detection = await detectAndUpdatePRs(
          exercise.exerciseId,
          exercise.exerciseName,
          exercise.primaryMuscle,
          { weight: data.weight, weightUnit: data.weightUnit, reps: data.reps },
          s.id,
        );
        if (!detection.error && detection.data) {
          prResult = detection.data;
        }
      }

      const isPR = prResult?.isAnyPR ?? false;

      const updatedSet: SessionSet = {
        ...set,
        weight: data.weight,
        weightUnit: data.weightUnit,
        reps: data.reps,
        rpe: data.rpe,
        completed: true,
        completedAt: Timestamp.now(),
        isPersonalRecord: isPR,
      };

      const updatedSets = [...exercise.sets];
      updatedSets[setIndex] = updatedSet;

      const updatedExercises = [...s.exercises];
      updatedExercises[exerciseIndex] = { ...exercise, sets: updatedSets };

      const updatedSession = { ...s, exercises: updatedExercises };
      syncSession(updatedSession);

      // Strong haptic on PR, medium otherwise
      if (isPR) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Save weight memory for convenience prefill
      setLastWeight(exercise.exerciseId, data.weight, data.weightUnit);

      // Re-read ref to get latest state (prevents lost-update race if
      // two completeSet calls interleave)
      const latest = sessionRef.current;
      if (latest) {
        await updateSession(latest.id, { exercises: latest.exercises });
      }

      return { prResult, isLastSet, exerciseName };
    },
    [syncSession],
  );

  const addSet = useCallback(
    (exerciseIndex: number) => {
      const s = sessionRef.current;
      if (!s) return;

      const exercise = s.exercises[exerciseIndex];
      if (!exercise) return;

      const lastSet = exercise.sets[exercise.sets.length - 1];
      const newSet: SessionSet = {
        setNumber: exercise.sets.length + 1,
        weight: lastSet?.weight ?? 0,
        weightUnit: lastSet?.weightUnit ?? 'lbs',
        reps: 0,
        rpe: null,
        completed: false,
        completedAt: null,
        isPersonalRecord: false,
      };

      const updatedExercises = [...s.exercises];
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, newSet],
      };

      syncSession({ ...s, exercises: updatedExercises });
    },
    [syncSession],
  );

  const removeSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const s = sessionRef.current;
      if (!s) return;

      const exercise = s.exercises[exerciseIndex];
      if (!exercise || exercise.sets.length <= 1) return;

      const updatedSets = exercise.sets
        .filter((_, i) => i !== setIndex)
        .map((set, i) => ({ ...set, setNumber: i + 1 }));

      const updatedExercises = [...s.exercises];
      updatedExercises[exerciseIndex] = { ...exercise, sets: updatedSets };

      syncSession({ ...s, exercises: updatedExercises });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveExercises();
    },
    [syncSession, saveExercises],
  );

  // ─── Exercise operations ──────────────────────────────────────────────────

  const addExercise = useCallback(
    (exercise: Exercise) => {
      const s = sessionRef.current;
      if (!s) return;

      const newExercise: SessionExercise = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscle: exercise.primaryMuscles[0] ?? 'Chest',
        order: s.exercises.length,
        supersetGroup: null,
        restSeconds: 90, // default for ad-hoc exercises added mid-session
        sets: [
          {
            setNumber: 1,
            weight: 0,
            weightUnit: 'lbs',
            reps: 0,
            rpe: null,
            completed: false,
            completedAt: null,
            isPersonalRecord: false,
          },
        ],
        notes: '',
      };

      syncSession({ ...s, exercises: [...s.exercises, newExercise] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [syncSession],
  );

  const removeExercise = useCallback(
    (exerciseIndex: number) => {
      const s = sessionRef.current;
      if (!s) return;

      const updatedExercises = s.exercises
        .filter((_, i) => i !== exerciseIndex)
        .map((e, i) => ({ ...e, order: i }));

      syncSession({ ...s, exercises: updatedExercises });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveExercises();
    },
    [syncSession, saveExercises],
  );

  const swapExercise = useCallback(
    (exerciseIndex: number, newExercise: Exercise) => {
      const s = sessionRef.current;
      if (!s) return;

      const original = s.exercises[exerciseIndex];
      if (!original) return;

      // Session-only replacement — template is not modified
      const replacement: SessionExercise = {
        exerciseId: newExercise.id,
        exerciseName: newExercise.name,
        primaryMuscle: newExercise.primaryMuscles[0] ?? 'Chest',
        order: original.order,
        supersetGroup: original.supersetGroup,
        notes: '',
        restSeconds: original.restSeconds, // preserve rest time from the replaced exercise
        sets: original.sets.map((set, i) => ({
          setNumber: i + 1,
          weight: 0,
          weightUnit: set.weightUnit,
          reps: 0,
          rpe: null,
          completed: false,
          completedAt: null,
          isPersonalRecord: false,
        })),
      };

      const updatedExercises = [...s.exercises];
      updatedExercises[exerciseIndex] = replacement;
      syncSession({ ...s, exercises: updatedExercises });
      saveExercises();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [syncSession, saveExercises],
  );

  const updateExerciseNotes = useCallback(
    (exerciseIndex: number, notes: string) => {
      const s = sessionRef.current;
      if (!s) return;

      const updatedExercises = [...s.exercises];
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        notes,
      };

      syncSession({ ...s, exercises: updatedExercises });
    },
    [syncSession],
  );

  // ─── Finish / abandon ─────────────────────────────────────────────────────

  const finishWorkout = useCallback(
    async (notes: string, rating: number | null) => {
      const s = sessionRef.current;
      if (!s) return;

      stopTimer();
      stopCacheTimer();

      const completedSets = s.exercises.flatMap((e) =>
        e.sets.filter((set) => set.completed),
      );
      const totalVolume = completedSets.reduce(
        (sum, set) => sum + set.weight * set.reps,
        0,
      );

      const update: Partial<WorkoutSession> = {
        status: 'completed',
        endedAt: Timestamp.now(),
        duration: elapsedRef.current,
        totalVolume,
        totalSets: completedSets.length,
        notes,
        rating,
        exercises: s.exercises,
      };

      await updateSession(s.id, update);
      await clearCache();

      syncSession(null);
      setElapsedSeconds(0);
      elapsedRef.current = 0;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        deactivateKeepAwake('workout-session');
      } catch {
        // Non-critical.
      }
    },
    [syncSession, stopTimer, stopCacheTimer, clearCache],
  );

  const abandonWorkout = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;

    stopTimer();
    stopCacheTimer();

    await updateSession(s.id, {
      status: 'abandoned',
      endedAt: Timestamp.now(),
      duration: elapsedRef.current,
    });
    await clearCache();

    syncSession(null);
    setElapsedSeconds(0);
    elapsedRef.current = 0;

    try {
      deactivateKeepAwake('workout-session');
    } catch {
      // Non-critical.
    }
  }, [syncSession, stopTimer, stopCacheTimer, clearCache]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopTimer();
      stopCacheTimer();
    };
  }, [stopTimer, stopCacheTimer]);

  return {
    session,
    elapsedSeconds,
    isLoading,
    error,
    startSession: startSessionFn,
    resumeSession,
    completeSet,
    addSet,
    removeSet,
    addExercise,
    removeExercise,
    swapExercise,
    updateExerciseNotes,
    finishWorkout,
    abandonWorkout,
  };
}
