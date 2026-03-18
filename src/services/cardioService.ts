import { where, orderBy, limit, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  getDocument,
  COLLECTIONS,
} from './firebase/firestore';
import type { ServiceResult } from '../types/service';
import type { CardioSession, CardioSessionInput, ActivityType, HistoryFilter, DateRange } from '../types/cardio';

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

// ─── Date range helper ───────────────────────────────────────────────────────

function dateRangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'week') return new Date(now.getTime() - 7 * 86400000);
  if (range === 'month') return new Date(now.getTime() - 30 * 86400000);
  // '3months'
  return new Date(now.getTime() - 90 * 86400000);
}

// ─── Filtered / paginated query ──────────────────────────────────────────────

export async function getFilteredSessions(
  filters: HistoryFilter,
  pageSize = 20
): Promise<ServiceResult<CardioSession[]>> {
  const constraints = [
    where('status', '==', 'completed'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];

  if (filters.activityType) {
    constraints.unshift(where('activityType', '==', filters.activityType));
  }

  if (filters.dateRange && filters.dateRange !== 'all') {
    const start = dateRangeStart(filters.dateRange);
    if (start) {
      constraints.unshift(where('createdAt', '>=', Timestamp.fromDate(start)));
    }
  }

  const result = await queryDocuments<CardioSession>(COLLECTIONS.CARDIO_SESSIONS, constraints);
  if (result.error) return result;

  // Client-side distance filtering (Firestore can't do range + inequality on different fields)
  let sessions = result.data ?? [];
  if (filters.minDistanceM != null) {
    sessions = sessions.filter((s) => s.distance >= filters.minDistanceM!);
  }
  if (filters.maxDistanceM != null) {
    sessions = sessions.filter((s) => s.distance <= filters.maxDistanceM!);
  }

  return { data: sessions, error: null };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteCardioSession(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.CARDIO_SESSIONS, id);
}
