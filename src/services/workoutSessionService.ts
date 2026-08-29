/**
 * Workout session service — CRUD for live workout sessions.
 *
 * All operations scoped to users/{uid}/workoutSessions/{docId}.
 */
import { where, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  getDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { ServiceResult } from '../types/service';
import type {
  WorkoutSession,
  WorkoutSessionInput,
  SessionExercise,
} from '../types/workout';

const COL = COLLECTIONS.WORKOUT_SESSIONS;

export async function createSession(
  input: WorkoutSessionInput,
): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COL, input as any);
}

export async function updateSession(
  id: string,
  data: Partial<WorkoutSession>,
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COL, id, data as any);
}

export async function getSessionById(
  id: string,
): Promise<ServiceResult<WorkoutSession | null>> {
  return getDocument<WorkoutSession>(COL, id);
}

export async function getActiveSession(): Promise<ServiceResult<WorkoutSession | null>> {
  const result = await queryDocuments<WorkoutSession>(COL, [
    where('status', '==', 'active'),
    firestoreLimit(1),
  ]);
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export const STALE_SESSION_HOURS = 4;

export async function abandonStaleSession(
  session: WorkoutSession,
): Promise<ServiceResult<void>> {
  return updateSession(session.id, { status: 'abandoned' });
}

export async function getRecentSessions(
  count: number,
): Promise<ServiceResult<WorkoutSession[]>> {
  const result = await queryDocuments<WorkoutSession>(COL, [
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(count),
  ]);
  return result;
}

/**
 * Find the most recent completed session that includes a given exercise,
 * then return that exercise's data (sets, weight, reps) for "previous best" display.
 */
export async function getLastSessionWithExercise(
  exerciseId: string,
): Promise<ServiceResult<SessionExercise | null>> {
  // Firestore can't query inside nested arrays, so we fetch recent sessions
  // and search client-side. Limit to last 20 to keep it efficient.
  const result = await queryDocuments<WorkoutSession>(COL, [
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(20),
  ]);
  if (result.error) return { data: null, error: result.error };

  for (const session of result.data ?? []) {
    const match = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (match) return { data: match, error: null };
  }
  return { data: null, error: null };
}

/**
 * Fetch completed sessions, optionally limited.
 */
export async function getCompletedSessions(
  count = 100,
): Promise<ServiceResult<WorkoutSession[]>> {
  return queryDocuments<WorkoutSession>(COL, [
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(count),
  ]);
}

/**
 * @deprecated Use `detectAndUpdatePRs` from personalRecordService instead.
 * This scans the last 50 sessions for heaviest weight only — the new service
 * tracks 4 PR types (weight, volume, reps, estimated 1RM) in dedicated docs.
 */
export async function getPersonalRecord(
  exerciseId: string,
): Promise<ServiceResult<{ weight: number; reps: number; weightUnit: 'lbs' | 'kg' } | null>> {
  const result = await queryDocuments<WorkoutSession>(COL, [
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(50),
  ]);
  if (result.error) return { data: null, error: result.error };

  let best: { weight: number; reps: number; weightUnit: 'lbs' | 'kg' } | null = null;

  for (const session of result.data ?? []) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (!set.completed) continue;
        if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
          best = { weight: set.weight, reps: set.reps, weightUnit: set.weightUnit };
        }
      }
    }
  }
  return { data: best, error: null };
}
