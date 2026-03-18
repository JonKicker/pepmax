import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

export type RestTimerState = {
  isRunning: boolean;
  remaining: number;
  total: number;
  exerciseName: string;
  progress: number; // 0 → 1
};

export function useRestTimer(onComplete?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [exerciseName, setExerciseName] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number, name: string) => {
      clearTimer();
      setTotal(seconds);
      setRemaining(seconds);
      setExerciseName(name);
      setIsRunning(true);

      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer],
  );

  const skip = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setRemaining(0);
  }, [clearTimer]);

  const adjustTime = useCallback((delta: number) => {
    setRemaining((prev) => {
      const next = Math.max(0, prev + delta);
      setTotal((t) => Math.max(t, next));
      return next;
    });
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const progress = total > 0 ? remaining / total : 0;

  return {
    state: { isRunning, remaining, total, exerciseName, progress } as RestTimerState,
    start,
    skip,
    adjustTime,
  };
}
