/**
 * Social types — Phase 1: Username System + Public Profiles
 *
 * Covers all types required for the leaderboards, friends, and crews feature set.
 * Phase 1 scope: username claiming, public profile CRUD, rank tiers, profile cards.
 */
import { Timestamp, FieldValue } from 'firebase/firestore';

// ─── Username ────────────────────────────────────────────────────────────────

/**
 * Top-level Firestore doc at /usernames/{username}
 * Lowercase normalised username is the document ID.
 * This doc exists solely to enforce uniqueness — it's a reservation record.
 *
 * claimedAt accepts FieldValue so callers can pass serverTimestamp() for
 * server-authoritative timestamps on write. Reads will return Timestamp.
 */
export type UsernameDoc = {
  uid: string;
  claimedAt: Timestamp | FieldValue;
};

// ─── Rank Tiers ───────────────────────────────────────────────────────────────

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite';

export type RankTierInfo = {
  tier: RankTier;
  label: string;
  /** Minimum totalXP required for this tier */
  minXP: number;
  /** Hex accent colour for UI rendering */
  color: string;
  /** Ionicons icon name */
  icon: string;
};

// ─── Featured Stat ────────────────────────────────────────────────────────────

export type FeaturedStat =
  | 'totalXP'
  | 'workouts'
  | 'doseStreak'
  | 'cardioSessions'
  | 'level';

// ─── Public Profile ───────────────────────────────────────────────────────────

/**
 * Top-level Firestore doc at /publicProfiles/{uid}
 *
 * Contains ONLY non-PII data that is safe for cross-user reads.
 * Deny-listed fields (email, firstName, lastName, phone) are enforced in
 * Firestore rules — this type also reflects that constraint.
 */
export type PublicProfile = {
  uid: string;
  username: string;
  /** Display name constructed from initials or a chosen handle — no PII */
  displayHandle: string;
  totalXP: number;
  level: number;
  tier: RankTier;
  featuredStat: FeaturedStat;
  /** Array of achievement IDs (max 3) chosen by the user to feature */
  topAchievementIds: string[];
  leaderboardOptOut: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /**
   * Materialised stat counters — written ONLY by Cloud Functions via Admin SDK.
   * Never written by the client. Firestore rules intentionally exclude these
   * fields from the isValidPublicProfileWrite allow-list.
   */
  stats?: PublicProfileStats;
  /**
   * Per-category rank summary — written ONLY by Cloud Functions via Admin SDK.
   * Used by the client to display "You are ranked #X (Top Y%)" without
   * re-reading the full leaderboard document.
   */
  leaderboardSummary?: LeaderboardSummary;
};

/**
 * Minimal public profile for leaderboard list items — avoids over-fetching.
 */
export type LeaderboardEntry = {
  uid: string;
  username: string;
  displayHandle: string;
  totalXP: number;
  level: number;
  tier: RankTier;
  rank?: number;
  /** Numeric value for the leaderboard category (volume, distance, XP, etc.) */
  value?: number;
  /** Percentile within the leaderboard (0–100) */
  percentile?: number;
};

// ─── Leaderboard types ────────────────────────────────────────────────────────

/**
 * The 6 tracked leaderboard categories.
 * Matches CATEGORY_STAT_KEY in functions/src/computeLeaderboards.ts.
 */
export type LeaderboardCategory =
  | 'weeklyVolume'
  | 'weeklyDistance'
  | 'weeklyXP'
  | 'monthlyVolume'
  | 'monthlyDistance'
  | 'allTimeXP';

export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'allTime';

export type LeaderboardScope = 'global' | 'friends' | 'crew';

/**
 * Materialised counters on publicProfiles/{uid}.stats, written only by
 * Cloud Functions via Admin SDK. Client writes to these fields are blocked
 * in Firestore rules.
 */
export type PublicProfileStats = {
  /** Weekly training volume in kg (reset on ISO week rollover) */
  weeklyVolume?: number;
  /** Monthly training volume in kg (reset on month rollover) */
  monthlyVolume?: number;
  /** Weekly cardio distance in km (reset on ISO week rollover) */
  weeklyDistance?: number;
  /** Monthly cardio distance in km (reset on month rollover) */
  monthlyDistance?: number;
  /** All-time cardio distance in km */
  allTimeDistance?: number;
  /** Weekly XP earned (reset on ISO week rollover) */
  weeklyXP?: number;
  /** Monthly XP earned (reset on month rollover) */
  monthlyXP?: number;
  /** All-time XP earned */
  allTimeXP?: number;
  /** Days macro targets were hit (weekly) */
  weeklyMacroTargetDays?: number;
  /** Days macro targets were hit (monthly) */
  monthlyMacroTargetDays?: number;
  /** Days on plan in the last ~30 days (approximate counter, resets monthly) */
  daysOnPlanLast30?: number;
  /** All-time challenges/achievements completed */
  allTimeChallengesCompleted?: number;
  /** Current ISO week key (e.g. "2026-W13") for period rollover detection */
  currentPeriodWeek?: string;
  /** Current month key (e.g. "2026-03") for period rollover detection */
  currentPeriodMonth?: string;
  /** Timestamp of the most recent stat-updating activity */
  lastActivityAt?: Timestamp;
  /** Idempotency tracking — doc IDs of last processed Firestore docs per source */
  lastProcessedIds?: Record<string, string>;
};

/**
 * Per-category rank summary stored on publicProfiles/{uid}.leaderboardSummary.
 * Written by Cloud Functions; read by the client for "Your rank" display.
 *
 * Key format: "{category}_{timeframe}", e.g. "weeklyVolume_weekly".
 */
export type UserLeaderboardRank = {
  rank: number;
  totalParticipants: number;
  percentile: number;
  value: number;
};

export type LeaderboardSummary = Partial<
  Record<`${LeaderboardCategory}_${LeaderboardTimeframe}`, UserLeaderboardRank>
>;

/**
 * Firestore document at /leaderboards/{category}_{timeframe}.
 * Written by Cloud Functions; read-only for clients.
 */
export type LeaderboardDoc = {
  category: LeaderboardCategory;
  timeframe: LeaderboardTimeframe;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  computedAt: Timestamp;
};

// ─── Crews ─────────────────────────────────────────────────────────────────────

/**
 * A member entry stored inside CrewDoc.members array.
 * Denormalised — may drift; refresh on crew detail view.
 */
export type CrewMember = {
  uid: string;
  username: string;
  level: number;
  tier: RankTier;
  role: 'owner' | 'member';
  joinedAt: Timestamp | FieldValue;
};

/**
 * Top-level Firestore doc at /crews/{crewId}
 *
 * memberUids is a flat array for array-contains queries.
 * members is the full array with display metadata.
 * nameLower is used for prefix search queries.
 */
export type CrewDoc = {
  id: string;
  name: string;
  /** Lowercase version of name used for prefix-search queries */
  nameLower: string;
  avatarEmoji: string;
  createdBy: string;
  inviteCode: string;
  /** Flat UID array for array-contains Firestore queries */
  memberUids: string[];
  /** Full member objects with display data */
  members: CrewMember[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

/**
 * Top-level Firestore doc at /crewInviteCodes/{code}
 * The invite code itself is the document ID (uppercase 8-char alphanumeric).
 */
export type CrewInviteCodeDoc = {
  crewId: string;
  createdBy: string;
  createdAt: Timestamp | FieldValue;
};

// ─── Friend System ─────────────────────────────────────────────────────────────

/**
 * Friendship status.
 * - 'pending'  — request has been sent, not yet accepted
 * - 'accepted' — both users have accepted; they are friends
 */
export type FriendStatus = 'pending' | 'accepted';

/**
 * Direction from the perspective of the doc owner.
 * - 'sent'     — this user initiated the request (i.e. they sent to the other)
 * - 'received' — the other user initiated the request to this user
 */
export type FriendDirection = 'sent' | 'received';

/**
 * Firestore doc at /users/{uid}/friends/{friendId}
 *
 * Every friendship is represented by TWO mirrored docs — one in each user's
 * subcollection — written atomically via writeBatch.
 *
 * Security note: friend status is SOCIAL ONLY. The existing wildcard rule
 * lets users modify their own friend docs freely. Friend status MUST NEVER
 * gate access to private data without server-side validation.
 */
export type FriendDoc = {
  /** UID of the other user in this relationship */
  friendUid: string;
  /** Username of the other user (denormalised for fast list rendering) */
  friendUsername: string;
  /** Level of the other user (denormalised — may drift; refresh on profile view) */
  friendLevel: number;
  /** Tier of the other user (denormalised) */
  friendTier: RankTier;
  status: FriendStatus;
  direction: FriendDirection;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
