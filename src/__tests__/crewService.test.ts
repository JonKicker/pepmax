// Mock Firebase modules before any imports
jest.mock('../services/firebase/index', () => ({
  db: {},
  auth: { currentUser: { uid: 'my-uid', displayName: 'test_user' } },
}));

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// ── firebase/firestore mock ────────────────────────────────────────────────────

const mockRunTransaction = jest.fn();
const mockWriteBatch = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments.length > 0 ? segments[segments.length - 1] : 'auto-mock-crew-id',
  _segments: segments,
}));
const mockCollection = jest.fn((_db: unknown, path: string) => ({ path }));
const mockQuery = jest.fn((...args: unknown[]) => ({ type: 'query', args }));
const mockWhere = jest.fn((...args: unknown[]) => ({ type: 'where', args }));
const mockLimit = jest.fn((n: number) => ({ type: 'limit', n }));
const mockArrayUnion = jest.fn((...args: unknown[]) => ({ type: 'arrayUnion', args }));
const mockArrayRemove = jest.fn((...args: unknown[]) => ({ type: 'arrayRemove', args }));

const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

function makeBatch() {
  return {
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  };
}

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...args: string[]) => mockDoc(_db, ...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  getDocs: jest.fn((...args: unknown[]) => mockGetDocs(...args)),
  runTransaction: jest.fn((_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    mockRunTransaction(fn),
  ),
  writeBatch: jest.fn(() => mockWriteBatch()),
  collection: jest.fn((_db: unknown, path: string) => mockCollection(_db, path)),
  query: jest.fn((...args: unknown[]) => mockQuery(...args)),
  where: jest.fn((...args: unknown[]) => mockWhere(...args)),
  limit: jest.fn((n: number) => mockLimit(n)),
  arrayUnion: jest.fn((...args: unknown[]) => mockArrayUnion(...args)),
  arrayRemove: jest.fn((...args: unknown[]) => mockArrayRemove(...args)),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

import {
  createCrew,
  joinCrew,
  leaveCrew,
  getMyCrews,
  getCrewById,
  searchCrewByName,
  regenerateInviteCode,
  removeMember,
  generateInviteCode,
} from '../services/crewService';
import type { CrewDoc, CrewMember } from '../types/social';

// ─── Factory helpers ──────────────────────────────────────────────────────────

function makeCrewMember(overrides: Partial<CrewMember> = {}): CrewMember {
  return {
    uid: 'my-uid',
    username: 'test_user',
    level: 5,
    tier: 'silver',
    role: 'owner',
    joinedAt: { seconds: 1000, nanoseconds: 0 } as any,
    ...overrides,
  };
}

function makeCrewDoc(overrides: Partial<CrewDoc> = {}): CrewDoc {
  return {
    id: 'crew-123',
    name: 'Iron Brotherhood',
    nameLower: 'iron brotherhood',
    avatarEmoji: '💪',
    createdBy: 'my-uid',
    inviteCode: 'ABCD1234',
    memberUids: ['my-uid'],
    members: [makeCrewMember()],
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

// ─── generateInviteCode ───────────────────────────────────────────────────────

describe('generateInviteCode', () => {
  // ── Length ────────────────────────────────────────────────────────────────

  it('generates an 8-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  // ── Charset ───────────────────────────────────────────────────────────────

  it('contains only uppercase alphanumeric chars excluding ambiguous chars', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      // Must not contain ambiguous chars: 0, O, 1, I, L
      expect(code).not.toMatch(/[01OIL]/);
      // Must be uppercase alphanumeric
      expect(code).toMatch(/^[A-Z2-9]+$/);
    }
  });

  // ── Uniqueness ────────────────────────────────────────────────────────────

  it('generates different codes on successive calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    // With 8 chars and 31 possible chars, probability of collision is negligible
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─── createCrew ───────────────────────────────────────────────────────────────

describe('createCrew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('creates crew and invite code doc inside a transaction', async () => {
    const txSet = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      // Simulate: 0 existing crews, no code collision
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({ exists: () => false }), // code not taken
        set: txSet,
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] }); // existing crews check
      await fn(tx);
    });

    const result = await createCrew('Iron Brotherhood');

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy(); // returns crewId
    expect(txSet).toHaveBeenCalledTimes(2); // invite code doc + crew doc
  });

  // ── Name too short ────────────────────────────────────────────────────────

  it('returns error when name is shorter than 3 characters', async () => {
    const result = await createCrew('Ab');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/3–30/);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  // ── Name too long ─────────────────────────────────────────────────────────

  it('returns error when name exceeds 30 characters', async () => {
    const result = await createCrew('A'.repeat(31));
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/3–30/);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  // ── Name at boundary (3 chars) ────────────────────────────────────────────

  it('accepts a name of exactly 3 characters', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: jest.fn(),
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    const result = await createCrew('Gym');
    expect(result.error).toBeNull();
  });

  // ── Name at boundary (30 chars) ───────────────────────────────────────────

  it('accepts a name of exactly 30 characters', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: jest.fn(),
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    const result = await createCrew('A'.repeat(30));
    expect(result.error).toBeNull();
  });

  // ── Max crews reached ─────────────────────────────────────────────────────

  it('returns error when user already has 5 crews', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = { get: jest.fn(), set: jest.fn() };
      mockGetDocs.mockResolvedValueOnce({ size: 5, docs: [] });
      await fn(tx);
    });

    const result = await createCrew('New Crew');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/5 crews/);
  });

  // ── Invite code collision retry ───────────────────────────────────────────

  it('retries on invite code collision and succeeds', async () => {
    const txSet = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({ exists: () => true })  // first code taken
          .mockResolvedValueOnce({ exists: () => false }), // second code free
        set: txSet,
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    const result = await createCrew('Retry Crew');
    expect(result.error).toBeNull();
    expect(txSet).toHaveBeenCalledTimes(2);
  });

  // ── All codes collide ─────────────────────────────────────────────────────

  it('returns error when all 5 code attempts collide', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValue({ exists: () => true }), // always taken
        set: jest.fn(),
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    const result = await createCrew('Collision Crew');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/unique invite code/i);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await createCrew('My Crew');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not authenticated/i);

    auth.currentUser = original;
  });

  // ── Default emoji ──────────────────────────────────────────────────────────

  it('writes avatarEmoji as 💪 when none is provided', async () => {
    const txSet = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: txSet,
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    await createCrew('Emoji Test');

    // The second set call is the crew doc
    const crewData = txSet.mock.calls[1][1];
    expect(crewData.avatarEmoji).toBe('💪');
  });

  // ── nameLower field ────────────────────────────────────────────────────────

  it('writes nameLower as lowercase of name', async () => {
    const txSet = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
        set: txSet,
      };
      mockGetDocs.mockResolvedValueOnce({ size: 0, docs: [] });
      await fn(tx);
    });

    await createCrew('Iron Brotherhood', '🦁');

    const crewData = txSet.mock.calls[1][1];
    expect(crewData.nameLower).toBe('iron brotherhood');
  });
});

// ─── joinCrew ─────────────────────────────────────────────────────────────────

describe('joinCrew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('updates crew memberUids and members inside a transaction', async () => {
    const txUpdate = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ crewId: 'crew-123' }),
          })
          .mockResolvedValueOnce({
            exists: () => true,
            data: () =>
              makeCrewDoc({
                memberUids: ['other-uid'],
                members: [makeCrewMember({ uid: 'other-uid', role: 'owner' })],
                createdBy: 'other-uid',
              }),
          }),
        update: txUpdate,
      };
      await fn(tx);
    });

    const result = await joinCrew('ABCD1234');

    expect(result.error).toBeNull();
    expect(result.data).toBe('crew-123');
    expect(txUpdate).toHaveBeenCalledTimes(1);
  });

  // ── Empty code ────────────────────────────────────────────────────────────

  it('returns error when invite code is empty', async () => {
    const result = await joinCrew('   ');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/required/i);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  // ── Invalid code ──────────────────────────────────────────────────────────

  it('returns error when invite code doc does not exist', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
      };
      await fn(tx);
    });

    const result = await joinCrew('ZZZZZZZZ');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/invalid invite code/i);
  });

  // ── Already a member ──────────────────────────────────────────────────────

  it('returns error when user is already a member', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({ exists: () => true, data: () => ({ crewId: 'crew-123' }) })
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => makeCrewDoc({ memberUids: ['my-uid', 'other-uid'] }),
          }),
      };
      await fn(tx);
    });

    const result = await joinCrew('ABCD1234');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/already a member/i);
  });

  // ── Crew full (10 members) ────────────────────────────────────────────────

  it('returns error when crew has 10 members', async () => {
    const tenMembers = Array.from({ length: 10 }, (_, i) =>
      makeCrewMember({ uid: `uid-${i}`, role: i === 0 ? 'owner' : 'member' }),
    );
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({ exists: () => true, data: () => ({ crewId: 'crew-123' }) })
          .mockResolvedValueOnce({
            exists: () => true,
            data: () =>
              makeCrewDoc({
                memberUids: tenMembers.map((m) => m.uid),
                members: tenMembers,
              }),
          }),
      };
      await fn(tx);
    });

    const result = await joinCrew('ABCD1234');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/full/i);
  });

  // ── Code normalisation (lowercase input) ─────────────────────────────────

  it('normalises invite code to uppercase before lookup', async () => {
    const txGet = jest.fn()
      .mockResolvedValueOnce({ exists: () => false });
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = { get: txGet };
      await fn(tx);
    });

    await joinCrew('abcd1234');

    // Verify the doc path contains the uppercase code
    const docArg = txGet.mock.calls[0][0];
    expect(docArg.path).toContain('ABCD1234');
  });
});

// ─── leaveCrew ────────────────────────────────────────────────────────────────

describe('leaveCrew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Not a member ──────────────────────────────────────────────────────────

  it('returns error when user is not a member', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => makeCrewDoc({ memberUids: ['other-uid'] }),
    });

    const result = await leaveCrew('crew-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not a member/i);
  });

  // ── Crew not found ────────────────────────────────────────────────────────

  it('returns error when crew does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await leaveCrew('crew-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/crew not found/i);
  });

  // ── Last member — deletes crew and invite code ────────────────────────────

  it('batch-deletes crew and invite code when user is the last member', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => makeCrewDoc({ memberUids: ['my-uid'], members: [makeCrewMember()] }),
    });

    const result = await leaveCrew('crew-123');
    expect(result.error).toBeNull();
    expect(mockBatchDelete).toHaveBeenCalledTimes(2); // crew + invite code
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── Regular member leaving ────────────────────────────────────────────────

  it('removes member from both arrays when non-owner leaves', async () => {
    const crew = makeCrewDoc({
      createdBy: 'owner-uid',
      memberUids: ['owner-uid', 'my-uid'],
      members: [
        makeCrewMember({ uid: 'owner-uid', role: 'owner' }),
        makeCrewMember({ uid: 'my-uid', role: 'member' }),
      ],
    });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => crew });

    const result = await leaveCrew('crew-123');
    expect(result.error).toBeNull();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── Owner leaving — transfers ownership ───────────────────────────────────

  it('transfers ownership to earliest-joined member when owner leaves', async () => {
    const crew = makeCrewDoc({
      createdBy: 'my-uid',
      memberUids: ['my-uid', 'early-uid', 'late-uid'],
      members: [
        makeCrewMember({ uid: 'my-uid', role: 'owner', joinedAt: { seconds: 500, nanoseconds: 0 } as any }),
        makeCrewMember({ uid: 'early-uid', role: 'member', joinedAt: { seconds: 1000, nanoseconds: 0 } as any }),
        makeCrewMember({ uid: 'late-uid', role: 'member', joinedAt: { seconds: 2000, nanoseconds: 0 } as any }),
      ],
    });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => crew });

    const result = await leaveCrew('crew-123');
    expect(result.error).toBeNull();

    const updateCall = mockBatchUpdate.mock.calls[0][1];
    // New owner should be early-uid (earliest joinedAt among remaining)
    expect(updateCall.createdBy).toBe('early-uid');
    // New members array should not include owner (my-uid)
    expect(updateCall.members.some((m: CrewMember) => m.uid === 'my-uid')).toBe(false);
    // early-uid should have role='owner'
    const newOwner = updateCall.members.find((m: CrewMember) => m.uid === 'early-uid');
    expect(newOwner?.role).toBe('owner');
  });
});

// ─── getMyCrews ───────────────────────────────────────────────────────────────

describe('getMyCrews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns crews the user is a member of', async () => {
    const crew = makeCrewDoc();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'crew-123', data: () => crew }],
    });

    const result = await getMyCrews();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(mockWhere).toHaveBeenCalledWith('memberUids', 'array-contains', 'my-uid');
  });

  // ── Empty result ──────────────────────────────────────────────────────────

  it('returns empty array when user has no crews', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getMyCrews();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await getMyCrews();
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});

// ─── getCrewById ──────────────────────────────────────────────────────────────

describe('getCrewById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Found ─────────────────────────────────────────────────────────────────

  it('returns the crew when it exists', async () => {
    const crew = makeCrewDoc();
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, id: 'crew-123', data: () => crew });

    const result = await getCrewById('crew-123');
    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('returns null data (not an error) when crew does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getCrewById('nonexistent');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
});

// ─── searchCrewByName ─────────────────────────────────────────────────────────

describe('searchCrewByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('queries with correct prefix range on nameLower', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    await searchCrewByName('iron');

    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls.some((c) => c[0] === 'nameLower' && c[1] === '>=' && c[2] === 'iron')).toBe(true);
    expect(whereCalls.some((c) => c[0] === 'nameLower' && c[1] === '<=' && c[2] === 'iron\uf8ff')).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith(20);
  });

  // ── Input normalisation ───────────────────────────────────────────────────

  it('lowercases and trims the query before searching', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    await searchCrewByName('  IRON  ');

    const whereCalls = mockWhere.mock.calls;
    expect(whereCalls[0][2]).toBe('iron');
  });

  // ── Empty query ───────────────────────────────────────────────────────────

  it('returns error for empty query', async () => {
    const result = await searchCrewByName('   ');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/empty/i);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  // ── Returns results ───────────────────────────────────────────────────────

  it('returns matched crews', async () => {
    const crew = makeCrewDoc();
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'crew-123', data: () => crew }],
    });

    const result = await searchCrewByName('iron');
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });
});

// ─── regenerateInviteCode ─────────────────────────────────────────────────────

describe('regenerateInviteCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('deletes old code and writes new code inside a transaction', async () => {
    const txDelete = jest.fn();
    const txSet = jest.fn();
    const txUpdate = jest.fn();

    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest
          .fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => makeCrewDoc(),
          })
          .mockResolvedValueOnce({ exists: () => false }), // new code not taken
        delete: txDelete,
        set: txSet,
        update: txUpdate,
      };
      await fn(tx);
    });

    const result = await regenerateInviteCode('crew-123');
    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(txDelete).toHaveBeenCalledTimes(1); // old code deleted
    expect(txSet).toHaveBeenCalledTimes(1);    // new code written
    expect(txUpdate).toHaveBeenCalledTimes(1); // crew updated
  });

  // ── Non-owner blocked ─────────────────────────────────────────────────────

  it('returns error when caller is not the owner', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({
          exists: () => true,
          data: () => makeCrewDoc({ createdBy: 'someone-else' }),
        }),
      };
      await fn(tx);
    });

    const result = await regenerateInviteCode('crew-123');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/owner/i);
  });

  // ── Crew not found ────────────────────────────────────────────────────────

  it('returns error when crew does not exist', async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: jest.fn().mockResolvedValueOnce({ exists: () => false }),
      };
      await fn(tx);
    });

    const result = await regenerateInviteCode('bad-crew');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not found/i);
  });
});

// ─── removeMember ─────────────────────────────────────────────────────────────

describe('removeMember', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteBatch.mockReturnValue(makeBatch());
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('removes target member from both arrays', async () => {
    const crew = makeCrewDoc({
      createdBy: 'my-uid',
      memberUids: ['my-uid', 'target-uid'],
      members: [
        makeCrewMember({ uid: 'my-uid', role: 'owner' }),
        makeCrewMember({ uid: 'target-uid', role: 'member' }),
      ],
    });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => crew });

    const result = await removeMember('crew-123', 'target-uid');
    expect(result.error).toBeNull();
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    const updateArg = mockBatchUpdate.mock.calls[0][1];
    // members should not include target-uid
    expect(updateArg.members.some((m: CrewMember) => m.uid === 'target-uid')).toBe(false);
  });

  // ── Cannot remove self ────────────────────────────────────────────────────

  it('returns error when trying to remove self', async () => {
    const result = await removeMember('crew-123', 'my-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/leaveCrew/);
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  // ── Non-owner blocked ─────────────────────────────────────────────────────

  it('returns error when caller is not the owner', async () => {
    const crew = makeCrewDoc({
      createdBy: 'owner-uid',
      memberUids: ['owner-uid', 'my-uid', 'target-uid'],
    });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => crew });

    const result = await removeMember('crew-123', 'target-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/owner/i);
  });

  // ── Target not a member ───────────────────────────────────────────────────

  it('returns error when target uid is not in the crew', async () => {
    const crew = makeCrewDoc({
      createdBy: 'my-uid',
      memberUids: ['my-uid'],
    });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => crew });

    const result = await removeMember('crew-123', 'stranger-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not a member/i);
  });

  // ── Crew not found ────────────────────────────────────────────────────────

  it('returns error when crew does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await removeMember('bad-crew', 'target-uid');
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toMatch(/not found/i);
  });

  // ── Not authenticated ──────────────────────────────────────────────────────

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const original = auth.currentUser;
    auth.currentUser = null;

    const result = await removeMember('crew-123', 'target-uid');
    expect(result.error).toBeTruthy();

    auth.currentUser = original;
  });
});
