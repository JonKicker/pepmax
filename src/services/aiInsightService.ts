/**
 * AI Insight service — generates a personalized weekly insight using Claude.
 *
 * Security:
 * - System prompt and user data are strictly separated (Ray Item 1).
 * - User strings are sanitized and truncated to 64 chars before inclusion.
 * - Only aggregate numeric data is sent — no free-text notes or descriptions.
 * - AbortController prevents concurrent in-flight API calls (Ray Item 2).
 * - Result is cached in Firestore for 7 days to minimise API cost.
 *
 * ⚠️  SECURITY NOTE: EXPO_PUBLIC_ANTHROPIC_API_KEY is bundled in the JS bundle
 * and is extractable from the app binary. Acceptable for dev/personal builds only.
 * Before any App Store / Play Store distribution, move this call behind a
 * Firebase Cloud Function and set a hard spend cap in the Anthropic console.
 */
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { getDocument, mergeDocument, COLLECTIONS } from './firebase/firestore';
import { getPeptides } from './peptideService';
import { getRecentSessions } from './workoutSessionService';
import { getRecentSessions as getRecentCardio } from './cardioService';
import { getWeightHistory } from './bodyWeightService';
import type { ServiceResult } from '../types/service';
import { addBreadcrumb } from './errorReporting';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';

// Module-level in-flight guard — prevents concurrent API calls (Ray Item 2).
let inflightController: AbortController | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sanitize a user-controlled string: truncate + strip non-alphanumeric chars.
 * Prevents prompt injection and limits payload size. (Ray Item 1)
 */
function safeStr(s: string, max = 64): string {
  return s
    .slice(0, max)
    .replace(/[^\w\s\-.,()]/g, '')
    .trim();
}

type InsightPayload = {
  weeklyWorkouts: number;
  weeklyCardioSessions: number;
  weeklyCardioDistanceKm: number;
  peptideNames: string[]; // sanitized, max 8 entries, max 64 chars each
  weightTrendKg: number | null;
};

async function gatherPayload(): Promise<InsightPayload> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [sessionsResult, cardioResult, peptidesResult, weightsResult] = await Promise.all([
    getRecentSessions(50),
    getRecentCardio(50),
    getPeptides(),
    getWeightHistory(sevenDaysAgoStr),
  ]);

  // Workouts in last 7 days
  const weeklyWorkouts = (sessionsResult.data ?? []).filter((s) => {
    const d = s.startedAt?.toDate?.();
    return d && d >= sevenDaysAgo;
  }).length;

  // Cardio in last 7 days
  const recentCardio = (cardioResult.data ?? []).filter((s) => {
    const d = s.startedAt?.toDate?.();
    return d && d >= sevenDaysAgo;
  });
  const weeklyCardioSessions = recentCardio.length;
  const weeklyCardioDistanceKm =
    Math.round(
      (recentCardio.reduce((sum, s) => sum + ((s as any).distanceMeters ?? 0), 0) / 1000) * 10,
    ) / 10;

  // Peptide names — sanitized, capped at 8 (Ray Item 1: no free-text, safe strings only)
  const peptideNames = (peptidesResult.data ?? [])
    .map((p) => safeStr(p.name))
    .filter(Boolean)
    .slice(0, 8);

  // Weight trend (first vs last entry in window)
  const weights = weightsResult.data ?? [];
  let weightTrendKg: number | null = null;
  if (weights.length >= 2) {
    const first = weights[0].weight;
    const last = weights[weights.length - 1].weight;
    weightTrendKg = Math.round((last - first) * 100) / 100;
  }

  return {
    weeklyWorkouts,
    weeklyCardioSessions,
    weeklyCardioDistanceKm,
    peptideNames,
    weightTrendKg,
  };
}

function buildUserMessage(payload: InsightPayload): string {
  // Only structured numeric + sanitized string data — no raw user input (Ray Item 1)
  const lines: string[] = [
    `Workouts this week: ${payload.weeklyWorkouts}`,
    `Cardio sessions this week: ${payload.weeklyCardioSessions}`,
  ];

  if (payload.weeklyCardioDistanceKm > 0) {
    lines.push(`Total cardio distance: ${payload.weeklyCardioDistanceKm} km`);
  }
  if (payload.peptideNames.length > 0) {
    lines.push(`Peptides on protocol: ${payload.peptideNames.join(', ')}`);
  }
  if (payload.weightTrendKg !== null) {
    const sign = payload.weightTrendKg >= 0 ? '+' : '';
    lines.push(`Weight change this week: ${sign}${payload.weightTrendKg} kg`);
  }

  return `Weekly fitness summary:\n${lines.join('\n')}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a weekly insight string.
 * Checks Firestore cache first — skips API call if insight is <7 days old.
 * Pass forceRefresh=true to bypass the cache (tap-to-refresh).
 */
export async function getWeeklyInsight(
  forceRefresh = false,
): Promise<ServiceResult<string>> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { data: null, error: new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY not configured') };
  }

  // ── 1. Check Firestore cache ──────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await getDocument(COLLECTIONS.AI_INSIGHTS, 'weekly');
    if (!cached.error && cached.data) {
      const doc = cached.data as { insight?: string; generatedAt?: Timestamp };
      const cachedMs = doc.generatedAt?.toMillis?.() ?? 0;
      if (doc.insight && Date.now() - cachedMs < CACHE_TTL_MS) {
        return { data: doc.insight, error: null };
      }
    }
  }

  // ── 2. Abort any in-flight call (Ray Item 2) ─────────────────────────────
  if (inflightController) {
    inflightController.abort();
  }
  inflightController = new AbortController();
  const { signal } = inflightController;

  // 15-second timeout — aborts via the same AbortController so the existing
  // AbortError catch path handles cleanup correctly. (Ray build-blocker fix)
  const timeoutId = setTimeout(() => inflightController?.abort(), 15_000);

  try {
    // ── 3. Gather aggregated data (no free-text) ──────────────────────────
    const payload = await gatherPayload();

    if (signal.aborted) return { data: null, error: new Error('Cancelled') };

    // ── 4. Call Claude API ────────────────────────────────────────────────
    addBreadcrumb('api', 'ai_insight_request', {});
    const response = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        // System prompt strictly separated from user data (Ray Item 1)
        system:
          'You are a supportive fitness and wellness coach. ' +
          'Given a brief weekly summary, write exactly 2-3 encouraging sentences of personalized insight. ' +
          'Base your response only on the provided numbers. ' +
          'Do not invent data. Do not give medical advice.',
        messages: [{ role: 'user', content: buildUserMessage(payload) }],
      }),
    });

    if (signal.aborted) return { data: null, error: new Error('Cancelled') };

    if (!response.ok) {
      const body = await response.text();
      return {
        data: null,
        error: new Error(`Claude API ${response.status}: ${body.slice(0, 200)}`),
      };
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text: string }>;
    };
    const insight = json.content?.find((b) => b.type === 'text')?.text?.trim();
    if (!insight) {
      return { data: null, error: new Error('Empty response from Claude') };
    }

    // ── 5. Cache in Firestore ─────────────────────────────────────────────
    await mergeDocument(COLLECTIONS.AI_INSIGHTS, 'weekly', {
      insight,
      generatedAt: serverTimestamp(),
    } as any);

    return { data: insight, error: null };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { data: null, error: new Error('Cancelled') }; // Graceful abort
    }
    return { data: null, error: err as Error };
  } finally {
    clearTimeout(timeoutId);
    inflightController = null;
  }
}
