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

const mockGetDoc = jest.fn();
const mockDoc = jest.fn((_db: unknown, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments.length > 0 ? segments[segments.length - 1] : 'doc-id',
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...args: string[]) => mockDoc(_db, ...args)),
  getDoc: jest.fn((...args: unknown[]) => mockGetDoc(...args)),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}));

// ── communityFirestore mock ────────────────────────────────────────────────────

const mockGetGlobalDocument = jest.fn();

jest.mock('../services/firebase/communityFirestore', () => ({
  getGlobalDocument: jest.fn((...args: unknown[]) => mockGetGlobalDocument(...args)),
}));

// ── Imports ────────────────────────────────────────────────────────────────────

import {
  getGlobalLeaderboard,
  getUserRank,
  getFriendsLeaderboard,
  getCrewLeaderboard,
} from '../services/leaderboardService';
import type { PublicProfile } from '../types/social';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeProfile(uid: string, overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    uid,
    username: `user_${uid}`,
    displayHandle: `User ${uid}`,
    totalXP: 1000,
    level: 5,
    tier: 'silver',
    featuredStat: 'totalXP',
    topAchievementIds: [],
    leaderboardOptOut: false,
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

function makeDocSnap(data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    data: () => data,
    id: data?.uid ?? 'doc-id',
  };
}

// ─── getGlobalLeaderboard ─────────────────────────────────────────────────────

describe('getGlobalLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getGlobalDocument with correct boardId format', async () => {
    mockGetGlobalDocument.mockResolvedValue({ data: null, error: null });
    await getGlobalLeaderboard('weeklyVolume', 'weekly');
    expect(mockGetGlobalDocument).toHaveBeenCalledWith('leaderboards', 'weeklyVolume_weekly');
  });

  it('returns the board document on success', async () => {
    const board = {
      category: 'weeklyVolume',
      timeframe: 'weekly',
      entries: [],
      totalParticipants: 42,
      computedAt: {} as any,
    };
    mockGetGlobalDocument.mockResolvedValue({ data: board, error: null });
    const result = await getGlobalLeaderboard('weeklyVolume', 'weekly');
    expect(result.error).toBeNull();
    expect(result.data?.totalParticipants).toBe(42);
  });

  it('returns null data when board does not exist yet', async () => {
    mockGetGlobalDocument.mockResolvedValue({ data: null, error: null });
    const result = await getGlobalLeaderboard('allTimeXP', 'allTime');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns error when getGlobalDocument fails', async () => {
    mockGetGlobalDocument.mockResolvedValue({ data: null, error: new Error('Firestore error') });
    const result = await getGlobalLeaderboard('weeklyXP', 'weekly');
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
  });

  it('handles allTime timeframe for allTimeXP', async () => {
    mockGetGlobalDocument.mockResolvedValue({ data: null, error: null });
    await getGlobalLeaderboard('allTimeXP', 'allTime');
    expect(mockGetGlobalDocument).toHaveBeenCalledWith('leaderboards', 'allTimeXP_allTime');
  });
});

// ─── getUserRank ──────────────────────────────────────────────────────────────

describe('getUserRank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when user has no public profile', async () => {
    mockGetDoc.mockResolvedValue(makeDocSnap(null));
    const result = await getUserRank('weeklyVolume', 'weekly');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns rank data when leaderboardSummary exists', async () => {
    const rankData = { rank: 3, totalParticipants: 500, percentile: 99, value: 1200 };
    const profile = {
      ...makeProfile('my-uid'),
      leaderboardSummary: {
        weeklyVolume_weekly: rankData,
      },
    };
    mockGetDoc.mockResolvedValue(makeDocSnap(profile));
    const result = await getUserRank('weeklyVolume', 'weekly');
    expect(result.error).toBeNull();
    expect(result.data?.rank).toBe(3);
    expect(result.data?.totalParticipants).toBe(500);
    expect(result.data?.percentile).toBe(99);
  });

  it('returns null when summary key does not exist', async () => {
    const profile = { ...makeProfile('my-uid'), leaderboardSummary: {} };
    mockGetDoc.mockResolvedValue(makeDocSnap(profile));
    const result = await getUserRank('monthlyVolume', 'monthly');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const originalUid = auth.currentUser;
    auth.currentUser = null;

    const result = await getUserRank('weeklyXP', 'weekly');
    expect(result.error).not.toBeNull();

    auth.currentUser = originalUid;
  });
});

// ─── getFriendsLeaderboard ────────────────────────────────────────────────────

describe('getFriendsLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns entries sorted descending by stat value', async () => {
    const profiles = [
      makeProfile('friend-1', { stats: { weeklyVolume: 500 } }),
      makeProfile('friend-2', { stats: { weeklyVolume: 1200 } }),
      makeProfile('my-uid', { stats: { weeklyVolume: 800 } }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1', 'friend-2']);
    expect(result.error).toBeNull();
    const entries = result.data!;
    expect(entries).toHaveLength(3);
    expect(entries[0].uid).toBe('friend-2');
    expect(entries[0].rank).toBe(1);
    expect(entries[1].uid).toBe('my-uid');
    expect(entries[1].rank).toBe(2);
    expect(entries[2].uid).toBe('friend-1');
    expect(entries[2].rank).toBe(3);
  });

  it('excludes users with zero stat value', async () => {
    const profiles = [
      makeProfile('friend-1', { stats: { weeklyVolume: 0 } }),
      makeProfile('my-uid', { stats: { weeklyVolume: 500 } }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1']);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].uid).toBe('my-uid');
  });

  it('assigns the same rank to tied entries', async () => {
    const profiles = [
      makeProfile('friend-1', { stats: { weeklyVolume: 500 } }),
      makeProfile('friend-2', { stats: { weeklyVolume: 500 } }),
      makeProfile('my-uid', { stats: { weeklyVolume: 300 } }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1', 'friend-2']);
    expect(result.data![0].rank).toBe(1);
    expect(result.data![1].rank).toBe(1);
    expect(result.data![2].rank).toBe(3);
  });

  it('returns empty array when no profiles have stat data', async () => {
    const profiles = [
      makeProfile('my-uid', { stats: {} }),
      makeProfile('friend-1', { stats: {} }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1']);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(0);
  });

  it('automatically includes the current user (my-uid)', async () => {
    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      return Promise.resolve(makeDocSnap(makeProfile(uid, { stats: { weeklyVolume: 100 } })));
    });

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1']);
    const uids = result.data!.map((e) => e.uid);
    expect(uids).toContain('my-uid');
    expect(uids).toContain('friend-1');
  });

  it('caps at 50 UIDs', async () => {
    const manyFriends = Array.from({ length: 55 }, (_, i) => `friend-${i}`);

    mockGetDoc.mockResolvedValue(makeDocSnap(makeProfile('any', { stats: { weeklyVolume: 100 } })));

    await getFriendsLeaderboard('weeklyVolume', 'weekly', manyFriends);
    // getDoc should be called at most 50 times (50 UIDs including current user)
    expect(mockGetDoc.mock.calls.length).toBeLessThanOrEqual(50);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const originalUid = auth.currentUser;
    auth.currentUser = null;

    const result = await getFriendsLeaderboard('weeklyVolume', 'weekly', ['friend-1']);
    expect(result.error).not.toBeNull();

    auth.currentUser = originalUid;
  });
});

// ─── getCrewLeaderboard ───────────────────────────────────────────────────────

describe('getCrewLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes current user in crew leaderboard', async () => {
    const profiles = [
      makeProfile('crew-member-1', { stats: { weeklyDistance: 10 } }),
      makeProfile('my-uid', { stats: { weeklyDistance: 15 } }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getCrewLeaderboard('weeklyDistance', 'weekly', ['crew-member-1']);
    expect(result.error).toBeNull();
    const uids = result.data!.map((e) => e.uid);
    expect(uids).toContain('my-uid');
    expect(uids).toContain('crew-member-1');
  });

  it('ranks crew members correctly', async () => {
    const profiles = [
      makeProfile('crew-member-1', { stats: { weeklyDistance: 5 } }),
      makeProfile('my-uid', { stats: { weeklyDistance: 20 } }),
    ];

    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const uid = ref.path.split('/').pop()!;
      const profile = profiles.find((p) => p.uid === uid) ?? null;
      return Promise.resolve(makeDocSnap(profile));
    });

    const result = await getCrewLeaderboard('weeklyDistance', 'weekly', ['crew-member-1']);
    expect(result.data![0].uid).toBe('my-uid');
    expect(result.data![0].rank).toBe(1);
    expect(result.data![1].uid).toBe('crew-member-1');
    expect(result.data![1].rank).toBe(2);
  });

  it('returns error when not authenticated', async () => {
    const { auth } = require('../services/firebase/index');
    const originalUid = auth.currentUser;
    auth.currentUser = null;

    const result = await getCrewLeaderboard('weeklyDistance', 'weekly', ['crew-1']);
    expect(result.error).not.toBeNull();

    auth.currentUser = originalUid;
  });
});
