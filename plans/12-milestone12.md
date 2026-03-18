# Plan 12 — Cycle Planner, Consistency Tracking, AI Weekly Insight, Notifications

**Status:** COMMITTED (Ray review pending)
**Date:** 2026-03-18
**Author:** Bob
**Commits:** 26fea36, 3185fe3

---

## Context

Milestone 12 delivers four major platform capabilities: a full peptide cycle planner with titration and taper scheduling, a flexible daily consistency tracking system replacing the streak counter, a Claude-powered weekly insight card on the dashboard, and local push notification infrastructure for dose reminders.

---

## What Was Built

### 1. Peptide Cycle Planner

Multi-week dosing cycle planning with automatic schedule generation.

**Architecture:**
- Pure schedule generator (no React/Firebase deps) — easy to unit-test
- Wizard creates the full `plannedDoses[]` array up-front and writes it to Firestore
- `log-dose.tsx` auto-marks matching planned doses as completed on save

**Files:**
- `src/types/cycle.ts` — `Cycle`, `PlannedDose`, `CycleWizardData`, `IncrementFrequency` (weekly/biweekly/monthly/manual), `InjectionFrequency` (daily/EOD/2x/3x/weekly), `DayOfWeek`
- `src/utils/cyclePlanner.ts` — `generateCyclePlan()`: pure algorithm for dose titration (starting dose → max dose, configurable increment period), taper-down phase (peak dose → 0 over N weeks), injection scheduling (EOD, weekday-targeted, daily)
- `src/services/cycleService.ts` — `addCycle`, `updateCycle`, `deleteCycle`, `getCycles`, `getActiveCycles` (client-side status filter), `getCycleById`, `markPlannedDoseCompleted`, `updateCycleStatus`
- `src/hooks/useCycleStatus.ts` — focus-aware hook: `computeInfo()` derives `currentWeek`, `currentDose`, `nextDoseDate`, `completedCount`, `missedCount` (yellow, not red — no shaming), `todaysDose` from planned doses array
- `app/(tabs)/peptides/cycle-planner.tsx` — 4-step wizard:
  - Step 1: Compound picker (from peptide library, with half-life + route badges)
  - Step 2: Dose schedule (starting dose, increment frequency + amount, max dose, optional taper config)
  - Step 3: Timing (injection frequency, preferred weekdays, preferred time, start date calendar, duration/open-ended toggle)
  - Step 4: Review (stats grid: total injections + compound needed + peak dose; calendar with multi-dot markers; first-30-dose list)
- `app/(tabs)/peptides/index.tsx` — `ActiveCycleCard` (progress bar, week N of M, current dose, dose completion stats); "Plan Cycle" quick-action button added to action row
- `app/(tabs)/peptides/_layout.tsx` — `cycle-planner` route registered
- `app/(tabs)/peptides/log-dose.tsx` — on save: fetches active cycles, finds compound match + today's planned dose, calls `markPlannedDoseCompleted`

**Firestore:** `COLLECTIONS.CYCLES = 'cycles'`

---

### 2. Consistency Tracking (replaces streak counter)

30-day daily on-plan status, adapted to user goals and configurable rest days.

**Architecture:**
- `computeConsistency()` is pure — takes pre-fetched dashboard data, no Firestore calls
- Firestore write happens fire-and-forget after dashboard loads (today + yesterday only)
- Older days are immutable — read from Firestore, never recomputed
- Classification based on user's configured goals (training/nutrition/peptides)
- Manual rest-day toggle persisted to Firestore

**Status system:**
- `full` (green) — all configured goal criteria met
- `partial` (yellow) — at least one goal met, or bare-minimum workout
- `rest` (gray, neutral) — explicit override or non-training day per `trainingDays` config
- `missed` (dim) — no activity on a training day

**Files:**
- `src/types/consistency.ts` — `DayStatus`, `DayConsistency` (date-keyed, workoutLogged, isBareMinimum, nutritionPercent, peptideLogged, isRestDay, restDayOverride), `ConsistencyData` (30 days, onPlanLast14, monthlyPercent, weeklyScore)
- `src/services/consistencyService.ts` — `computeConsistency()` (pure, 30-day walk), `getConsistencyDocs()`, `persistConsistencyDay()`, `markRestDayOverride()`, `toggleRestDay()`, `isConfiguredRestDay()`. Uses `COLLECTIONS.CONSISTENCY`. Avoids composite indexes via date-range query only.
- `src/components/dashboard/ConsistencyCard.tsx` — hero stats row (weekly ring chart, monthly %, last-14 count), 30-day dot calendar (4 colors + gray future), tap-to-tooltip with rest-day toggle
- `src/hooks/useDashboard.ts` — accepts `userProfile?: UserProfile | null`; card migration adds `consistency` after `greeting`; exposes `toggleRestDay`
- `src/services/dashboardService.ts` — parallel-fetches 30-day nutrition logs + all doses + saved consistency docs; passes `calorieTarget` and `trainingDays` from profile to `computeConsistency`; only persists days with real activity (skip gap-fill placeholders)
- `src/types/dashboard.ts` — `DashboardCardId` + `'consistency'`; `DashboardData` + `consistency: ConsistencyData | null`, `allDoses`, `nutritionLogs`; `DEFAULT_CARD_ORDER` updated
- `src/types/profile.ts` — `trainingDays?: number[]` (0=Sun..6=Sat); when absent, every day is a training day

---

### 3. AI Weekly Insight

Personalized weekly coaching insight via Claude Haiku, cached in Firestore.

**Security design (Ray-reviewed):**
- System prompt strictly separated from user data (anti-prompt-injection)
- User-controlled strings (peptide names) sanitized: `safeStr()` truncates to 64 chars and strips non-alphanumeric
- Only aggregate numeric data sent — no free-text notes or descriptions
- AbortController prevents concurrent in-flight API calls
- 7-day Firestore cache (`users/{uid}/aiInsights/weekly`) to minimise API cost
- ⚠️ `EXPO_PUBLIC_ANTHROPIC_API_KEY` is bundled in JS bundle — acceptable for dev/personal builds only. Must move behind a Firebase Cloud Function before App Store distribution.

**Files:**
- `src/services/aiInsightService.ts` — `getWeeklyInsight(forceRefresh?)`: checks cache → AbortController → `gatherPayload()` (parallel fetch workouts/cardio/peptides/weights) → Claude API call → Firestore cache write
- `src/components/dashboard/AIInsightCard.tsx` — loading skeleton, tap-to-refresh, cache age indicator ("Updated X hours ago")
- `src/services/firebase/firestore.ts` — `COLLECTIONS.AI_INSIGHTS = 'aiInsights'`
- `.env.example` — `EXPO_PUBLIC_ANTHROPIC_API_KEY` documented

---

### 4. Notifications Infrastructure

Local push notification scheduling for dose reminders.

**Files:**
- `src/services/notificationService.ts` — `requestPermissions()`, `scheduleDoseReminder(peptideId, name, intervalHours)`, `cancelDoseReminder(peptideId)`, `cancelAllDoseReminders()`. Uses `expo-notifications` with `AsyncStorage` to store notification IDs keyed by peptide ID (enables reliable pre-existing reminder cancellation before rescheduling).
- `app/(tabs)/dashboard/settings.tsx` — notification toggle UI (dose reminders + daily check-in toggles)
- `app/(tabs)/profile/index.tsx` — notification preferences section

---

### 5. Other Changes

- `src/components/dashboard/GreetingSection.tsx` — streak badge removed (replaced by ConsistencyCard)
- `src/components/peptides/HalfLifeTimelineChart.tsx` — minor refinements
- `src/services/firebase/firestore.ts` — `CYCLES`, `CONSISTENCY`, `AI_INSIGHTS` added; `DAILY_CONSISTENCY` removed (unused)

---

## Files

```
NEW  src/types/cycle.ts
NEW  src/types/consistency.ts
NEW  src/utils/cyclePlanner.ts
NEW  src/services/cycleService.ts
NEW  src/services/consistencyService.ts
NEW  src/services/aiInsightService.ts
NEW  src/services/notificationService.ts
NEW  src/hooks/useCycleStatus.ts
NEW  src/components/dashboard/ConsistencyCard.tsx
NEW  app/(tabs)/peptides/cycle-planner.tsx
MOD  src/types/dashboard.ts
MOD  src/types/profile.ts
MOD  src/hooks/useDashboard.ts
MOD  src/services/dashboardService.ts
MOD  src/services/firebase/firestore.ts
MOD  src/components/dashboard/AIInsightCard.tsx
MOD  src/components/dashboard/GreetingSection.tsx
MOD  src/components/peptides/HalfLifeTimelineChart.tsx
MOD  app/(tabs)/dashboard/index.tsx
MOD  app/(tabs)/dashboard/settings.tsx
MOD  app/(tabs)/peptides/_layout.tsx
MOD  app/(tabs)/peptides/index.tsx
MOD  app/(tabs)/peptides/log-dose.tsx
MOD  app/(tabs)/profile/index.tsx
MOD  .env.example
```

---

## TypeScript: `npx tsc --noEmit` — 0 errors

---

## Post-Commit Fixes Applied

After the initial commit, the following polish items were applied:
1. Remove unused `DAILY_CONSISTENCY` from `COLLECTIONS`
2. `DayStatus`: remove `'future'` variant (future days handled by rendering layer, not type)
3. Fix `persistConsistencyDay`: explicit `updatedAt: Date.now()` avoids implicit cast issues
4. `dashboardService`: only persist days with real activity (skip placeholder gap-fill entries)
5. `useDashboard.toggleRestDay`: use `toggleRestDay(dateKey, true)` instead of deprecated `markRestDayOverride`

---

## Ray Review Considerations

1. **API key security** — `EXPO_PUBLIC_ANTHROPIC_API_KEY` is in the JS bundle. Must be moved behind a Firebase Cloud Function before any public distribution.
2. **Consistency write-on-read** — `fetchDashboardData` writes to Firestore as a side effect. Acceptable for personal use; worth noting for scalability.
3. **Cycle planner has no edit/delete UI** — cycles can be created but not managed after creation. Deferred to M13.
4. **toggleRestDay is one-directional** — marks as rest only; unmarking requires separate UI not yet implemented.
5. **Notification permissions** — not requested at app launch; user must go to settings. Acceptable for MVP.

---

## Deferred to M13

- Cycle detail screen (view full schedule, pause/complete a cycle)
- Cycle edit/delete
- toggleRestDay un-mark flow
- Consistency history beyond 30 days
- Notification permission prompt on first peptide add
