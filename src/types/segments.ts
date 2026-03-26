/**
 * Segment types — Route Segment Competition feature.
 *
 * A RouteSegment is a named stretch of road/trail created by a user.
 * Other users who run/cycle/walk the same route can have their effort
 * automatically detected and ranked on a per-segment leaderboard.
 */

// ─── Core geometry ────────────────────────────────────────────────────────────

/** Minimal GPS coordinate — subset of RoutePoint from cardio.ts */
export type SegmentPoint = {
  latitude: number;
  longitude: number;
};

// ─── Segment ──────────────────────────────────────────────────────────────────

export type SegmentActivityType = 'run' | 'cycle' | 'walk';

/**
 * Top-level Firestore doc at /segments/{segmentId}
 *
 * route is RDP-downsampled to ≤ 500 points before storage to keep
 * Firestore document size well under the 1 MB limit.
 */
export type RouteSegment = {
  id: string;
  name: string;
  creatorUid: string;
  creatorUsername: string;
  activityType: SegmentActivityType;
  /** RDP-downsampled route — max 500 points */
  route: SegmentPoint[];
  startPoint: SegmentPoint;
  endPoint: SegmentPoint;
  distanceMeters: number;
  visibility: 'public' | 'private';
  /** UID of the current segment record holder, or null if no efforts yet */
  bestEffortUid: string | null;
  /** Duration of the best effort in seconds, or null if no efforts yet */
  bestEffortSeconds: number | null;
  /** Username of the record holder, or null if no efforts yet */
  bestEffortUsername: string | null;
  createdAt: Date;
};

// ─── Input type ───────────────────────────────────────────────────────────────

/** Input for createSegment — id and timestamps are assigned by the service */
export type CreateSegmentInput = {
  name: string;
  creatorUid: string;
  creatorUsername: string;
  activityType: SegmentActivityType;
  /** Raw GPS route — will be downsampled before storage */
  route: SegmentPoint[];
  distanceMeters: number;
  visibility: 'public' | 'private';
};

// ─── Effort ───────────────────────────────────────────────────────────────────

/**
 * Subcollection doc at /segments/{segmentId}/efforts/{uid}
 *
 * Document ID is the user's UID — at most one effort per user per segment
 * (only PRs are stored; slower runs do not overwrite).
 */
export type SegmentEffort = {
  uid: string;
  displayName: string;
  durationSeconds: number;
  paceSecondsPerKm: number;
  sessionId: string;
  attemptedAt: Date;
};

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Result of matching a completed CardioSession against a RouteSegment.
 * Returned by matchSessionToSegments().
 */
export type SegmentMatch = {
  segment: RouteSegment;
  durationSeconds: number;
  /** Index in the session route array where the segment starts */
  startIndex: number;
  /** Index in the session route array where the segment ends */
  endIndex: number;
  isPR: boolean;
};

// ─── Live tracking ────────────────────────────────────────────────────────────

/**
 * State maintained during an active cardio session for live segment HUD.
 * Updated on each GPS sample while a session is in progress.
 */
export type LiveSegmentState = {
  segment: RouteSegment | null;
  status: 'idle' | 'approaching' | 'active' | 'completed';
  elapsedSeconds: number;
  prSeconds: number | null;
  /** positive = behind PR pace, negative = ahead of PR pace */
  deltaSeconds: number;
};

// ─── Filter ───────────────────────────────────────────────────────────────────

export type SegmentFilter = 'allTime' | 'thisMonth' | 'friendsOnly' | 'crew';
