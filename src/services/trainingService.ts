/**
 * Training service — WorkoutLog CRUD.
 *
 * Date keys: ALL date comparisons use toLocalDateKey() from utils/nutrition.
 * Never use toISOString() here — it returns UTC and silently corrupts logs for
 * users in non-UTC timezones.
 *
 * Client-side sort: queryDocuments returns an unordered snapshot. We sort by
 * createdAt ascending after fetch to avoid requiring a composite Firestore index
 * on (date, createdAt). Null-safe: serverTimestamp() may be null briefly on
 * cache reads before the server value commits.
 */
import { where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  addDocument,
  deleteDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { toLocalDateKey } from '../utils/nutrition';
import type { WorkoutLog, WorkoutLogInput } from '../types/training';
import type { ServiceResult } from '../types/service';

export async function logWorkout(data: WorkoutLogInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.WORKOUTS, data as any);
}

export async function deleteWorkout(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.WORKOUTS, id);
}

export async function getTodaysWorkouts(): Promise<ServiceResult<WorkoutLog[]>> {
  const today = toLocalDateKey();
  const result = await queryDocuments<WorkoutLog>(COLLECTIONS.WORKOUTS, [
    where('date', '==', today),
  ]);
  if (result.error) return result;
  return {
    data: result.data!.slice().sort((a, b) => {
      const aMs = (a.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      return aMs - bMs;
    }),
    error: null,
  };
}

export async function getWorkoutsForDate(date: string): Promise<ServiceResult<WorkoutLog[]>> {
  const result = await queryDocuments<WorkoutLog>(COLLECTIONS.WORKOUTS, [
    where('date', '==', date),
  ]);
  if (result.error) return result;
  return {
    data: result.data!.slice().sort((a, b) => {
      const aMs = (a.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as unknown as Timestamp)?.toMillis?.() ?? 0;
      return aMs - bMs;
    }),
    error: null,
  };
}
