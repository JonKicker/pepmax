/**
 * Side-effect service — CRUD for the sideEffects collection.
 * Follows peptideService.ts pattern exactly.
 *
 * Path: users/{uid}/sideEffects/{id}
 */
import { orderBy, where, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  deleteDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { SideEffect, SideEffectSeverity } from '../types/sideEffect';
import type { ServiceResult } from '../types/service';

type SideEffectInput = {
  timestamp: Timestamp;
  emoji: string;
  label: string;
  severity: SideEffectSeverity;
  notes: string;
  peptideId?: string;
  peptideName?: string;
};

export async function addSideEffect(
  data: SideEffectInput,
): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.SIDE_EFFECTS, data as any);
}

export async function deleteSideEffect(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.SIDE_EFFECTS, id);
}

/**
 * Fetch side effects, optionally filtered to a timestamp range.
 * Results ordered newest-first.
 */
export async function getSideEffects(
  startDate?: Date,
  endDate?: Date,
): Promise<ServiceResult<SideEffect[]>> {
  if (startDate && endDate) {
    return queryDocuments<SideEffect>(COLLECTIONS.SIDE_EFFECTS, [
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc'),
    ]);
  }
  return queryDocuments<SideEffect>(COLLECTIONS.SIDE_EFFECTS, [
    orderBy('timestamp', 'desc'),
  ]);
}
