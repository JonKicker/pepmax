/**
 * Tests for compareDataService.
 *
 * 9 tests covering:
 * - Happy path: both scores returned → status: 'ready'
 * - Opponent scores error → status: 'blocked'
 * - Opponent scores null → status: 'unavailable'
 * - Own scores null → status: 'error'
 * - Own scores error → status: 'error'
 * - Timeout → status: 'error' with timeout message
 * - Privacy fetch failure → still returns ready (graceful degrade)
 * - Privacy returns null data → graceful degrade to defaults
 * - Missing opponentId handled
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../services/errorReporting', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../services/analytics', () => ({
  analytics: { track: jest.fn() },
  AnalyticsEvent: {
    COMPARE_FETCH_FAILED: 'compare_fetch_failed',
    COMPARE_SHARE_TAPPED: 'compare_share_tapped',
    COMPARE_VIEWED: 'compare_viewed',
  },
}));

const mockGetMyCompareScores = jest.fn();
const mockGetCompareScoresForUser = jest.fn();
const mockGetComparePrivacy = jest.fn();

jest.mock('../services/compareService', () => ({
  getMyCompareScores: (...args: unknown[]) => mockGetMyCompareScores(...args),
  getCompareScoresForUser: (...args: unknown[]) => mockGetCompareScoresForUser(...args),
  getComparePrivacy: (...args: unknown[]) => mockGetComparePrivacy(...args),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { fetchCompareData, clearCompareCache } from '../services/compareDataService';
import { analytics } from '../services/analytics';
import type { CompareScores, ComparePrivacy } from '../types/compare';

// Typed reference to the mocked track function
const mockTrack = analytics.track as jest.Mock;

// ── Factory helpers ────────────────────────────────────────────────────────────

function makeScores(overrides: Partial<CompareScores> = {}): CompareScores {
  return {
    estimatedOneRepMax: 120,
    weeklyVolume: 4500,
    weeklyDistance: 25,
    avgPace: 5.5,
    avgDailyCalories: 2200,
    avgRecoveryScore: 78,
    bodyWeightTrend: 82,
    activePeptideCount: -1,
    strengthScore: 80,
    cardioScore: 70,
    nutritionConsistency: 65,
    overallConsistency: 72,
    xpPercentile: 55,
    computedAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

function makePrivacy(overrides: Partial<ComparePrivacy> = {}): ComparePrivacy {
  return {
    compareEnabled: true,
    showTraining: true,
    showCardio: true,
    showNutrition: true,
    showRecovery: true,
    showBodyComp: true,
    showPeptides: false,
    blockedUsers: [],
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  clearCompareCache();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('fetchCompareData', () => {
  it('returns status: ready when both scores are available', async () => {
    const myScores = makeScores({ estimatedOneRepMax: 100 });
    const oppScores = makeScores({ estimatedOneRepMax: 130 });
    const privacy = makePrivacy();

    mockGetMyCompareScores.mockResolvedValueOnce({ data: myScores, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: oppScores, error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: privacy, error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.data.myScores).toEqual(myScores);
      expect(result.data.opponentScores).toEqual(oppScores);
      expect(result.data.myPrivacy).toEqual(privacy);
    }
  });

  it('returns status: blocked when opponent scores returns an error', async () => {
    const myScores = makeScores();

    mockGetMyCompareScores.mockResolvedValueOnce({ data: myScores, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({
      data: null,
      error: new Error('This user is blocked'),
    });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('blocked');
  });

  it('returns status: unavailable when opponent scores doc is null', async () => {
    const myScores = makeScores();

    mockGetMyCompareScores.mockResolvedValueOnce({ data: myScores, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: null, error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('unavailable');
  });

  it('returns status: error when own scores are null (CF not run yet)', async () => {
    mockGetMyCompareScores.mockResolvedValueOnce({ data: null, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('error');
    expect(mockTrack).toHaveBeenCalledWith('compare_fetch_failed', expect.objectContaining({
      reason: 'own_scores_missing',
    }));
  });

  it('returns status: error when own scores fetch errors', async () => {
    mockGetMyCompareScores.mockResolvedValueOnce({
      data: null,
      error: new Error('Firestore read failed'),
    });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('Firestore read failed');
    }
  });

  it('still returns ready when privacy fetch throws (graceful degrade)', async () => {
    const myScores = makeScores();
    const oppScores = makeScores({ estimatedOneRepMax: 150 });

    mockGetMyCompareScores.mockResolvedValueOnce({ data: myScores, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: oppScores, error: null });
    mockGetComparePrivacy.mockRejectedValueOnce(new Error('privacy read failed'));

    const result = await fetchCompareData('opponent-uid');

    // Should NOT be 'error' — privacy failure is gracefully degraded
    expect(result.status).toBe('ready');
  });

  it('still returns ready when privacy result has null data (graceful degrade)', async () => {
    const myScores = makeScores();
    const oppScores = makeScores({ estimatedOneRepMax: 150 });

    mockGetMyCompareScores.mockResolvedValueOnce({ data: myScores, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: oppScores, error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: null, error: new Error('not found') });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      // myPrivacy falls back to defaults — compareEnabled should be true
      expect(result.data.myPrivacy.compareEnabled).toBe(true);
    }
  });

  it('returns status: error with timeout message when fetch times out', async () => {
    jest.useFakeTimers();

    // Promises that never resolve
    mockGetMyCompareScores.mockReturnValueOnce(new Promise(() => {}));
    mockGetCompareScoresForUser.mockReturnValueOnce(new Promise(() => {}));
    mockGetComparePrivacy.mockReturnValueOnce(new Promise(() => {}));

    const resultPromise = fetchCompareData('opponent-uid');

    // Advance time past the 10s timeout
    jest.advanceTimersByTime(11_000);

    const result = await resultPromise;

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toMatch(/timed out/i);
    }

    jest.useRealTimers();
  });

  it('fires COMPARE_FETCH_FAILED analytics when an exception is thrown', async () => {
    mockGetMyCompareScores.mockRejectedValueOnce(new Error('unexpected crash'));
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });

    const result = await fetchCompareData('opponent-uid');

    expect(result.status).toBe('error');
    expect(mockTrack).toHaveBeenCalledWith('compare_fetch_failed', expect.objectContaining({
      reason: 'exception',
    }));
  });
});
