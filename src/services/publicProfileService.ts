/**
 * Public profile service — CRUD for /publicProfiles/{uid} top-level collection.
 *
 * Public profiles contain ONLY non-PII data. PII fields (email, firstName,
 * lastName, phone) are blocked by Firestore rules; this service mirrors that
 * constraint by never including them in writes.
 *
 * Search by username is capped at 20 results to prevent bulk enumeration.
 * ENUMERATION RISK NOTE: prefix-range queries expose that a username exists
 * even if the caller never sees the full profile. This is a known trade-off
 * for the UX benefit of username autocomplete. Full user enumeration is
 * mitigated by requiring authentication and the 20-result cap.
 */
import { where, orderBy, limit, startAt, endAt } from 'firebase/firestore';
import { auth } from './firebase/index';
import {
  getGlobalDocument,
  queryGlobalDocuments,
  updateGlobalDocument,
} from './firebase/communityFirestore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/index';
import * as Sentry from '@sentry/react-native';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { PublicProfile, LeaderboardEntry, FeaturedStat, RankTier } from '../types/social';
import { getTierForXP } from '../utils/rankTier';

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLIC_PROFILES_COLLECTION = 'publicProfiles';

/** Maximum results returned from searchByUsername to mitigate enumeration. */
const SEARCH_LIMIT = 20;

// ─── Create / upsert ─────────────────────────────────────────────────────────

/**
 * Creates or fully replaces the public profile for the current user.
 * Called when the user first claims a username.
 *
 * PII guard: email, firstName, lastName, phone are explicitly omitted.
 */
export async function upsertPublicProfile(
  profile: Omit<PublicProfile, 'createdAt' | 'updatedAt'>,
): Promise<ServiceResult<void>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    if (uid !== profile.uid) throw new Error('UID mismatch — cannot write another user\'s public profile.');

    addBreadcrumb('publicProfileService', 'upsertPublicProfile', { uid });
    Sentry.addBreadcrumb({
      category: 'publicProfileService',
      message: 'upsertPublicProfile',
      data: { uid },
    });

    const profileRef = doc(db, PUBLIC_PROFILES_COLLECTION, uid);

    // Check whether the doc already exists so we don't overwrite createdAt on
    // subsequent upserts. merge:true with serverTimestamp() would silently
    // overwrite the original creation timestamp every time.
    const existing = await getDoc(profileRef);
    const isNew = !existing.exists();

    const payload: Record<string, unknown> = {
      uid: profile.uid,
      username: profile.username,
      displayHandle: profile.displayHandle,
      totalXP: profile.totalXP,
      level: profile.level,
      tier: profile.tier,
      featuredStat: profile.featuredStat,
      topAchievementIds: profile.topAchievementIds,
      leaderboardOptOut: profile.leaderboardOptOut,
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      // Only set createdAt when creating the document for the first time.
      payload.createdAt = serverTimestamp();
    }

    await setDoc(profileRef, payload, { merge: true });
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a public profile by UID.
 * Returns null (not an error) if no profile exists.
 */
export async function getPublicProfile(
  uid: string,
): Promise<ServiceResult<PublicProfile | null>> {
  try {
    addBreadcrumb('publicProfileService', 'getPublicProfile', { uid });
    const result = await getGlobalDocument<PublicProfile>(
      PUBLIC_PROFILES_COLLECTION,
      uid,
    );
    return result;
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Updates a subset of the public profile for the current user.
 *
 * Allowed fields only — PII fields are excluded from the allowed set.
 * The caller must be the profile owner (enforced by Firestore rules too).
 */
export type PublicProfileUpdate = Partial<
  Pick<
    PublicProfile,
    | 'displayHandle'
    | 'totalXP'
    | 'level'
    | 'tier'
    | 'featuredStat'
    | 'topAchievementIds'
    | 'leaderboardOptOut'
  >
>;

export async function updatePublicProfile(
  update: PublicProfileUpdate,
): Promise<ServiceResult<void>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    addBreadcrumb('publicProfileService', 'updatePublicProfile', { uid });

    const result = await updateGlobalDocument<PublicProfile>(
      PUBLIC_PROFILES_COLLECTION,
      uid,
      update,
    );
    return result;
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Sync XP stats ────────────────────────────────────────────────────────────

/**
 * Syncs gamification stats (totalXP, level, tier) to the public profile.
 * Fire-and-forget pattern — caller can `.catch(() => {})`.
 * Called after every XP award event.
 */
export async function syncXPToPublicProfile(
  totalXP: number,
  level: number,
): Promise<ServiceResult<void>> {
  const tier: RankTier = getTierForXP(totalXP).tier;
  return updatePublicProfile({ totalXP, level, tier });
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches public profiles by username prefix (case-sensitive, normalised).
 *
 * ENUMERATION RISK: prefix-range queries reveal which usernames exist in the
 * system. This is intentional for UX (friend search autocomplete) but callers
 * should be aware that this cannot fully prevent username enumeration.
 * Results are hard-capped at 20 to limit bulk discovery.
 *
 * Requires a Firestore composite index on (username ASC, __name__ ASC).
 */
export async function searchByUsername(
  usernamePrefix: string,
): Promise<ServiceResult<LeaderboardEntry[]>> {
  try {
    if (!usernamePrefix || usernamePrefix.trim().length === 0) {
      return { data: [], error: null };
    }

    addBreadcrumb('publicProfileService', 'searchByUsername', {
      prefix: usernamePrefix,
    });

    const lower = usernamePrefix.trim().toLowerCase();
    // Firestore range query: username >= lower && username <= lower + '\uf8ff'
    const result = await queryGlobalDocuments<PublicProfile>(
      PUBLIC_PROFILES_COLLECTION,
      [
        where('leaderboardOptOut', '==', false),
        orderBy('username'),
        startAt(lower),
        endAt(lower + '\uf8ff'),
        limit(SEARCH_LIMIT), // hard cap — mitigates bulk enumeration
      ],
    );

    if (result.error) return { data: null, error: result.error };

    const entries: LeaderboardEntry[] = (result.data?.data ?? []).map((p) => ({
      uid: p.uid,
      username: p.username,
      displayHandle: p.displayHandle,
      totalXP: p.totalXP,
      level: p.level,
      tier: p.tier,
    }));

    return { data: entries, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
