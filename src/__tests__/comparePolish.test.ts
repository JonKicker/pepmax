/**
 * Tests for Compare polish pass additions.
 *
 * Covers:
 * - In-memory session cache (set, get, TTL expiry, eviction at 50, clearCompareCache)
 * - buildA11yLabel helper for CompareStatRow (win/lose/tie)
 * - CompareState 'self' status type existence
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    theme: { dark: false, colors: {} },
    setColorScheme: jest.fn(),
  }),
}));

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

// ── Imports ────────────────────────────────────────────────────────────────────

import {
  fetchCompareData,
  clearCompareCache,
  _cache,
  OWN_SCORES_MISSING,
} from '../services/compareDataService';
import { buildA11yLabel } from '../components/compare/CompareStatRow';
import { buildRadarA11yLabel } from '../components/compare/RadarChart';
import type { CompareState, CompareScores, ComparePrivacy } from '../types/compare';

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

function makePrivacy(): ComparePrivacy {
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
  };
}

/** Set up mocks for a successful fetch. */
function mockSuccessfulFetch(uid?: string) {
  mockGetMyCompareScores.mockResolvedValueOnce({ data: makeScores(), error: null });
  mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });
  mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  clearCompareCache();
});

// ── Cache tests ────────────────────────────────────────────────────────────────

describe('compareDataService cache', () => {
  it('caches a ready result and returns it on subsequent call', async () => {
    mockSuccessfulFetch();
    const first = await fetchCompareData('uid-1');
    expect(first.status).toBe('ready');

    // Second call should NOT invoke mocks again (cache hit)
    const second = await fetchCompareData('uid-1');
    expect(second.status).toBe('ready');
    // getMyCompareScores was only called once (first fetch)
    expect(mockGetMyCompareScores).toHaveBeenCalledTimes(1);
  });

  it('returns fresh data after TTL expires', async () => {
    mockSuccessfulFetch();
    const first = await fetchCompareData('uid-ttl');
    expect(first.status).toBe('ready');

    // Manually expire the cache entry
    const entry = _cache.get('uid-ttl');
    if (entry) {
      entry.storedAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    }

    // Set up mocks for fresh fetch
    mockSuccessfulFetch();
    const second = await fetchCompareData('uid-ttl');
    expect(second.status).toBe('ready');
    // Should have called mocks again
    expect(mockGetMyCompareScores).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest entry when cache reaches 50 entries', async () => {
    // Pre-fill cache with 50 entries
    for (let i = 0; i < 50; i++) {
      _cache.set(`uid-${i}`, {
        state: { status: 'ready', data: { myScores: makeScores(), opponentScores: makeScores(), myPrivacy: makePrivacy() } },
        storedAt: Date.now(),
      });
    }
    expect(_cache.size).toBe(50);

    // Fetch for a new uid — should evict the oldest (uid-0)
    mockSuccessfulFetch();
    await fetchCompareData('uid-new');

    expect(_cache.size).toBe(50); // still 50, not 51
    expect(_cache.has('uid-0')).toBe(false);
    expect(_cache.has('uid-new')).toBe(true);
  });

  it('clearCompareCache empties the cache', async () => {
    mockSuccessfulFetch();
    await fetchCompareData('uid-clear');
    expect(_cache.size).toBeGreaterThan(0);

    clearCompareCache();
    expect(_cache.size).toBe(0);
  });

  it('does not cache non-ready states (e.g. error)', async () => {
    mockGetMyCompareScores.mockResolvedValueOnce({ data: null, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('uid-err');
    expect(result.status).toBe('error');
    expect(_cache.has('uid-err')).toBe(false);
  });
});

// ── buildA11yLabel tests ───────────────────────────────────────────────────────

describe('buildA11yLabel', () => {
  it('returns tie label when leftWins is null', () => {
    const label = buildA11yLabel('Est. 1RM', '120 kg', '120 kg', null);
    expect(label).toContain('tie');
    expect(label).toContain('Est. 1RM');
    expect(label).toContain('120 kg');
  });

  it('returns "You lead" when leftWins is true', () => {
    const label = buildA11yLabel('Vol/Week', '4500 kg', '3200 kg', true);
    expect(label).toContain('You lead');
    expect(label).toContain('Vol/Week');
  });

  it('returns "Opponent leads" when leftWins is false', () => {
    const label = buildA11yLabel('Avg Pace', '6:30/km', '5:45/km', false);
    expect(label).toContain('Opponent leads');
    expect(label).toContain('Avg Pace');
  });
});

// ── buildRadarA11yLabel tests ────────────────────────────────────────────────────

describe('buildRadarA11yLabel', () => {
  it('returns unavailable message for empty axes', () => {
    const label = buildRadarA11yLabel([], makeScores(), makeScores());
    expect(label).toBe('Radar chart unavailable, no shared score data');
  });

  it('includes axis names and both scores for 3+ axes', () => {
    const userScores = makeScores({ strengthScore: 80, cardioScore: 70, nutritionConsistency: 65 });
    const oppScores = makeScores({ strengthScore: 90, cardioScore: 60, nutritionConsistency: 55 });
    // Build axes manually matching the shape filterAxes would produce
    const axes = [
      { key: 'strengthScore' as keyof CompareScores, label: 'Strength' },
      { key: 'cardioScore' as keyof CompareScores, label: 'Cardio' },
      { key: 'nutritionConsistency' as keyof CompareScores, label: 'Nutrition' },
    ];
    const label = buildRadarA11yLabel(axes, userScores, oppScores);
    expect(label).toContain('Strength');
    expect(label).toContain('You 80');
    expect(label).toContain('Opponent 90');
    expect(label).toContain('Cardio');
    expect(label).toContain('You 70');
    expect(label).toContain('Opponent 60');
    expect(label).toContain('Nutrition');
    expect(label).toContain('You 65');
    expect(label).toContain('Opponent 55');
  });
});

// ── OWN_SCORES_MISSING constant tests ──────────────────────────────────────────

describe('OWN_SCORES_MISSING error code', () => {
  it('error message returned by fetchCompareData starts with OWN_SCORES_MISSING when own scores are null', async () => {
    mockGetMyCompareScores.mockResolvedValueOnce({ data: null, error: null });
    mockGetCompareScoresForUser.mockResolvedValueOnce({ data: makeScores(), error: null });
    mockGetComparePrivacy.mockResolvedValueOnce({ data: makePrivacy(), error: null });

    const result = await fetchCompareData('uid-missing');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.startsWith(OWN_SCORES_MISSING)).toBe(true);
      expect(result.error).toContain('not available yet');
    }
  });

  it('OWN_SCORES_MISSING constant equals the pinned string', () => {
    expect(OWN_SCORES_MISSING).toBe('OWN_SCORES_MISSING');
  });
});

// ── Self-compare state type ────────────────────────────────────────────────────

describe('CompareState self status', () => {
  it('accepts a self status in the CompareState union', () => {
    const state: CompareState = { status: 'self' };
    expect(state.status).toBe('self');
  });
});
