/**
 * Firestore service — all Firestore CRUD helpers.
 *
 * All operations are automatically scoped to the authenticated user:
 *   users/{uid}/{collection}/{docId}
 *
 * Error pattern: ServiceResult<T> — same as auth.ts. Never throws.
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  QueryConstraint,
  DocumentData,
  DocumentReference,
  WithFieldValue,
  UpdateData,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './index';
import type { ServiceResult } from '../../types/service';

// ─── Typed collection constants ────────────────────────────────────────────
// Use these everywhere — never pass raw strings to avoid typos.

export const COLLECTIONS = {
  PEPTIDES: 'peptides',
  DOSES: 'doses',
  FOOD_LOG: 'foodLog',
  FAVORITE_FOODS: 'favoriteFoods',
  NUTRITION: 'nutrition',
  WORKOUTS: 'workouts',
  PROFILE: 'profile',
  CARDIO_SESSIONS: 'cardioSessions',
  CUSTOM_EXERCISES: 'customExercises',
  WORKOUT_TEMPLATES: 'workoutTemplates',
  WORKOUT_SESSIONS: 'workoutSessions',
  PERSONAL_RECORDS: 'personalRecords',
  BODY_WEIGHT: 'bodyWeight',
  BODY_WEIGHT_LOGS: 'bodyWeightLogs',
  DASHBOARD_PREFERENCES: 'dashboardPreferences',
  PROGRESS_PHOTOS: 'progressPhotos',
  SUBSCRIPTION: 'subscription',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ─── Internal helpers ───────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Firestore operation attempted without authenticated user');
  return uid;
}

function userCollection(collectionName: CollectionName) {
  const uid = requireAuth();
  return collection(db, 'users', uid, collectionName);
}

function userDoc(collectionName: CollectionName, docId: string) {
  const uid = requireAuth();
  return doc(db, 'users', uid, collectionName, docId);
}

// ─── CRUD helpers ───────────────────────────────────────────────────────────

/**
 * Add a new document with an auto-generated ID.
 * Returns the new document ID.
 */
export async function addDocument<T extends DocumentData>(
  collectionName: CollectionName,
  data: WithFieldValue<T>
): Promise<ServiceResult<string>> {
  try {
    const ref = await addDoc(userCollection(collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { data: ref.id, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Create or fully replace a document at a known ID.
 */
export async function setDocument<T extends DocumentData>(
  collectionName: CollectionName,
  docId: string,
  data: WithFieldValue<T>
): Promise<ServiceResult<void>> {
  try {
    await setDoc(userDoc(collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Merge data into a document — creates it if it doesn't exist,
 * preserves existing fields not present in `data`.
 */
export async function mergeDocument<T extends DocumentData>(
  collectionName: CollectionName,
  docId: string,
  data: WithFieldValue<T>
): Promise<ServiceResult<void>> {
  try {
    await setDoc(userDoc(collectionName, docId) as unknown as DocumentReference<T>, {
      ...data,
      updatedAt: serverTimestamp(),
    } as WithFieldValue<T>, { merge: true });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Partially update an existing document.
 */
export async function updateDocument<T extends DocumentData>(
  collectionName: CollectionName,
  docId: string,
  data: UpdateData<T>
): Promise<ServiceResult<void>> {
  try {
    await updateDoc(userDoc(collectionName, docId) as unknown as DocumentReference<T>, {
      ...data,
      updatedAt: serverTimestamp(),
    } as UpdateData<T>);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  collectionName: CollectionName,
  docId: string
): Promise<ServiceResult<void>> {
  try {
    await deleteDoc(userDoc(collectionName, docId));
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Fetch a single document. Returns null data (not an error) if not found.
 */
export async function getDocument<T>(
  collectionName: CollectionName,
  docId: string
): Promise<ServiceResult<T | null>> {
  try {
    const snap = await getDoc(userDoc(collectionName, docId));
    return { data: snap.exists() ? (snap.data() as T) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Query documents with optional Firestore constraints (where, orderBy, limit, etc.).
 *
 * Example:
 *   queryDocuments<Peptide>(COLLECTIONS.PEPTIDES, [
 *     where('active', '==', true),
 *     orderBy('createdAt', 'desc'),
 *   ])
 */
export async function queryDocuments<T>(
  collectionName: CollectionName,
  constraints: QueryConstraint[] = []
): Promise<ServiceResult<T[]>> {
  try {
    const q = query(userCollection(collectionName), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    return { data: docs, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
