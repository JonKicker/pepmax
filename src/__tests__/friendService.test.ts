// Mock Firebase modules before any imports
jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'my-uid' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// ── firebase/firestore mock ────────────────────────────────────────────────────

const mockWriteBatch = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockCollection = jest.fn();
const mockWhere = jest.fn((...args: unknown[]) => ({ type: 'where', args }));
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  _segments: segments,
}));

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...args: string[]) => mockDoc(_db, ...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  getDocs: jest.fn((...args: unknown[]) => mockGetDocs(...args)),
  writeBatch: jest.fn(() => mockWriteBatch()),
  query: jest.fn((...args: unknown[]) => mockQuery(...args)),
  collection: jest.fn((...args: unknown[]) => mockCollection(...args)),
  where: jest.fn((...args: unknown[]) => mockWhere(...args)),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
  getFriendStatus,
} from '../services/friendService';
import type { FriendDoc } from '../types/social';

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeFriendDoc(overrides: Partial<FriendDoc> = {}): FriendDoc {
  return {
    friendUid: 'friend-uid',
    friendUsername: 'iron_athlete',
    friendLevel: 5,
    friendTier: 'bronze',
    status: 'accepted',
    direction: 'sent',
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

function makeBatch() {
  return {
    set: mockBatchSet,
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  };
}

// ─── sendFriendRequest ────────────────────────────────────────────────────────

describe('sendFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path — new request ───────────────────────────────────────────────

  it('creates two pending docs atomically when no prior relationship exists', async () => {
    // No public profile snap
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // publicProfiles/my-uid
      .mockResolvedValueOnce({ exists: () => false })                    // my friends/target — no prior doc
      .mockResolvedValueOnce({ exists: () => false });                   // their friends/me — no prior doc

    const result = await sendFriendRequest('target-uid', 'target_user', 3, 'bronze');

    expect(result.error).toBeNull();
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── Self-friend guard ──────────────────────────────────────────────────────

  it('returns error when attempting to friend yourself', async () => {
    const result = await sendFriendRequest('my-uid', 'myself', 1, 'bronze');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/yourself/i);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  // ── Duplicate guard — doc already exists ──────────────────────────────────

  it('returns success without writing when a doc already exists', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // publicProfiles/my-uid
      .mockResolvedValueOnce({ exists: () => true, data: () => makeFriendDoc() }); // my friends/target exists

    const result = await sendFriendRequest('target-uid', 'target_user', 3, 'bronze');
    expect(result.error).toBeNull();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  // ── Cross-request auto-accept ──────────────────────────────────────────────

  it('auto-accepts when the target already sent a request to us', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null }) // publicProfiles/my-uid
      .mockResolvedValueOnce({ exists: () => false })                    // my friends/target — no prior doc
      .mockResolvedValueOnce({                                            // their friends/me — pending sent
        exists: () => true,
        data: () => ({
          status: 'pending',
          direction: 'sent',
        }),
      });

    const result = await sendFriendRequest('target-uid', 'target_user', 3, 'bronze');

    expect(result.error).toBeNull();
    // update their doc + set our doc
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    // Our doc should be accepted/received
    const setCall = mockBatchSet.mock.calls[0];
    expect(setCall[1].status).toBe('accepted');
    expect(setCall[1].direction).toBe('received');
  });

  // ── My pending doc payload shape ───────────────────────────────────────────

  it('writes my doc with status=pending direction=sent', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });

    await sendFriendRequest('target-uid', 'target_user', 7, 'gold');

    // First set call is my doc
    const myDoc = mockBatchSet.mock.calls[0][1];
    expect(myDoc.status).toBe('pending');
    expect(myDoc.direction).toBe('sent');
    expect(myDoc.friendUid).toBe('target-uid');
    expect(myDoc.friendUsername).toBe('target_user');
  });

  // ── Target pending doc payload shape ──────────────────────────────────────

  it('writes target doc with status=pending direction=received', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });

    await sendFriendRequest('target-uid', 'target_user', 7, 'gold');

    // Second set call is their doc
    const theirDoc = mockBatchSet.mock.calls[1][1];
    expect(theirDoc.status).toBe('pending');
    expect(theirDoc.direction).toBe('received');
    expect(theirDoc.friendUid).toBe('my-uid');
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await sendFriendRequest('target-uid', 'target_user', 1, 'bronze');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  // ── Firestore error propagation ───────────────────────────────────────────

  it('returns error when batch.commit() throws', async () => {
    mockGetDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });
    mockBatchCommit.mockRejectedValueOnce(new Error('Firestore commit failed'));

    const result = await sendFriendRequest('target-uid', 'target_user', 1, 'bronze');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/commit failed/i);
  });
});

// ─── acceptFriendRequest ──────────────────────────────────────────────────────

describe('acceptFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('updates both docs to status=accepted atomically', async () => {
    const result = await acceptFriendRequest('friend-uid');

    expect(result.error).toBeNull();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    // Both updates should set status to 'accepted'
    mockBatchUpdate.mock.calls.forEach((call) => {
      expect(call[1].status).toBe('accepted');
    });
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await acceptFriendRequest('friend-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  it('returns error when batch.commit() throws', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('Network error'));

    const result = await acceptFriendRequest('friend-uid');
    expect(result.error).toBeTruthy();
  });
});

// ─── declineFriendRequest ─────────────────────────────────────────────────────

describe('declineFriendRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('deletes both docs atomically (no tombstone left behind)', async () => {
    const result = await declineFriendRequest('friend-uid');

    expect(result.error).toBeNull();
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await declineFriendRequest('friend-uid');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  it('returns error when batch.commit() throws', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('Network error'));

    const result = await declineFriendRequest('friend-uid');
    expect(result.error).toBeTruthy();
  });
});

// ─── removeFriend ─────────────────────────────────────────────────────────────

describe('removeFriend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('deletes both docs atomically', async () => {
    const result = await removeFriend('friend-uid');

    expect(result.error).toBeNull();
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await removeFriend('friend-uid');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  it('returns error when batch.commit() throws', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('Network error'));

    const result = await removeFriend('friend-uid');
    expect(result.error).toBeTruthy();
  });
});

// ─── getFriends ───────────────────────────────────────────────────────────────

describe('getFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns accepted friends', async () => {
    const friendDoc = makeFriendDoc({ status: 'accepted', direction: 'sent' });
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => friendDoc }],
    });

    const result = await getFriends();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].status).toBe('accepted');
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'accepted');
  });

  // ── Empty result ──────────────────────────────────────────────────────────

  it('returns empty array when no accepted friends exist', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getFriends();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getFriends();
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  // ── Firestore error ───────────────────────────────────────────────────────

  it('returns error when getDocs throws', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Index error'));

    const result = await getFriends();
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/index error/i);
  });
});

// ─── getPendingRequests ───────────────────────────────────────────────────────

describe('getPendingRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns pending received requests with correct query constraints', async () => {
    const pendingDoc = makeFriendDoc({ status: 'pending', direction: 'received' });
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => pendingDoc }],
    });

    const result = await getPendingRequests();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);

    // Verify both query constraints are applied
    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'status' && c[2] === 'pending')).toBe(true);
    expect(whereCalls.some((c) => c[0] === 'direction' && c[2] === 'received')).toBe(true);
  });

  // ── Empty result ──────────────────────────────────────────────────────────

  it('returns empty array when no pending requests', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getPendingRequests();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});

// ─── getSentRequests ──────────────────────────────────────────────────────────

describe('getSentRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns pending sent requests with correct query constraints', async () => {
    const sentDoc = makeFriendDoc({ status: 'pending', direction: 'sent' });
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ data: () => sentDoc }],
    });

    const result = await getSentRequests();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);

    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'status' && c[2] === 'pending')).toBe(true);
    expect(whereCalls.some((c) => c[0] === 'direction' && c[2] === 'sent')).toBe(true);
  });

  // ── Empty result ──────────────────────────────────────────────────────────

  it('returns empty array when no sent requests', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getSentRequests();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});

// ─── getFriendStatus ─────────────────────────────────────────────────────────

describe('getFriendStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Exists ────────────────────────────────────────────────────────────────

  it('returns the FriendDoc when the relationship exists', async () => {
    const friendDoc = makeFriendDoc({ status: 'accepted' });
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => friendDoc,
    });

    const result = await getFriendStatus('friend-uid');

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe('accepted');
  });

  // ── Does not exist ────────────────────────────────────────────────────────

  it('returns null (not an error) when no relationship exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getFriendStatus('stranger-uid');

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getFriendStatus('friend-uid');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });

  // ── Error propagation ─────────────────────────────────────────────────────

  it('returns error when getDoc throws', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Permission denied'));

    const result = await getFriendStatus('friend-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/permission denied/i);
  });
});
