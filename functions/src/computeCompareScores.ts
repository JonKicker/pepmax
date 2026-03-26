/**
 * computeCompareScores — daily scheduled Cloud Function.
 *
 * Schedule: "0 2 * * *" (2:00 AM UTC daily)
 *
 * For each user who has compareEnabled = true in their comparePrivacy doc,
 * computes aggregated fitness metrics from their subcollections and writes
 * them to userStats/{uid}/compareScores/current.
 *
 * NOTE ON PATH: scores are written to the top-level userStats/ collection
 * (not users/{uid}/stats/) so that the Firestore wildcard rule
 * `match /users/{userId}/{document=**}` cannot grant client write access.
 * In Firestore a narrower `allow write: if false` inside the same hierarchy
 * does NOT override the wildcard. Top-level isolation is the correct fix.
 *
 * SENTINEL: -1 is written for any module the user has hidden or for which
 *   no data exists. UI must display "—" for -1 values.
 *
 * METRICS COMPUTED:
 *   estimatedOneRepMax  — Epley formula: weight × (1 + reps/30)
 *                         Best single-set result from workoutSessions in last 30 days
 *   weeklyVolume        — Sum of (weight × reps) across all sets in the last 7 days (kg)
 *   weeklyDistance      — Sum of cardioSession distances in the last 7 days (km)
 *   avgPace             — Average min/km across cardioSessions in the last 7 days
 *   avgDailyCalories    — Average daily calorie total from foodLog in the last 30 days
 *   avgRecoveryScore    — Average check-in score from recoveryLog in the last 30 days
 *   bodyWeightTrend     — Latest body weight entry from bodyWeightLogs (kg)
 *   activePeptideCount  — Count of peptide entries in users/{uid}/peptides (no time window)
 *
 * PROCESSING:
 *   Users are fetched in chunks of 100 via startAfter pagination.
 *   Firestore batch writes are capped at 500 ops and committed sequentially.
 *   Admin SDK bypasses Firestore security rules (clients cannot write stats/).
 *
 * IDEMPOTENCY:
 *   Full recompute on every run — overwrites the previous doc. Inherently idempotent.
 */
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// ─── Collection names ─────────────────────────────────────────────────────────

const USERS = 'users';
const SETTINGS = 'settings';
const WORKOUT_SESSIONS = 'workoutSessions';
const CARDIO_SESSIONS = 'cardioSessions';
const FOOD_LOG = 'foodLog';
const RECOVERY_LOG = 'recoveryLog';
const BODY_WEIGHT_LOGS = 'bodyWeightLogs';

const PEPTIDES = 'peptides';

const COMPARE_PRIVACY_DOC = 'comparePrivacy';

// ─── Processing constants ─────────────────────────────────────────────────────

const CHUNK_SIZE = 100;
const BATCH_SIZE = 500;

// ─── Time windows ─────────────────────────────────────────────────────────────

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

type ComparePrivacy = {
  compareEnabled: boolean;
  showTraining: boolean;
  showCardio: boolean;
  showNutrition: boolean;
  showRecovery: boolean;
  showBodyComp: boolean;
  showPeptides: boolean;
  blockedUsers: string[];
};

type CompareScores = {
  estimatedOneRepMax: number;
  weeklyVolume: number;
  weeklyDistance: number;
  avgPace: number;
  avgDailyCalories: number;
  avgRecoveryScore: number;
  bodyWeightTrend: number;
  activePeptideCount: number;
  computedAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
};

// ─── Epley 1RM formula ────────────────────────────────────────────────────────

/**
 * Epley estimated 1RM: weight × (1 + reps/30)
 * For single-rep sets, this equals weight exactly.
 */
function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

// ─── Batch write helper ───────────────────────────────────────────────────────

async function commitInBatches(
  db: admin.firestore.Firestore,
  writes: Array<[admin.firestore.DocumentReference, Record<string, unknown>]>,
): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const [ref, data] of chunk) {
      batch.set(ref, data, { merge: false });
    }
    try {
      await batch.commit();
    } catch (err) {
      console.error(
        `[computeCompareScores] Batch commit failed at offset ${i}:`,
        err,
      );
      // Continue best-effort; next daily run will re-sync
    }
  }
}

// ─── Per-user score computation ───────────────────────────────────────────────

async function computeScoresForUser(
  db: admin.firestore.Firestore,
  uid: string,
  privacy: ComparePrivacy,
): Promise<CompareScores> {
  const now = Date.now();
  const cutoff7d = admin.firestore.Timestamp.fromMillis(now - MS_7_DAYS);
  const cutoff30d = admin.firestore.Timestamp.fromMillis(now - MS_30_DAYS);
  const SENTINEL = -1;

  // ── Training: estimated 1RM + weekly volume ──────────────────────────────

  let estimatedOneRepMax = SENTINEL;
  let weeklyVolume = SENTINEL;

  if (privacy.showTraining) {
    try {
      // Fetch workout sessions in last 30 days for 1RM, last 7 days for volume
      const sessionsSnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(WORKOUT_SESSIONS)
        .where('completedAt', '>=', cutoff30d)
        .get();

      let best1RM = 0;
      let totalVolume = 0;

      for (const sessionDoc of sessionsSnap.docs) {
        const session = sessionDoc.data();
        const sessionTs: admin.firestore.Timestamp | undefined = session.completedAt;
        const isWithin7d = sessionTs && sessionTs.toMillis() >= now - MS_7_DAYS;

        const exercises: Array<{
          sets?: Array<{ weight?: number; reps?: number; completed?: boolean }>;
        }> = session.exercises ?? [];

        for (const exercise of exercises) {
          for (const set of exercise.sets ?? []) {
            if (!set.completed) continue;
            const weight = typeof set.weight === 'number' ? set.weight : 0;
            const reps = typeof set.reps === 'number' ? set.reps : 0;
            if (weight <= 0 || reps <= 0) continue;

            // 1RM — best across 30 days
            const rm = epley1RM(weight, reps);
            if (rm > best1RM) best1RM = rm;

            // Weekly volume — only within 7 days
            if (isWithin7d) {
              totalVolume += weight * reps;
            }
          }
        }
      }

      estimatedOneRepMax = best1RM > 0 ? Math.round(best1RM * 10) / 10 : SENTINEL;
      weeklyVolume = totalVolume > 0 ? Math.round(totalVolume * 10) / 10 : SENTINEL;
    } catch (err) {
      console.error(`[computeCompareScores] Training read failed for ${uid}:`, err);
    }
  }

  // ── Cardio: weekly distance + avg pace ───────────────────────────────────

  let weeklyDistance = SENTINEL;
  let avgPace = SENTINEL;

  if (privacy.showCardio) {
    try {
      const cardioSnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(CARDIO_SESSIONS)
        .where('completedAt', '>=', cutoff7d)
        .get();

      let totalDistance = 0;
      let totalPaceSum = 0;
      let paceCount = 0;

      for (const doc of cardioSnap.docs) {
        const session = doc.data();
        const distance: number =
          typeof session.distance === 'number' ? session.distance : 0;
        const pace: number =
          typeof session.avgPace === 'number' ? session.avgPace : 0;

        if (distance > 0) totalDistance += distance;
        if (pace > 0) {
          totalPaceSum += pace;
          paceCount++;
        }
      }

      weeklyDistance = totalDistance > 0 ? Math.round(totalDistance * 100) / 100 : SENTINEL;
      avgPace =
        paceCount > 0
          ? Math.round((totalPaceSum / paceCount) * 100) / 100
          : SENTINEL;
    } catch (err) {
      console.error(`[computeCompareScores] Cardio read failed for ${uid}:`, err);
    }
  }

  // ── Nutrition: avg daily calories ────────────────────────────────────────

  let avgDailyCalories = SENTINEL;

  if (privacy.showNutrition) {
    try {
      const foodSnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(FOOD_LOG)
        .where('loggedAt', '>=', cutoff30d)
        .get();

      // Aggregate by day (docId is YYYY-MM-DD, one summary doc per day)
      const dailyTotals: Map<string, number> = new Map();
      for (const doc of foodSnap.docs) {
        const data = doc.data();
        // Support both daily-summary docs (totalCalories) and individual entries (calories)
        const calories: number =
          typeof data.totalCalories === 'number'
            ? data.totalCalories
            : typeof data.calories === 'number'
            ? data.calories
            : 0;
        const dayKey = doc.id.slice(0, 10); // YYYY-MM-DD
        dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + calories);
      }

      if (dailyTotals.size > 0) {
        const total = Array.from(dailyTotals.values()).reduce((a, b) => a + b, 0);
        avgDailyCalories = Math.round(total / dailyTotals.size);
      }
    } catch (err) {
      console.error(`[computeCompareScores] Nutrition read failed for ${uid}:`, err);
    }
  }

  // ── Recovery: avg recovery score ─────────────────────────────────────────

  let avgRecoveryScore = SENTINEL;

  if (privacy.showRecovery) {
    try {
      const recoverySnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(RECOVERY_LOG)
        .where('date', '>=', cutoff30d)
        .get();

      let scoreSum = 0;
      let scoreCount = 0;

      for (const doc of recoverySnap.docs) {
        const data = doc.data();
        const score: number =
          typeof data.score === 'number' ? data.score : 0;
        if (score > 0) {
          scoreSum += score;
          scoreCount++;
        }
      }

      avgRecoveryScore =
        scoreCount > 0 ? Math.round(scoreSum / scoreCount) : SENTINEL;
    } catch (err) {
      console.error(`[computeCompareScores] Recovery read failed for ${uid}:`, err);
    }
  }

  // ── Body composition: latest body weight ─────────────────────────────────

  let bodyWeightTrend = SENTINEL;

  if (privacy.showBodyComp) {
    try {
      const weightSnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(BODY_WEIGHT_LOGS)
        .orderBy('loggedAt', 'desc')
        .limit(1)
        .get();

      if (!weightSnap.empty) {
        const data = weightSnap.docs[0].data();
        const weight: number =
          typeof data.weight === 'number' ? data.weight : 0;
        bodyWeightTrend = weight > 0 ? weight : SENTINEL;
      }
    } catch (err) {
      console.error(`[computeCompareScores] Body weight read failed for ${uid}:`, err);
    }
  }

  // ── Peptides: active peptide count ───────────────────────────────────────

  let activePeptideCount = SENTINEL;

  if (privacy.showPeptides) {
    try {
      const peptidesSnap = await db
        .collection(USERS)
        .doc(uid)
        .collection(PEPTIDES)
        .get();

      activePeptideCount = peptidesSnap.size > 0 ? peptidesSnap.size : SENTINEL;
    } catch (err) {
      console.error(`[computeCompareScores] Peptides read failed for ${uid}:`, err);
    }
  }

  return {
    estimatedOneRepMax,
    weeklyVolume,
    weeklyDistance,
    avgPace,
    avgDailyCalories,
    avgRecoveryScore,
    bodyWeightTrend,
    activePeptideCount,
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ─── Scheduled function ───────────────────────────────────────────────────────

export const computeCompareScores = onSchedule(
  { schedule: '0 2 * * *', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
  const db = admin.firestore();
  const writes: Array<[admin.firestore.DocumentReference, Record<string, unknown>]> = [];

  let processedUsers = 0;
  let skippedUsers = 0;
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;

  console.log('[computeCompareScores] Starting daily run');

  // Iterate over all users via publicProfiles collection (user registry)
  // This is consistent with computeLeaderboards.ts
  let profileQuery = db.collection('publicProfiles').limit(CHUNK_SIZE);

  while (true) {
    if (lastDoc) {
      profileQuery = db.collection('publicProfiles').limit(CHUNK_SIZE).startAfter(lastDoc);
    }

    let profileSnap: admin.firestore.QuerySnapshot;
    try {
      profileSnap = await profileQuery.get();
    } catch (err) {
      console.error('[computeCompareScores] Failed to fetch user page:', err);
      break;
    }

    if (profileSnap.empty) break;

    lastDoc = profileSnap.docs[profileSnap.docs.length - 1];

    for (const profileDoc of profileSnap.docs) {
      const uid = profileDoc.id;

      // Read compare privacy settings
      let privacy: ComparePrivacy | null = null;
      try {
        const privacySnap = await db
          .collection(USERS)
          .doc(uid)
          .collection(SETTINGS)
          .doc(COMPARE_PRIVACY_DOC)
          .get();

        if (!privacySnap.exists) {
          // User hasn't set up compare privacy — skip (default is enabled,
          // but we won't write scores until the user opens the Compare feature)
          skippedUsers++;
          continue;
        }

        privacy = privacySnap.data() as ComparePrivacy;
      } catch (err) {
        console.error(`[computeCompareScores] Privacy read failed for ${uid}:`, err);
        skippedUsers++;
        continue;
      }

      if (!privacy.compareEnabled) {
        // User opted out — delete their scores doc if it exists to respect privacy
        const scoresRef = db
          .collection('userStats')
          .doc(uid)
          .collection('compareScores')
          .doc('current');
        try {
          await scoresRef.delete();
        } catch {
          // Ignore — deletion is best-effort
        }
        skippedUsers++;
        continue;
      }

      // Compute scores
      let scores: CompareScores;
      try {
        scores = await computeScoresForUser(db, uid, privacy);
      } catch (err) {
        console.error(`[computeCompareScores] Score computation failed for ${uid}:`, err);
        skippedUsers++;
        continue;
      }

      // Stage write — top-level userStats/ path (not users/{uid}/stats/)
      // so that Firestore rules can deny client writes via `allow write: if false`
      const scoresRef = db
        .collection('userStats')
        .doc(uid)
        .collection('compareScores')
        .doc('current');
      writes.push([scoresRef, scores as unknown as Record<string, unknown>]);
      processedUsers++;
    }

    // Flush batch if we've accumulated enough writes or on final page
    if (writes.length >= BATCH_SIZE || profileSnap.docs.length < CHUNK_SIZE) {
      if (writes.length > 0) {
        const batch = writes.splice(0, writes.length);
        await commitInBatches(db, batch);
      }
    }

    if (profileSnap.docs.length < CHUNK_SIZE) break;
  }

  // Final flush of any remaining writes
  if (writes.length > 0) {
    await commitInBatches(db, writes);
  }

  console.log(
    `[computeCompareScores] Done. processed=${processedUsers}, skipped=${skippedUsers}`,
  );
},
);
