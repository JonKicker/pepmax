/**
 * Cycle service — CRUD for the cycles collection.
 *
 * Path layout (handled by firestore helpers):
 *   users/{uid}/cycles/{id}
 *
 * Index note: getActiveCycles filters client-side to avoid requiring a
 * composite index on (status + startDate). Consistent with the peptideService
 * pattern for getDoses.
 */
import { orderBy, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { Cycle, CycleStatus } from '../types/cycle';
import type { ServiceResult } from '../types/service';

// ─── Input type (strips server-managed fields) ───────────────────────────────

type CycleInput = Omit<Cycle, 'id' | 'createdAt' | 'updatedAt'>;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addCycle(data: CycleInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.CYCLES, data as any);
}

export async function updateCycle(
  id: string,
  data: Partial<CycleInput>,
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.CYCLES, id, data as any);
}

export async function deleteCycle(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.CYCLES, id);
}

export async function getCycles(): Promise<ServiceResult<Cycle[]>> {
  return queryDocuments<Cycle>(COLLECTIONS.CYCLES, [orderBy('createdAt', 'desc')]);
}

/**
 * Fetch all active cycles.
 * Client-side filter avoids a composite index on (status + startDate).
 */
export async function getActiveCycles(): Promise<ServiceResult<Cycle[]>> {
  const result = await queryDocuments<Cycle>(COLLECTIONS.CYCLES, [
    orderBy('createdAt', 'desc'),
  ]);
  if (result.error) return result;
  return {
    data: (result.data ?? []).filter((c) => c.status === 'active'),
    error: null,
  };
}

export async function getCycleById(id: string): Promise<ServiceResult<Cycle | null>> {
  return getDocument<Cycle>(COLLECTIONS.CYCLES, id);
}

/**
 * Mark a specific planned dose as completed.
 * Reads the cycle doc, patches the matching PlannedDose, and writes back the
 * updated array. Matches by date string ('YYYY-MM-DD') — timezone-safe.
 */
export async function markPlannedDoseCompleted(
  cycleId: string,
  doseDate: string,
  loggedDoseId: string,
): Promise<ServiceResult<void>> {
  const cycleResult = await getDocument<Cycle>(COLLECTIONS.CYCLES, cycleId);
  if (cycleResult.error) return { data: null, error: cycleResult.error };
  if (!cycleResult.data) {
    return { data: null, error: new Error('Cycle not found') };
  }

  const updatedDoses = cycleResult.data.plannedDoses.map((pd) =>
    pd.date === doseDate && !pd.completedAt
      ? { ...pd, completedAt: Timestamp.now(), completedDoseId: loggedDoseId }
      : pd,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.CYCLES, cycleId, { plannedDoses: updatedDoses } as any);
}

export async function updateCycleStatus(
  cycleId: string,
  status: CycleStatus,
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.CYCLES, cycleId, { status } as any);
}
