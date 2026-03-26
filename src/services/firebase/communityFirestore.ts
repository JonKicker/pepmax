/**
 * Community Firestore helpers — top-level collection CRUD.
 *
 * Unlike firestore.ts (which scopes all ops to users/{uid}/), these helpers
 * operate on top-level collections like /templates and /reports.
 * They still require an authenticated user but do NOT use the uid as a path
 * component — community data is readable by all authenticated users.
 *
 * Pattern: mirrors firestore.ts exactly. Returns ServiceResult<T> throughout.
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
  DocumentSnapshot,
  WithFieldValue,
  UpdateData,
  serverTimestamp,
  increment,
  FieldValue,
} from 'firebase/firestore';
import { db, auth } from './index';
import type { ServiceResult } from '../../types/service';
import { addBreadcrumb } from '../errorReporting';

// ─── Auth guard ───────────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Community Firestore operation attempted without authenticated user');
  return uid;
}

// ─── Top-level collection helpers ────────────────────────────────────────────

/**
 * Add a new document with an auto-generated ID to a top-level collection.
 * Returns the new document ID.
 */
export async function addGlobalDocument<T extends DocumentData>(
  collectionPath: string,
  data: WithFieldValue<T>
): Promise<ServiceResult<string>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'addGlobalDocument', { collection: collectionPath });
    const ref = await addDoc(collection(db, collectionPath), {
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
 * Fetch a single document from a top-level collection.
 * Returns null data (not an error) if the document does not exist.
 */
export async function getGlobalDocument<T>(
  collectionPath: string,
  docId: string
): Promise<ServiceResult<T | null>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'getGlobalDocument', { collection: collectionPath, docId });
    const snap = await getDoc(doc(db, collectionPath, docId));
    return { data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export type QueryResult<T> = {
  data: T[];
  /** Pass to the next queryGlobalDocuments call as `cursor` for pagination. */
  lastDoc: DocumentSnapshot | null;
};

/**
 * Query documents from a top-level collection with optional constraints.
 * Supports cursor-based pagination via `lastDoc` in the returned result.
 */
export async function queryGlobalDocuments<T>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
): Promise<ServiceResult<QueryResult<T>>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'queryGlobalDocuments', { collection: collectionPath });
    const q = query(collection(db, collectionPath), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { data: { data: docs, lastDoc }, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Partially update an existing document in a top-level collection.
 */
export async function updateGlobalDocument<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: UpdateData<T>
): Promise<ServiceResult<void>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'updateGlobalDocument', { collection: collectionPath, docId });
    await updateDoc(doc(db, collectionPath, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    } as UpdateData<T>);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Delete a document from a top-level collection.
 */
export async function deleteGlobalDocument(
  collectionPath: string,
  docId: string
): Promise<ServiceResult<void>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'deleteGlobalDocument', { collection: collectionPath, docId });
    await deleteDoc(doc(db, collectionPath, docId));
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Subcollection helpers ────────────────────────────────────────────────────

/**
 * Add a document to a subcollection (e.g. /templates/{id}/reviews).
 */
export async function addSubDocument<T extends DocumentData>(
  parentPath: string,
  parentId: string,
  subCollection: string,
  data: WithFieldValue<T>
): Promise<ServiceResult<string>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'addSubDocument', { parentPath, parentId, subCollection });
    const ref = await addDoc(
      collection(db, parentPath, parentId, subCollection),
      {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
    return { data: ref.id, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Query a subcollection with optional constraints.
 */
export async function querySubDocuments<T>(
  parentPath: string,
  parentId: string,
  subCollection: string,
  constraints: QueryConstraint[] = []
): Promise<ServiceResult<QueryResult<T>>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'querySubDocuments', { parentPath, parentId, subCollection });
    const q = query(
      collection(db, parentPath, parentId, subCollection),
      ...constraints
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { data: { data: docs, lastDoc }, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Set (create or overwrite) a subdocument with a specific ID in a subcollection.
 * Merges timestamps — createdAt is preserved on existing docs via merge option.
 */
export async function setSubDocument<T extends DocumentData>(
  parentPath: string,
  parentId: string,
  subCollection: string,
  docId: string,
  data: WithFieldValue<T>,
  merge = false
): Promise<ServiceResult<void>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'setSubDocument', { parentPath, parentId, subCollection, docId });
    await setDoc(
      doc(db, parentPath, parentId, subCollection, docId),
      {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge }
    );
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Fetch a single subdocument from a subcollection by its ID.
 * Returns null data (not an error) if the document does not exist.
 */
export async function getSubDocument<T>(
  parentPath: string,
  parentId: string,
  subCollection: string,
  docId: string
): Promise<ServiceResult<T | null>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'getSubDocument', { parentPath, parentId, subCollection, docId });
    const snap = await getDoc(doc(db, parentPath, parentId, subCollection, docId));
    return { data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Update a subdocument in a subcollection.
 */
export async function updateSubDocument<T extends DocumentData>(
  parentPath: string,
  parentId: string,
  subCollection: string,
  docId: string,
  data: UpdateData<T>
): Promise<ServiceResult<void>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'updateSubDocument', { parentPath, parentId, subCollection, docId });
    await updateDoc(doc(db, parentPath, parentId, subCollection, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    } as UpdateData<T>);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Atomic counter helper ────────────────────────────────────────────────────

/**
 * Atomically increment a numeric field on a top-level document.
 * Uses Firestore's server-side increment — safe under concurrent writes.
 */
export async function incrementField(
  collectionPath: string,
  docId: string,
  field: string,
  by = 1
): Promise<ServiceResult<void>> {
  try {
    requireAuth();
    addBreadcrumb('communityFirestore', 'incrementField', { collection: collectionPath, docId, field, by });
    await updateDoc(doc(db, collectionPath, docId), {
      [field]: increment(by) as unknown as FieldValue,
      updatedAt: serverTimestamp(),
    });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
