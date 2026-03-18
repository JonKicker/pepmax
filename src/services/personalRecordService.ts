/**
 * Personal Record service — tracks PRs per exercise in Firestore.
 *
 * Document ID = exerciseId for O(1) lookup.
 * Collection: users/{uid}/personalRecords/{exerciseId}
 */
import {
  getDocument,
  mergeDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import { estimateOneRepMax, toKg } from '../utils/training';
import { toLocalDateKey } from '../utils/nutrition';
import type { ServiceResult } from '../types/service';
import type {
  PersonalRecord,
  PRDetectionResult,
  PREntry,
  PRType,
} from '../types/personalRecord';
import type { MuscleGroup } from '../types/exercise';

const COL = COLLECTIONS.PERSONAL_RECORDS;

/**
 * Fetch the PR document for a single exercise.
 */
export async function getPersonalRecords(
  exerciseId: string,
): Promise<ServiceResult<PersonalRecord | null>> {
  return getDocument<PersonalRecord>(COL, exerciseId);
}

/**
 * Fetch all PR documents (for charts / timeline).
 */
export async function getAllPersonalRecords(): Promise<ServiceResult<PersonalRecord[]>> {
  return queryDocuments<PersonalRecord>(COL, []);
}

/**
 * Detect and persist PRs after a set is completed.
 *
 * Compares the completed set against the stored PR document for the exercise.
 * If any PR is broken, writes the updated document and returns which PRs were set.
 */
export async function detectAndUpdatePRs(
  exerciseId: string,
  exerciseName: string,
  primaryMuscle: MuscleGroup,
  set: { weight: number; weightUnit: 'lbs' | 'kg'; reps: number },
  sessionId: string,
): Promise<ServiceResult<PRDetectionResult>> {
  const noResult: PRDetectionResult = { isAnyPR: false, newRecords: [], details: [] };

  if (set.weight <= 0 || set.reps <= 0) {
    return { data: noResult, error: null };
  }

  // Fetch current PR doc (null if first time)
  const existing = await getDocument<PersonalRecord>(COL, exerciseId);
  if (existing.error) return { data: null, error: existing.error as Error };

  const current = existing.data;
  const today = toLocalDateKey();
  const volume = set.weight * set.reps;
  const e1rm = estimateOneRepMax(set.weight, set.reps);
  // Rep PR key uses kg-normalized weight to avoid "135 lbs" vs "61 kg" being separate brackets
  const weightKeyKg = Math.round(toKg(set.weight, set.weightUnit));
  const weightKey = String(weightKeyKg);

  const newRecords: PRType[] = [];
  const details: string[] = [];

  // All comparisons normalize to kg so lbs↔kg switches don't break detection
  const setWeightKg = toKg(set.weight, set.weightUnit);
  const volumeKg = setWeightKg * set.reps;
  const e1rmKg = toKg(e1rm, set.weightUnit);

  // Build updated PR doc starting from current or defaults
  let weightPR: PREntry | null = current?.weightPR ?? null;
  let volumePR: PREntry | null = current?.volumePR ?? null;
  let repPRs = { ...(current?.repPRs ?? {}) };
  let estimated1RM: PREntry | null = current?.estimated1RM ?? null;

  // 1. Weight PR — heaviest weight for at least 1 rep (compared in kg)
  const storedWeightKg = weightPR ? toKg(weightPR.value, weightPR.unit) : 0;
  if (!weightPR || setWeightKg > storedWeightKg) {
    weightPR = {
      value: set.weight,
      unit: set.weightUnit,
      reps: set.reps,
      date: today,
      sessionId,
    };
    newRecords.push('weight');
    details.push(`New Weight PR: ${set.weight} ${set.weightUnit}!`);
  }

  // 2. Volume PR — highest single-set volume (compared in kg*reps)
  const storedVolumeKg = volumePR ? toKg(volumePR.value, volumePR.unit) : 0;
  if (!volumePR || volumeKg > storedVolumeKg) {
    volumePR = {
      value: volume,
      unit: set.weightUnit,
      date: today,
      sessionId,
    };
    newRecords.push('volume');
    details.push(`New Volume PR: ${volume.toLocaleString()} ${set.weightUnit}!`);
  }

  // 3. Rep PR — most reps at a given weight bracket (bracket keyed by rounded kg)
  const currentRepPR = repPRs[weightKey];
  if (!currentRepPR || set.reps > currentRepPR.reps) {
    repPRs[weightKey] = { reps: set.reps, unit: set.weightUnit, date: today, sessionId };
    newRecords.push('reps');
    details.push(`New Rep PR: ${set.reps} reps @ ${set.weight} ${set.weightUnit}!`);
  }

  // 4. Estimated 1RM PR (compared in kg)
  const stored1rmKg = estimated1RM ? toKg(estimated1RM.value, estimated1RM.unit) : 0;
  if (!estimated1RM || e1rmKg > stored1rmKg) {
    estimated1RM = {
      value: e1rm,
      unit: set.weightUnit,
      date: today,
      sessionId,
    };
    newRecords.push('estimated1RM');
    details.push(`New Est. 1RM PR: ${e1rm} ${set.weightUnit}!`);
  }

  if (newRecords.length === 0) {
    return { data: noResult, error: null };
  }

  // Write updated PR doc
  const updatedDoc: Omit<PersonalRecord, 'updatedAt'> = {
    exerciseId,
    exerciseName,
    primaryMuscle,
    weightPR,
    volumePR,
    repPRs,
    estimated1RM,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writeResult = await mergeDocument(COL, exerciseId, updatedDoc as any);
  if (writeResult.error) {
    return { data: null, error: writeResult.error as Error };
  }

  return {
    data: { isAnyPR: true, newRecords, details },
    error: null,
  };
}
