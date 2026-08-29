import { useState, useCallback } from 'react';
import {
  getActiveSession,
  abandonStaleSession,
  STALE_SESSION_HOURS,
} from '../services/workoutSessionService';
import type { WorkoutSession } from '../types/workout';

export function useWorkoutRecovery() {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const check = useCallback(async () => {
    setIsChecking(true);
    const result = await getActiveSession();
    if (result.error) {
      console.warn('[useWorkoutRecovery] Failed to fetch active session:', result.error);
    }
    const session = result.data ?? null;

    if (session) {
      const ageMs = Date.now() - session.startedAt.toMillis();
      const isStale = ageMs > STALE_SESSION_HOURS * 60 * 60 * 1000;

      if (isStale) {
        const abandonResult = await abandonStaleSession(session);
        if (abandonResult.error) {
          console.warn('[useWorkoutRecovery] Failed to abandon stale session:', abandonResult.error);
        }
        setActiveSession(null);
      } else {
        setActiveSession(session);
      }
    } else {
      setActiveSession(null);
    }

    setIsChecking(false);
  }, []);

  const dismiss = () => setActiveSession(null);

  return { activeSession, isChecking, dismiss, check };
}
