/**
 * Crew service — CRUD for the /crews and /crewInviteCodes top-level collections.
 *
 * Firestore paths:
 *   /crews/{crewId}
 *   /crewInviteCodes/{code}   — code (uppercase 8-char) is the doc ID
 *
 * Business rules:
 *   - Max 5 crews per user
 *   - Max 10 members per crew
 *   - Invite codes are 8-char uppercase alphanumeric (ambiguous chars stripped)
 *   - On owner leave: ownership transfers to earliest-joined member
 *   - On last member leave: crew + invite code doc are batch-deleted
 *
 * ─── SECURITY NOTE ──────────────────────────────────────────────────────────────
 * createCrew / joinCrew / leaveCrew use Firestore transactions for atomicity.
 * Firestore rules allow member array modifications by authenticated users (see rules).
 * Count limits (max crews, max members) are enforced client-side here. A malicious
 * client could bypass these — enforce via Cloud Functions if abuse becomes a concern.
 * ─────────────────────────────────────────────────────────────────────────────────
 */
import {
  doc,
  getDoc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase/index';
import * as Sentry from '@sentry/react-native';
import { addBreadcrumb } from './errorReporting';
import type { ServiceResult } from '../types/service';
import type { CrewDoc, CrewMember, CrewInviteCodeDoc } from '../types/social';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREWS = 'crews';
const CREW_INVITE_CODES = 'crewInviteCodes';
const MAX_CREWS_PER_USER = 5;
const MAX_MEMBERS_PER_CREW = 10;
const INVITE_CODE_LENGTH = 8;
// Stripped: 0, O, 1, I, L to avoid visual confusion
const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

/**
 * Generate a single random 8-char uppercase alphanumeric invite code.
 * Ambiguous chars (0/O, 1/I/L) are excluded.
 */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
  }
  return code;
}

// ─── createCrew ───────────────────────────────────────────────────────────────

/**
 * Creates a new crew with the current user as owner.
 *
 * Steps (inside a single Firestore transaction):
 * 1. Count user's existing crews — reject if >= MAX_CREWS_PER_USER.
 * 2. Generate an 8-char invite code and verify it's not already taken
 *    (retries up to 5 times on collision).
 * 3. Write /crewInviteCodes/{code} reservation doc.
 * 4. Write /crews/{crewId} with the creator as the sole member.
 *
 * Returns the new crewId on success.
 */
export async function createCrew(
  name: string,
  avatarEmoji = '💪',
): Promise<ServiceResult<string>> {
  try {
    const uid = requireAuth();
    const trimmedName = name.trim();

    if (trimmedName.length < 3 || trimmedName.length > 30) {
      return { data: null, error: new Error('Crew name must be 3–30 characters.') };
    }

    addBreadcrumb('crewService', 'createCrew', { uid, name: trimmedName });
    Sentry.addBreadcrumb({
      category: 'crewService',
      message: 'createCrew',
      data: { uid },
      level: 'info',
    });

    const crewRef = doc(collection(db, CREWS));
    const crewId = crewRef.id;
    let chosenCode: string | null = null;

    await runTransaction(db, async (tx) => {
      // ── 1. Count existing crews ─────────────────────────────────────────────
      const myCrewsSnap = await getDocs(
        query(collection(db, CREWS), where('memberUids', 'array-contains', uid), limit(MAX_CREWS_PER_USER + 1)),
      );
      if (myCrewsSnap.size >= MAX_CREWS_PER_USER) {
        throw new Error(`You can only be a member of up to ${MAX_CREWS_PER_USER} crews.`);
      }

      // ── 2. Find a unique invite code ─────────────────────────────────────────
      let attempts = 0;
      let code: string | null = null;
      while (attempts < 5) {
        const candidate = generateInviteCode();
        const codeSnap = await tx.get(doc(db, CREW_INVITE_CODES, candidate));
        if (!codeSnap.exists()) {
          code = candidate;
          break;
        }
        attempts++;
      }
      if (!code) {
        throw new Error('Could not generate a unique invite code. Please try again.');
      }
      chosenCode = code;

      const now = serverTimestamp();
      const creatorMember: CrewMember = {
        uid,
        username: auth.currentUser?.displayName ?? '',
        level: 1,
        tier: 'bronze',
        role: 'owner',
        joinedAt: now,
      };

      // ── 3. Write invite code reservation ─────────────────────────────────────
      const codeDoc: CrewInviteCodeDoc = {
        crewId,
        createdBy: uid,
        createdAt: now,
      };
      tx.set(doc(db, CREW_INVITE_CODES, code), codeDoc);

      // ── 4. Write crew doc ─────────────────────────────────────────────────────
      const crewData: Omit<CrewDoc, 'id'> = {
        name: trimmedName,
        nameLower: trimmedName.toLowerCase(),
        avatarEmoji,
        createdBy: uid,
        inviteCode: code,
        memberUids: [uid],
        members: [creatorMember],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(crewRef, crewData);
    });

    return { data: crewId, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── joinCrew ─────────────────────────────────────────────────────────────────

/**
 * Joins a crew using an invite code.
 *
 * Steps (inside a single Firestore transaction):
 * 1. getDoc on /crewInviteCodes/{code.toUpperCase()} → get crewId.
 * 2. getDoc on /crews/{crewId} → validate < 10 members + not already member.
 * 3. arrayUnion uid onto memberUids + a new CrewMember onto members.
 *
 * Returns the crewId on success.
 */
export async function joinCrew(inviteCode: string): Promise<ServiceResult<string>> {
  try {
    const uid = requireAuth();
    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      return { data: null, error: new Error('Invite code is required.') };
    }

    addBreadcrumb('crewService', 'joinCrew', { uid, code });
    Sentry.addBreadcrumb({
      category: 'crewService',
      message: 'joinCrew',
      data: { uid },
      level: 'info',
    });

    let joinedCrewId = '';

    await runTransaction(db, async (tx) => {
      // ── 1. Resolve invite code → crewId ─────────────────────────────────────
      const codeSnap = await tx.get(doc(db, CREW_INVITE_CODES, code));
      if (!codeSnap.exists()) {
        throw new Error('Invalid invite code. Please check and try again.');
      }
      const codeData = codeSnap.data() as CrewInviteCodeDoc;
      const crewId = codeData.crewId;

      // ── 2. Load crew + validate ──────────────────────────────────────────────
      const crewSnap = await tx.get(doc(db, CREWS, crewId));
      if (!crewSnap.exists()) {
        throw new Error('This crew no longer exists.');
      }
      const crew = crewSnap.data() as Omit<CrewDoc, 'id'>;

      if (crew.memberUids.includes(uid)) {
        throw new Error('You are already a member of this crew.');
      }
      if (crew.memberUids.length >= MAX_MEMBERS_PER_CREW) {
        throw new Error('This crew is full (max 10 members).');
      }

      // ── 3. Add member ─────────────────────────────────────────────────────────
      const now = serverTimestamp();
      const newMember: CrewMember = {
        uid,
        username: auth.currentUser?.displayName ?? '',
        level: 1,
        tier: 'bronze',
        role: 'member',
        joinedAt: now,
      };

      tx.update(doc(db, CREWS, crewId), {
        memberUids: arrayUnion(uid),
        members: arrayUnion(newMember),
        updatedAt: now,
      });

      joinedCrewId = crewId;
    });

    return { data: joinedCrewId, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── leaveCrew ────────────────────────────────────────────────────────────────

// TODO: TOCTOU race — pre-read + writeBatch is not atomic. Two concurrent leaves
// could corrupt the members array. Convert to runTransaction when crew membership
// gates access to private data. Current blast radius: stale member list (self-healing).

/**
 * Removes the current user from a crew.
 *
 * Edge cases:
 * - Last member: batch-delete crew doc + invite code doc (no orphan).
 * - Owner leaving (not last): transfer ownership to the member with the
 *   earliest joinedAt timestamp, then remove self.
 * - Regular member: arrayRemove from both arrays, done.
 */
export async function leaveCrew(crewId: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('crewService', 'leaveCrew', { uid, crewId });
    Sentry.addBreadcrumb({
      category: 'crewService',
      message: 'leaveCrew',
      data: { uid, crewId },
      level: 'info',
    });

    const crewSnap = await getDoc(doc(db, CREWS, crewId));
    if (!crewSnap.exists()) {
      return { data: null, error: new Error('Crew not found.') };
    }
    const crew = crewSnap.data() as Omit<CrewDoc, 'id'>;

    if (!crew.memberUids.includes(uid)) {
      return { data: null, error: new Error('You are not a member of this crew.') };
    }

    // ── Last member — delete crew + invite code ──────────────────────────────
    if (crew.memberUids.length === 1) {
      const batch = writeBatch(db);
      batch.delete(doc(db, CREWS, crewId));
      batch.delete(doc(db, CREW_INVITE_CODES, crew.inviteCode));
      await batch.commit();
      return { data: undefined, error: null };
    }

    const myMember = crew.members.find((m) => m.uid === uid);
    if (!myMember) {
      return { data: null, error: new Error('Member record not found.') };
    }

    const batch = writeBatch(db);
    const now = serverTimestamp();

    // ── Owner leaving — transfer to earliest-joined remaining member ─────────
    if (crew.createdBy === uid) {
      const remaining = crew.members
        .filter((m) => m.uid !== uid)
        .sort((a, b) => {
          // joinedAt can be a FieldValue sentinel during tests; treat missing as 0
          const aTime = (a.joinedAt as any)?.seconds ?? 0;
          const bTime = (b.joinedAt as any)?.seconds ?? 0;
          return aTime - bTime;
        });

      const newOwner = remaining[0];

      // Rebuild members array: remove self, promote new owner
      const updatedMembers = crew.members
        .filter((m) => m.uid !== uid)
        .map((m) => (m.uid === newOwner.uid ? { ...m, role: 'owner' as const } : m));

      batch.update(doc(db, CREWS, crewId), {
        createdBy: newOwner.uid,
        memberUids: arrayRemove(uid),
        members: updatedMembers,
        updatedAt: now,
      });
    } else {
      // ── Regular member leaving ─────────────────────────────────────────────
      const updatedMembers = crew.members.filter((m) => m.uid !== uid);
      batch.update(doc(db, CREWS, crewId), {
        memberUids: arrayRemove(uid),
        members: updatedMembers,
        updatedAt: now,
      });
    }

    await batch.commit();
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getMyCrews ───────────────────────────────────────────────────────────────

/**
 * Returns all crews the current user is a member of.
 */
export async function getMyCrews(): Promise<ServiceResult<CrewDoc[]>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('crewService', 'getMyCrews', { uid });

    const snap = await getDocs(
      query(collection(db, CREWS), where('memberUids', 'array-contains', uid)),
    );
    const crews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrewDoc);
    return { data: crews, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── getCrewById ──────────────────────────────────────────────────────────────

/**
 * Fetches a single crew by ID. Returns null (not an error) if not found.
 */
export async function getCrewById(crewId: string): Promise<ServiceResult<CrewDoc | null>> {
  try {
    requireAuth();

    addBreadcrumb('crewService', 'getCrewById', { crewId });

    const snap = await getDoc(doc(db, CREWS, crewId));
    return {
      data: snap.exists() ? ({ id: snap.id, ...snap.data() } as CrewDoc) : null,
      error: null,
    };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── searchCrewByName ─────────────────────────────────────────────────────────

/**
 * Prefix-searches crews by name using the nameLower field.
 * Returns up to 20 results.
 *
 * Sanitization: trims input, lowercases, rejects empty string.
 */
export async function searchCrewByName(rawQuery: string): Promise<ServiceResult<CrewDoc[]>> {
  try {
    requireAuth();

    const q = rawQuery.trim().toLowerCase();
    if (!q) {
      return { data: null, error: new Error('Search query cannot be empty.') };
    }

    addBreadcrumb('crewService', 'searchCrewByName', { query: q });

    const snap = await getDocs(
      query(
        collection(db, CREWS),
        where('nameLower', '>=', q),
        where('nameLower', '<=', q + '\uf8ff'),
        limit(20),
      ),
    );
    const crews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CrewDoc);
    return { data: crews, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── regenerateInviteCode ─────────────────────────────────────────────────────

/**
 * Generates a new invite code for a crew. Only the owner can do this.
 *
 * Steps (transaction):
 * 1. Verify caller is the crew owner.
 * 2. Delete the old /crewInviteCodes/{oldCode} doc.
 * 3. Generate a new unique code (up to 5 collision retries).
 * 4. Write new /crewInviteCodes/{newCode}.
 * 5. Update crew.inviteCode.
 */
export async function regenerateInviteCode(crewId: string): Promise<ServiceResult<string>> {
  try {
    const uid = requireAuth();

    addBreadcrumb('crewService', 'regenerateInviteCode', { uid, crewId });
    Sentry.addBreadcrumb({
      category: 'crewService',
      message: 'regenerateInviteCode',
      data: { uid, crewId },
      level: 'info',
    });

    let newCode = '';

    await runTransaction(db, async (tx) => {
      const crewSnap = await tx.get(doc(db, CREWS, crewId));
      if (!crewSnap.exists()) throw new Error('Crew not found.');

      const crew = crewSnap.data() as Omit<CrewDoc, 'id'>;
      if (crew.createdBy !== uid) throw new Error('Only the crew owner can regenerate the invite code.');

      const oldCode = crew.inviteCode;

      // Find unique new code
      let attempts = 0;
      let code: string | null = null;
      while (attempts < 5) {
        const candidate = generateInviteCode();
        if (candidate === oldCode) { attempts++; continue; }
        const snap = await tx.get(doc(db, CREW_INVITE_CODES, candidate));
        if (!snap.exists()) {
          code = candidate;
          break;
        }
        attempts++;
      }
      if (!code) throw new Error('Could not generate a unique invite code. Please try again.');

      const now = serverTimestamp();
      const codeDoc: CrewInviteCodeDoc = { crewId, createdBy: uid, createdAt: now };

      tx.delete(doc(db, CREW_INVITE_CODES, oldCode));
      tx.set(doc(db, CREW_INVITE_CODES, code), codeDoc);
      tx.update(doc(db, CREWS, crewId), { inviteCode: code, updatedAt: now });

      newCode = code;
    });

    return { data: newCode, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── removeMember ────────────────────────────────────────────────────────────

// TODO: TOCTOU race — pre-read + writeBatch is not atomic. Two concurrent leaves
// could corrupt the members array. Convert to runTransaction when crew membership
// gates access to private data. Current blast radius: stale member list (self-healing).

/**
 * Removes a member from a crew. Only the owner can remove others.
 * The owner cannot remove themselves — use leaveCrew() for that.
 */
export async function removeMember(crewId: string, memberUid: string): Promise<ServiceResult<void>> {
  try {
    const uid = requireAuth();

    if (uid === memberUid) {
      return { data: null, error: new Error('Use leaveCrew() to remove yourself from a crew.') };
    }

    addBreadcrumb('crewService', 'removeMember', { uid, crewId, memberUid });
    Sentry.addBreadcrumb({
      category: 'crewService',
      message: 'removeMember',
      data: { uid, crewId, memberUid },
      level: 'info',
    });

    const crewSnap = await getDoc(doc(db, CREWS, crewId));
    if (!crewSnap.exists()) {
      return { data: null, error: new Error('Crew not found.') };
    }
    const crew = crewSnap.data() as Omit<CrewDoc, 'id'>;

    if (crew.createdBy !== uid) {
      return { data: null, error: new Error('Only the crew owner can remove members.') };
    }
    if (!crew.memberUids.includes(memberUid)) {
      return { data: null, error: new Error('This user is not a member of the crew.') };
    }

    const updatedMembers = crew.members.filter((m) => m.uid !== memberUid);

    const batch = writeBatch(db);
    batch.update(doc(db, CREWS, crewId), {
      memberUids: arrayRemove(memberUid),
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
