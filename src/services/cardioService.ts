import { where, orderBy, limit } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  queryDocuments,
  getDocument,
  COLLECTIONS,
} from './firebase/firestore';
import type { ServiceResult } from '../types/service';
import type { CardioSession, CardioSessionInput, ActivityType } from '../types/cardio';

export async function createCardioSession(
  data: CardioSessionInput
): Promise<ServiceResult<string>> {
  return addDocument<CardioSessionInput>(COLLECTIONS.CARDIO_SESSIONS, data as any);
}

export async function updateCardioSession(
  id: string,
  data: Partial<CardioSessionInput>
): Promise<ServiceResult<void>> {
  return updateDocument<CardioSessionInput>(COLLECTIONS.CARDIO_SESSIONS, id, data as any);
}

export async function getActiveSession(): Promise<ServiceResult<CardioSession | null>> {
  const result = await queryDocuments<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, [
    where('status', '==', 'active'),
    limit(1),
  ]);
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export async function getSessionById(id: string): Promise<ServiceResult<CardioSession | null>> {
  return getDocument<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, id);
}

export async function getRecentSessions(n = 20): Promise<ServiceResult<CardioSession[]>> {
  return queryDocuments<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, [
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(n),
  ]);
}

export async function getLastSessionByType(
  type: ActivityType
): Promise<ServiceResult<CardioSession | null>> {
  const result = await queryDocuments<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, [
    where('activityType', '==', type),
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(1),
  ]);
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}
