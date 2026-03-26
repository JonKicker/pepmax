import { useState, useCallback } from 'react';
import { getActiveSession } from '../services/workoutSessionService';
import type { WorkoutSession } from '../types/workout';

export function useWorkoutRecovery() {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const check = useCallback(async () => {
    setIsChecking(true);
    const result = await getActiveSession();
    setActiveSession(result.data ?? null);
    setIsChecking(false);
  }, []);

  const dismiss = () => setActiveSession(null);

  return { activeSession, isChecking, dismiss, check };
}
