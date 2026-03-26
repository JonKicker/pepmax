/**
 * Segment service — Route Segment Competition feature.
 *
 * All Firestore operations use communityFirestore.ts helpers (top-level
 * /segments collection + /segments/{id}/efforts subcollection).
 *
 * Convention: every function returns ServiceResult<T>. Errors are caught,
 * logged via Sentry breadcrumbs, and returned — never thrown to the caller.
 */

import {
  where,
  orderBy,
  limit,
  // runTransaction + doc are used directly (raw SDK) inside submitEffort only.
  // communityFirestore has no transaction helper, and a Firestore transaction
  // requires working with raw DocumentReferences — this is the one justified
  // exception to the communityFirestore-only convention in this service.
  runTransaction,
  doc,
} from 'firebase/firestore';
import {
  addGlobalDocument,
  getGlobalDocument,
  queryGlobalDocuments,
  deleteGlobalDocument,
  querySubDocuments,
  incrementField,
} from './firebase/communityFirestore';
import { db, auth } from './firebase/index';
import { addBreadcrumb, captureException } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import { downsampleRoute } from '../utils/routeDownsample';
import type { ServiceResult } from '../types/service';
import type {
  RouteSegment,
  SegmentEffort,
  SegmentPoint,
  CreateSegmentInput,
} from '../types/segments';

// ─── Collection paths ─────────────────────────────────────────────────────────

export const SEGMENT_COLLECTIONS = {
  SEGMENTS: 'segments',
  EFFORTS: 'efforts',
  USERS: 'users',
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

const MAX_SEGMENT_NAME_LENGTH = 60;
const MIN_ROUTE_POINTS = 2;
const MAX_ROUTE_POINTS_RAW = 10_000;
const MAX_DISTANCE_M = 200_000; // 200 km
const MIN_DISTANCE_M = 50; // 50 m

function validateCreateInput(input: CreateSegmentInput): string | null {
  if (!input.name || input.name.trim().length === 0) return 'name is required';
  if (input.name.trim().length > MAX_SEGMENT_NAME_LENGTH)
    return `name must be ≤ ${MAX_SEGMENT_NAME_LENGTH} characters`;
  if (!['run', 'cycle', 'walk'].includes(input.activityType))
    return 'activityType must be run, cycle, or walk';
  if (!input.route || input.route.length < MIN_ROUTE_POINTS)
    return `route must have at least ${MIN_ROUTE_POINTS} points`;
  if (input.route.length > MAX_ROUTE_POINTS_RAW)
    return `route must have ≤ ${MAX_ROUTE_POINTS_RAW} raw points`;
  if (input.distanceMeters < MIN_DISTANCE_M || input.distanceMeters > MAX_DISTANCE_M)
    return `distanceMeters must be between ${MIN_DISTANCE_M} and ${MAX_DISTANCE_M}`;
  if (!['public', 'private'].includes(input.visibility))
    return "visibility must be 'public' or 'private'";
  return null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new route segment.
 *
 * - Validates input.
 * - Downsamples route to ≤ 500 points via RDP before writing to Firestore.
 * - Derives startPoint / endPoint from the (downsampled) route.
 * - Increments the creator's segmentCount on their user doc.
 * - Returns the new segment's Firestore ID.
 */
export async function createSegment(
  input: CreateSegmentInput
): Promise<ServiceResult<RouteSegment>> {
  try {
    addBreadcrumb('segmentService', 'createSegment', { name: input.name });

    const validationError = validateCreateInput(input);
    if (validationError) {
      return { data: null, error: new Error(`createSegment: ${validationError}`) };
    }

    const route = downsampleRoute(input.route, 500);
    const startPoint: SegmentPoint = {
      latitude: route[0].latitude,
      longitude: route[0].longitude,
    };
    const endPoint: SegmentPoint = {
      latitude: route[route.length - 1].latitude,
      longitude: route[route.length - 1].longitude,
    };

    const docData: Omit<RouteSegment, 'id' | 'createdAt'> = {
      name: input.name.trim(),
      creatorUid: input.creatorUid,
      creatorUsername: input.creatorUsername,
      activityType: input.activityType,
      route,
      startPoint,
      endPoint,
      distanceMeters: input.distanceMeters,
      visibility: input.visibility,
      bestEffortUid: null,
      bestEffortSeconds: null,
      bestEffortUsername: null,
    };

    const result = await addGlobalDocument<typeof docData>(
      SEGMENT_COLLECTIONS.SEGMENTS,
      docData
    );
    if (result.error) return { data: null, error: result.error };

    const segmentId = result.data;

    // Best-effort: increment user's segmentCount. Failure is non-fatal.
    try {
      await incrementField(SEGMENT_COLLECTIONS.USERS, input.creatorUid, 'segmentCount');
    } catch (counterErr) {
      captureException(counterErr, { context: 'createSegment.incrementSegmentCount' });
    }

    analytics.track(AnalyticsEvent.SEGMENT_CREATED, {
      activityType: input.activityType,
      distanceMeters: Math.round(input.distanceMeters),
      visibility: input.visibility,
      routePoints: route.length,
    });

    const segment: RouteSegment = {
      id: segmentId,
      ...docData,
      createdAt: new Date(),
    };

    return { data: segment, error: null };
  } catch (e) {
    captureException(e, { context: 'createSegment' });
    return { data: null, error: e as Error };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a segment by ID. Decrements the owner's segmentCount.
 * Caller is responsible for ensuring ownership before calling this.
 */
export async function deleteSegment(segmentId: string): Promise<ServiceResult<void>> {
  try {
    addBreadcrumb('segmentService', 'deleteSegment', { segmentId });

    // Fetch the segment first to get the creatorUid for counter decrement
    const fetchResult = await getGlobalDocument<RouteSegment>(
      SEGMENT_COLLECTIONS.SEGMENTS,
      segmentId
    );
    const creatorUid = fetchResult.data?.creatorUid;

    const deleteResult = await deleteGlobalDocument(SEGMENT_COLLECTIONS.SEGMENTS, segmentId);
    if (deleteResult.error) return deleteResult;

    // Best-effort: decrement segmentCount. Failure is non-fatal.
    if (creatorUid) {
      try {
        await incrementField(SEGMENT_COLLECTIONS.USERS, creatorUid, 'segmentCount', -1);
      } catch (counterErr) {
        captureException(counterErr, { context: 'deleteSegment.decrementSegmentCount' });
      }
    }

    analytics.track(AnalyticsEvent.SEGMENT_DELETED, { segmentId });

    return { data: undefined, error: null };
  } catch (e) {
    captureException(e, { context: 'deleteSegment', segmentId });
    return { data: null, error: e as Error };
  }
}

// ─── Fetch by ID ──────────────────────────────────────────────────────────────

/** Fetch a single segment document. Returns null (not an error) if not found. */
export async function getSegmentById(
  segmentId: string
): Promise<ServiceResult<RouteSegment | null>> {
  try {
    addBreadcrumb('segmentService', 'getSegmentById', { segmentId });
    return getGlobalDocument<RouteSegment>(SEGMENT_COLLECTIONS.SEGMENTS, segmentId);
  } catch (e) {
    captureException(e, { context: 'getSegmentById', segmentId });
    return { data: null, error: e as Error };
  }
}

// ─── Accessible segments ──────────────────────────────────────────────────────

/**
 * Fetch segments visible to the current user:
 *   - All public segments created by the user themselves
 *   - All public segments created by friends
 *   - All public segments created by crew members
 *   - All private segments created by the user themselves
 *
 * Implemented as three Firestore queries merged client-side to avoid
 * composite index requirements on cross-user visibility logic.
 *
 * @param uid              Current user's UID.
 * @param friendUids       List of friend UIDs.
 * @param crewMemberUids   List of crew member UIDs.
 */
export async function getAccessibleSegments(
  uid: string,
  friendUids: string[],
  crewMemberUids: string[]
): Promise<ServiceResult<RouteSegment[]>> {
  try {
    addBreadcrumb('segmentService', 'getAccessibleSegments', {
      uid,
      friendCount: friendUids.length,
      crewCount: crewMemberUids.length,
    });

    analytics.track(AnalyticsEvent.SEGMENTS_LIST_VIEWED, {
      friendCount: friendUids.length,
      crewCount: crewMemberUids.length,
    });

    // 1. Own segments (public + private)
    const ownResult = await queryGlobalDocuments<RouteSegment>(
      SEGMENT_COLLECTIONS.SEGMENTS,
      [where('creatorUid', '==', uid), orderBy('createdAt', 'desc'), limit(100)]
    );
    if (ownResult.error) return { data: null, error: ownResult.error };

    const seen = new Set<string>();
    const segments: RouteSegment[] = [];

    for (const s of ownResult.data.data) {
      if (!seen.has(s.id)) { seen.add(s.id); segments.push(s); }
    }

    // 2. Friends' public segments (batch by groups of 10 — Firestore `in` limit)
    const allSocialUids = Array.from(new Set([...friendUids, ...crewMemberUids])).filter(
      (u) => u !== uid
    );

    // Process in chunks of 10 (Firestore `in` operator limit)
    for (let i = 0; i < allSocialUids.length; i += 10) {
      const chunk = allSocialUids.slice(i, i + 10);
      const chunkResult = await queryGlobalDocuments<RouteSegment>(
        SEGMENT_COLLECTIONS.SEGMENTS,
        [
          where('creatorUid', 'in', chunk),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(100),
        ]
      );
      if (chunkResult.error) {
        // Log and continue — partial result is better than nothing
        captureException(chunkResult.error, { context: 'getAccessibleSegments.chunk', i });
        continue;
      }
      for (const s of chunkResult.data.data) {
        if (!seen.has(s.id)) { seen.add(s.id); segments.push(s); }
      }
    }

    return { data: segments, error: null };
  } catch (e) {
    captureException(e, { context: 'getAccessibleSegments' });
    return { data: null, error: e as Error };
  }
}

// ─── Nearby segments (bounding box) ──────────────────────────────────────────

/**
 * Fetch segments whose startPoint falls within a bounding box around `center`.
 * Used for live session pre-fetch — load candidates before the session starts.
 *
 * Note: This is a Firestore range query on startPoint.latitude only (to avoid
 * composite index on two fields). Longitude is filtered client-side.
 *
 * @param center      Centre of the search area.
 * @param radiusKm    Search radius in km.
 * @param maxResults  Maximum number of results (default 50).
 */
export async function getNearbySegments(
  center: SegmentPoint,
  radiusKm: number,
  maxResults: number = 50
): Promise<ServiceResult<RouteSegment[]>> {
  try {
    addBreadcrumb('segmentService', 'getNearbySegments', {
      lat: center.latitude,
      lng: center.longitude,
      radiusKm,
    });

    // 1 degree latitude ≈ 111 km
    const latDelta = radiusKm / 111;
    const minLat = center.latitude - latDelta;
    const maxLat = center.latitude + latDelta;

    const result = await queryGlobalDocuments<RouteSegment>(
      SEGMENT_COLLECTIONS.SEGMENTS,
      [
        where('visibility', '==', 'public'),
        where('startPoint.latitude', '>=', minLat),
        where('startPoint.latitude', '<=', maxLat),
        orderBy('startPoint.latitude'),
        limit(maxResults * 3), // over-fetch; filter by longitude client-side
      ]
    );
    if (result.error) return { data: null, error: result.error };

    // Client-side longitude filter
    const lngDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
    const minLng = center.longitude - lngDelta;
    const maxLng = center.longitude + lngDelta;

    const filtered = result.data.data
      .filter(
        (s) =>
          s.startPoint.longitude >= minLng && s.startPoint.longitude <= maxLng
      )
      .slice(0, maxResults);

    return { data: filtered, error: null };
  } catch (e) {
    captureException(e, { context: 'getNearbySegments' });
    return { data: null, error: e as Error };
  }
}

// ─── Submit effort ────────────────────────────────────────────────────────────

/**
 * Submit a user's effort for a segment — only stores if it is a PR.
 *
 * Document ID is the user's UID (one doc per user per segment), so this
 * naturally enforces "only best time is stored" by checking the existing doc.
 *
 * Also updates the segment's bestEffort* fields if this is a course record.
 */
export async function submitEffort(
  segmentId: string,
  effort: SegmentEffort
): Promise<ServiceResult<void>> {
  try {
    addBreadcrumb('segmentService', 'submitEffort', {
      segmentId,
      uid: effort.uid,
      durationSeconds: effort.durationSeconds,
    });

    // ── Effort PR check-and-write (transaction) ────────────────────────────
    // We use a raw Firestore runTransaction here because communityFirestore
    // has no transaction helper. The transaction eliminates the TOCTOU race
    // between reading the existing effort and writing the new PR — two
    // concurrent submissions for the same (segment, user) pair are safe.
    const effortRef = doc(
      db,
      SEGMENT_COLLECTIONS.SEGMENTS,
      segmentId,
      SEGMENT_COLLECTIONS.EFFORTS,
      effort.uid
    );

    let isNewPR = false;

    await runTransaction(db, async (tx) => {
      const existingSnap = await tx.get(effortRef);
      if (existingSnap.exists()) {
        const existing = existingSnap.data() as SegmentEffort;
        if (effort.durationSeconds >= existing.durationSeconds) {
          // Not a PR — abort the transaction without writing.
          return;
        }
      }
      isNewPR = true;
      // Write using raw tx.set inside the transaction; the surrounding
      // setSubDocument helper cannot participate in an external transaction.
      tx.set(effortRef, {
        uid: effort.uid,
        displayName: effort.displayName,
        durationSeconds: effort.durationSeconds,
        paceSecondsPerKm: effort.paceSecondsPerKm,
        sessionId: effort.sessionId,
        attemptedAt: effort.attemptedAt,
        // Timestamps added manually here (serverTimestamp is valid in tx.set)
      });
    });

    if (!isNewPR) {
      // Not a PR — nothing written, nothing to track
      return { data: undefined, error: null };
    }

    analytics.track(AnalyticsEvent.SEGMENT_MATCHED, {
      segmentId,
      durationSeconds: effort.durationSeconds,
    });
    analytics.track(AnalyticsEvent.SEGMENT_PR, {
      segmentId,
      durationSeconds: effort.durationSeconds,
    });

    // ── Course-record update (transaction) ────────────────────────────────
    // Same TOCTOU concern as above: two concurrent PRs could both read the
    // same bestEffortSeconds and both decide they are the new record.
    // A transaction serialises the read-compare-write sequence.
    try {
      const segmentRef = doc(db, SEGMENT_COLLECTIONS.SEGMENTS, segmentId);

      await runTransaction(db, async (tx) => {
        const segSnap = await tx.get(segmentRef);
        if (!segSnap.exists()) return;

        const segData = segSnap.data() as RouteSegment;
        if (
          segData.bestEffortSeconds === null ||
          effort.durationSeconds < segData.bestEffortSeconds
        ) {
          // updateGlobalDocument cannot participate in an external transaction,
          // so we update via tx.update directly (raw SDK — justified, see header).
          tx.update(segmentRef, {
            bestEffortUid: effort.uid,
            bestEffortSeconds: effort.durationSeconds,
            bestEffortUsername: effort.displayName,
          });
        }
      });
    } catch (courseRecordErr) {
      captureException(courseRecordErr, { context: 'submitEffort.updateCourseRecord', segmentId });
    }

    return { data: undefined, error: null };
  } catch (e) {
    captureException(e, { context: 'submitEffort', segmentId });
    return { data: null, error: e as Error };
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Fetch the leaderboard for a segment — all efforts ordered by duration ascending.
 * Returns up to 100 efforts.
 */
export async function getSegmentLeaderboard(
  segmentId: string
): Promise<ServiceResult<SegmentEffort[]>> {
  try {
    addBreadcrumb('segmentService', 'getSegmentLeaderboard', { segmentId });

    const result = await querySubDocuments<SegmentEffort>(
      SEGMENT_COLLECTIONS.SEGMENTS,
      segmentId,
      SEGMENT_COLLECTIONS.EFFORTS,
      [orderBy('durationSeconds', 'asc'), limit(100)]
    );
    if (result.error) return { data: null, error: result.error };

    analytics.track(AnalyticsEvent.SEGMENT_LEADERBOARD_VIEWED, { segmentId });

    return { data: result.data.data, error: null };
  } catch (e) {
    captureException(e, { context: 'getSegmentLeaderboard', segmentId });
    return { data: null, error: e as Error };
  }
}

// ─── Auth helper (re-exported for test mocking) ───────────────────────────────

/** Returns the current authenticated user's UID, or null if not signed in. */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}
