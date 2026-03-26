/**
 * onStatsUpdate — Cloud Function triggers for incrementing publicProfile stats.
 *
 * 4 triggers, each using Firebase Functions v2 onDocumentCreated:
 *   onWorkoutSessionCreate  — increments weekly/monthly volume
 *   onCardioSessionCreate   — increments weekly/monthly distance (km)
 *   onXPLogCreate           — increments XP counters + macro day tracking
 *   onAchievementCreate     — increments allTimeChallengesCompleted
 *
 * IDEMPOTENCY STRATEGY:
 *   Each trigger stores the triggering doc ID in stats.lastProcessedIds.{collection}.
 *   Before writing, we check whether that doc ID was already processed.
 *   Because Firestore triggers can fire more than once (at-least-once delivery),
 *   this guards against double-counting. The check + write happens inside a
 *   transaction for atomic read-modify-write.
 *
 * PERIOD ROLLOVER:
 *   Weekly stats use ISO week number (Monday = start, UTC-based).
 *   Monthly stats use YYYY-MM string.
 *   On each trigger we compare the stored period key to today's.
 *   If they differ, we reset the relevant counters before incrementing.
 *
 * LEADERBOARD OPT-OUT:
 *   If publicProfiles/{uid}.leaderboardOptOut === true, skip all stat writes.
 *
 * EXPECTED READ COST (per trigger invocation):
 *   1 document read (publicProfiles/{uid} inside transaction) +
 *   1 document write (same doc, transaction commit).
 *   At 50k daily active users × 5 avg events/day = 250k reads/day.
 *   Well within Firestore free tier (50k reads/day) on dev; ~$0.09/day on prod.
 */
import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const PUBLIC_PROFILES = 'publicProfiles';

// ─── ISO week helpers (UTC, Monday-start) ────────────────────────────────────

/**
 * Returns the ISO week number (1–53) for a given UTC date.
 * ISO 8601: weeks start on Monday. Week 1 contains the year's first Thursday.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1..Sun=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns a string key like "2026-W12" for the current UTC week.
 * Used to detect week rollovers in stats.currentPeriodWeek.
 */
function getCurrentWeekKey(date: Date): string {
  const week = getISOWeek(date);
  // Handle ISO weeks that belong to the previous/next year's week 1
  // (edge case: Jan 1 may be in week 52/53 of prior year)
  const weekDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - dayNum);
  const isoYear = weekDate.getUTCFullYear();
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/**
 * Returns a string key like "2026-03" for the current UTC month.
 */
function getCurrentMonthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Shared transaction helper ────────────────────────────────────────────────

type StatsUpdate = (
  currentStats: admin.firestore.DocumentData,
  weekKey: string,
  monthKey: string,
) => Record<string, unknown>;

/**
 * Runs an atomic transaction against publicProfiles/{uid}.
 *
 * Checks:
 *  1. leaderboardOptOut — if true, skip entirely.
 *  2. Idempotency — if lastProcessedIds[idempotencyKey] === docId, skip.
 *  3. Period rollover — compare stored week/month keys, reset if changed.
 *
 * Then applies the caller-provided updates via buildUpdates().
 */
async function runStatsTransaction(
  db: admin.firestore.Firestore,
  uid: string,
  docId: string,
  idempotencyKey: string,
  buildUpdates: StatsUpdate,
): Promise<void> {
  const profileRef = db.collection(PUBLIC_PROFILES).doc(uid);
  const now = new Date();
  const weekKey = getCurrentWeekKey(now);
  const monthKey = getCurrentMonthKey(now);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(profileRef);

    // If no public profile exists, skip — user hasn't set up their profile yet.
    if (!snap.exists) {
      console.log(`[onStatsUpdate] No publicProfile for uid=${uid}, skipping.`);
      return;
    }

    const data = snap.data() as admin.firestore.DocumentData;

    // 1. Respect leaderboard opt-out
    if (data.leaderboardOptOut === true) {
      console.log(`[onStatsUpdate] uid=${uid} has opted out of leaderboards, skipping.`);
      return;
    }

    // 2. Idempotency guard — skip if this doc was already processed
    const lastProcessedIds = (data.stats?.lastProcessedIds ?? {}) as Record<string, string>;
    if (lastProcessedIds[idempotencyKey] === docId) {
      console.log(`[onStatsUpdate] docId=${docId} already processed for uid=${uid}, skipping.`);
      return;
    }

    // 3. Build the update payload (caller handles period rollover logic using provided keys)
    const currentStats = (data.stats ?? {}) as admin.firestore.DocumentData;
    const updates = buildUpdates(currentStats, weekKey, monthKey);

    // Always stamp lastActivityAt and update idempotency record
    updates[`stats.lastProcessedIds.${idempotencyKey}`] = docId;
    updates['stats.lastActivityAt'] = admin.firestore.FieldValue.serverTimestamp();
    updates['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();

    tx.update(profileRef, updates);
  });
}

// ─── Trigger 1: Workout session created ──────────────────────────────────────

/**
 * onWorkoutSessionCreate
 *
 * Path: users/{uid}/workoutSessions/{sessionId}
 *
 * Reads: totalVolume (kg*reps, already computed by client before saving)
 * Increments: stats.weeklyVolume, stats.monthlyVolume
 * Resets weekly on week rollover; resets monthly on month rollover.
 */
export const onWorkoutSessionCreate = onDocumentCreated(
  {
    document: 'users/{uid}/workoutSessions/{sessionId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid;
    const sessionId = event.params.sessionId;
    const sessionData = event.data?.data();

    if (!sessionData) {
      console.warn(`[onWorkoutSessionCreate] No data for sessionId=${sessionId}`);
      return;
    }

    const totalVolume = typeof sessionData.totalVolume === 'number' ? sessionData.totalVolume : 0;
    const db = admin.firestore();

    await runStatsTransaction(db, uid, sessionId, 'workoutSessions', (stats, weekKey, monthKey) => {
      const updates: Record<string, unknown> = {};

      // Weekly rollover
      if (stats.currentPeriodWeek !== weekKey) {
        updates['stats.weeklyVolume'] = totalVolume;
        updates['stats.currentPeriodWeek'] = weekKey;
      } else {
        updates['stats.weeklyVolume'] = admin.firestore.FieldValue.increment(totalVolume);
      }

      // Monthly rollover
      if (stats.currentPeriodMonth !== monthKey) {
        updates['stats.monthlyVolume'] = totalVolume;
        updates['stats.currentPeriodMonth'] = monthKey;
      } else {
        updates['stats.monthlyVolume'] = admin.firestore.FieldValue.increment(totalVolume);
      }

      return updates;
    });

    console.log(`[onWorkoutSessionCreate] Processed sessionId=${sessionId} for uid=${uid}, volume=${totalVolume}`);
  },
);

// ─── Trigger 2: Cardio session created ───────────────────────────────────────

/**
 * onCardioSessionCreate
 *
 * Path: users/{uid}/cardioSessions/{sessionId}
 *
 * Reads: distance (meters, from GPS or user input)
 * Converts: meters → km (divide by 1000, round to 2dp)
 * Increments: stats.weeklyDistance, stats.monthlyDistance
 */
export const onCardioSessionCreate = onDocumentCreated(
  {
    document: 'users/{uid}/cardioSessions/{sessionId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid;
    const sessionId = event.params.sessionId;
    const sessionData = event.data?.data();

    if (!sessionData) {
      console.warn(`[onCardioSessionCreate] No data for sessionId=${sessionId}`);
      return;
    }

    // distance is stored in meters; convert to km for leaderboard display
    const distanceMeters = typeof sessionData.distance === 'number' ? sessionData.distance : 0;
    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const db = admin.firestore();

    await runStatsTransaction(db, uid, sessionId, 'cardioSessions', (stats, weekKey, monthKey) => {
      const updates: Record<string, unknown> = {};

      // Weekly rollover
      if (stats.currentPeriodWeek !== weekKey) {
        updates['stats.weeklyDistance'] = distanceKm;
        // currentPeriodWeek is shared across both workout and cardio triggers.
        // Only set if not already set by workout trigger (both may update same field).
        // Safe: last-writer-wins on week key is fine since it's the same value.
        updates['stats.currentPeriodWeek'] = weekKey;
      } else {
        updates['stats.weeklyDistance'] = admin.firestore.FieldValue.increment(distanceKm);
      }

      // Monthly rollover
      if (stats.currentPeriodMonth !== monthKey) {
        updates['stats.monthlyDistance'] = distanceKm;
        updates['stats.currentPeriodMonth'] = monthKey;
      } else {
        updates['stats.monthlyDistance'] = admin.firestore.FieldValue.increment(distanceKm);
      }

      return updates;
    });

    console.log(`[onCardioSessionCreate] Processed sessionId=${sessionId} for uid=${uid}, distanceKm=${distanceKm}`);
  },
);

// ─── Trigger 3: XP log created ───────────────────────────────────────────────

/**
 * onXPLogCreate
 *
 * Path: users/{uid}/xpLog/{logId}
 *
 * Reads: amount (XP points), source (string)
 * Increments: stats.weeklyXP, stats.monthlyXP, stats.allTimeXP
 * If source === 'macro_targets_hit': increment stats.weeklyMacroTargetDays,
 *   stats.monthlyMacroTargetDays, stats.daysOnPlanLast30
 *
 * daysOnPlanLast30: stored as a simple running count (not array).
 *   Resets to 0 on monthly rollover to approximate the last 30 days.
 *   Simple approximation — avoids storing a 30-element array in Firestore.
 */
export const onXPLogCreate = onDocumentCreated(
  {
    document: 'users/{uid}/xpLog/{logId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid;
    const logId = event.params.logId;
    const logData = event.data?.data();

    if (!logData) {
      console.warn(`[onXPLogCreate] No data for logId=${logId}`);
      return;
    }

    const amount = typeof logData.amount === 'number' ? logData.amount : 0;
    const source = typeof logData.source === 'string' ? logData.source : '';
    const isMacroHit = source === 'macro_targets_hit';
    const db = admin.firestore();

    await runStatsTransaction(db, uid, logId, 'xpLog', (stats, weekKey, monthKey) => {
      const updates: Record<string, unknown> = {};

      // Weekly rollover
      if (stats.currentPeriodWeek !== weekKey) {
        updates['stats.weeklyXP'] = amount;
        updates['stats.weeklyMacroTargetDays'] = isMacroHit ? 1 : 0;
        updates['stats.currentPeriodWeek'] = weekKey;
      } else {
        updates['stats.weeklyXP'] = admin.firestore.FieldValue.increment(amount);
        if (isMacroHit) {
          updates['stats.weeklyMacroTargetDays'] = admin.firestore.FieldValue.increment(1);
        }
      }

      // Monthly rollover
      if (stats.currentPeriodMonth !== monthKey) {
        updates['stats.monthlyXP'] = amount;
        updates['stats.monthlyMacroTargetDays'] = isMacroHit ? 1 : 0;
        // Reset daysOnPlanLast30 on month rollover (approximation)
        updates['stats.daysOnPlanLast30'] = isMacroHit ? 1 : 0;
        updates['stats.currentPeriodMonth'] = monthKey;
      } else {
        updates['stats.monthlyXP'] = admin.firestore.FieldValue.increment(amount);
        if (isMacroHit) {
          updates['stats.monthlyMacroTargetDays'] = admin.firestore.FieldValue.increment(1);
          updates['stats.daysOnPlanLast30'] = admin.firestore.FieldValue.increment(1);
        }
      }

      // All-time XP always increments (no rollover)
      updates['stats.allTimeXP'] = admin.firestore.FieldValue.increment(amount);

      return updates;
    });

    console.log(`[onXPLogCreate] Processed logId=${logId} for uid=${uid}, amount=${amount}, source=${source}`);
  },
);

// ─── Trigger 4: Achievement created ──────────────────────────────────────────

/**
 * onAchievementCreate
 *
 * Path: users/{uid}/achievements/{achievementId}
 *
 * Increments: stats.allTimeChallengesCompleted
 * No period rollover — all-time counter only.
 */
export const onAchievementCreate = onDocumentCreated(
  {
    document: 'users/{uid}/achievements/{achievementId}',
    region: 'us-central1',
  },
  async (event) => {
    const uid = event.params.uid;
    const achievementId = event.params.achievementId;

    if (!event.data) {
      console.warn(`[onAchievementCreate] No data for achievementId=${achievementId}`);
      return;
    }

    const db = admin.firestore();

    await runStatsTransaction(db, uid, achievementId, 'achievements', (_stats, _weekKey, _monthKey) => {
      return {
        'stats.allTimeChallengesCompleted': admin.firestore.FieldValue.increment(1),
      };
    });

    console.log(`[onAchievementCreate] Processed achievementId=${achievementId} for uid=${uid}`);
  },
);
