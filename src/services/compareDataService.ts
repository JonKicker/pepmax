/**
 * compareDataService — orchestration layer for the Compare screen.
 *
 * Delegates all Firestore reads to compareService. No raw SDK calls here.
 *
 * fetchCompareData(opponentUid):
 *   1. Fetches own scores + opponent scores in parallel (10s timeout).
 *   2. Fetches own privacy settings (graceful degrade on failure).
 *   3. Returns a CompareState discriminated union.
 *
 * Error mapping:
 *   - Opponent read returns error → status: 'blocked'
 *   - Opponent doc missing        → status: 'unavailable'
 *   - Own scores missing          → status: 'error' (CF hasn't run yet)
 *   - Timeout or other throws     → status: 'error'
 */
import { addBreadcrumb } from './errorReporting';
import { analytics, AnalyticsEvent } from './analytics';
import {
  getMyCompareScores,
  getCompareScoresForUser,
  getComparePrivacy,
} from './compareService';
import { DEFAULT_COMPARE_PRIVACY } from '../types/compare';
import type { CompareState, ComparePrivacy } from '../types/compare';

// ─── Constants ────────────────────────────────────────────────────────────────

export const OWN_SCORES_MISSING = 'OWN_SCORES_MISSING';

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 50;

// ─── In-memory session cache ─────────────────────────────────────────────────

type CacheEntry = {
  state: CompareState & { status: 'ready' };
  storedAt: number;
};

const _cache = new Map<string, CacheEntry>();

/** Clears the in-memory compare cache. Useful for logout / test teardown. */
export function clearCompareCache(): void {
  _cache.clear();
}

/** @internal Exposed for tests only. */
export { _cache };

// ─── Timeout helper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.then(
      (v) => { clearTimeout(timer); return v; },
      (e) => { clearTimeout(timer); throw e; },
    ),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

// ─── fetchCompareData ─────────────────────────────────────────────────────────

/**
 * Orchestrates all data fetches needed for the Compare screen.
 *
 * Returns a CompareState that is ready to be consumed by the UI without
 * any additional null-checks.
 */
export async function fetchCompareData(opponentUid: string): Promise<CompareState> {
  addBreadcrumb('compareDataService', 'fetchCompareData', { opponentUid });

  // Check cache first
  const cached = _cache.get(opponentUid);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return cached.state;
  }
  // Remove stale entry if present
  if (cached) {
    _cache.delete(opponentUid);
  }

  try {
    // Run own scores + opponent scores in parallel with a shared timeout
    const [myResult, opponentResult] = await withTimeout(
      Promise.all([
        getMyCompareScores(),
        getCompareScoresForUser(opponentUid),
      ]),
      FETCH_TIMEOUT_MS,
      'fetchCompareData',
    );

    // Own scores must exist — if not, the CF hasn't run for this user yet
    if (myResult.error || myResult.data === null) {
      const detail = myResult.error?.message ?? 'Your compare scores are not available yet';
      analytics.track(AnalyticsEvent.COMPARE_FETCH_FAILED, { reason: 'own_scores_missing' });
      return { status: 'error', error: OWN_SCORES_MISSING + ': ' + detail };
    }

    // Opponent error → treat as blocked (block check happens inside compareService)
    if (opponentResult.error) {
      return { status: 'blocked' };
    }

    // Opponent doc missing → they haven't opted in / CF hasn't run
    if (opponentResult.data === null) {
      return { status: 'unavailable' };
    }

    // Fetch own privacy settings — gracefully degrade to defaults on failure
    let myPrivacy: ComparePrivacy;
    try {
      const privacyResult = await getComparePrivacy();
      myPrivacy = privacyResult.data ?? {
        ...DEFAULT_COMPARE_PRIVACY,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };
    } catch {
      // Privacy fetch failure does NOT block the compare screen
      myPrivacy = {
        ...DEFAULT_COMPARE_PRIVACY,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };
    }

    addBreadcrumb('compareDataService', 'fetchCompareData:success', { opponentUid });

    const readyState: CompareState & { status: 'ready' } = {
      status: 'ready',
      data: {
        myScores: myResult.data,
        opponentScores: opponentResult.data,
        myPrivacy,
      },
    };

    // Store in cache — evict oldest if at capacity
    if (_cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = _cache.keys().next().value;
      if (oldestKey !== undefined) {
        _cache.delete(oldestKey);
      }
    }
    _cache.set(opponentUid, { state: readyState, storedAt: Date.now() });

    return readyState;
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error fetching compare data';
    analytics.track(AnalyticsEvent.COMPARE_FETCH_FAILED, { reason: 'exception' });
    return { status: 'error', error };
  }
}
