# Plan 11 — Cardio Sharing, Peptide Half-Life Timeline, Side Effects, USDA Integration, Analytics

**Status:** COMMITTED (Ray conditional approval)
**Date:** 2026-03-18
**Author:** Bob
**Commits:** 4748f06, 80eb84d, 5c4c8ec, 18c91f4, dc08424, 8f1e670

---

## Context

Milestone 11 delivered four major feature areas across the app, bundled into a series of commits after Ray's conditional approval. This plan documents what was built.

---

## What Was Built

### 1. Cardio Sharing

Allow users to share GPS cardio session summaries as images (Story 9:16 and Feed 1:1 formats).

**Files:**
- `src/components/cardio/ShareCard.tsx` — Off-screen capture component; renders session stats (distance, pace, duration, elevation, heart rate, map) in two aspect ratios using `react-native-view-shot`
- `src/components/cardio/ShareModal.tsx` — Bottom-sheet share UI with live preview, Save to Photos + Share actions, format toggle
- `src/utils/shareCardio.ts` — Pure utils: `captureRef`, `shareImage`, `saveToPhotos` (wraps `expo-media-library` and `expo-sharing`)
- `app/(tabs)/cardio/session-detail.tsx` — Share button wired to ShareModal
- `app/(tabs)/cardio/session-summary.tsx` — Share button wired to ShareModal

### 2. Peptide Half-Life Timeline + Side Effect Logging

Visualise estimated compound blood levels over time using exponential decay math, with side-effect overlay markers.

**Files:**
- `src/utils/halfLifeDecay.ts` — Pure math: `decayLevel`, `lookbackMs`, `stepMsForRange`, `generateCompoundCurve`. No React deps. Normalises to % of peak single dose. Uses 10-half-life lookback so accumulation is correct.
- `src/types/sideEffect.ts` — `SideEffect`, `SideEffectSeverity`, `SIDE_EFFECT_OPTIONS` (8 emoji symptoms), `SEVERITIES`
- `src/services/sideEffectService.ts` — Firestore CRUD: `addSideEffect`, `deleteSideEffect`, `getSideEffects` (range-filtered). Path: `users/{uid}/sideEffects/{id}`
- `src/components/peptides/HalfLifeTimelineChart.tsx` — Victory-native chart: one `VictoryLine` per compound (if half-life configured), dose markers as scatter points (diamond = has half-life, circle = no half-life), side-effect emoji overlays pinned near top of chart. 7d/14d/30d range tabs. Voronoi tooltips.
- `src/components/peptides/LogSideEffectModal.tsx` — Bottom-sheet: emoji symptom grid, mild/moderate/severe severity buttons, optional compound link picker, free-text notes, Firestore save
- `src/hooks/useHalfLifeTimeline.ts` — Data hook: parallel fetch of peptides + doses + side effects, generates `CompoundSeries[]` in `useMemo`, colorblind-safe 8-color palette, cancellation on unmount
- `app/(tabs)/peptides/half-life-timeline.tsx` — Screen shell: wraps chart + FAB for side effect logging
- `app/(tabs)/peptides/index.tsx` — Blood Levels quick-action button added to action row ScrollView
- `app/(tabs)/peptides/_layout.tsx` — `half-life-timeline` route registered

**Firestore collection added:**
- `src/services/firebase/firestore.ts` — `SIDE_EFFECTS` constant added to `COLLECTIONS`

### 3. Nutrition: USDA FoodData Central Integration

Extended nutrition search to pull from USDA FoodData Central in parallel with Open Food Facts.

**Files:**
- `src/services/usdaService.ts` — USDA API search + barcode lookup; degrades gracefully if `EXPO_PUBLIC_USDA_API_KEY` not set
- `src/services/nutritionService.ts` — Parallel USDA + OFF search with smart merging; partial results not cached
- `app/(tabs)/nutrition/food-detail.tsx` — Micronutrient panel, RDA % badges, USDA portion buttons, source badge (USDA vs OFF vs manual)
- `src/types/nutrition.ts` — Extended types: `Micronutrients`, `FoodPortion`, `FoodSource`, extended `FoodSearchResult`

### 4. Training Enhancements

- `src/hooks/useWorkoutSession.ts` — `restSeconds` plumbed from template through session and exercise creation so rest timer uses per-exercise values
- `app/(tabs)/training/template-builder.tsx` — Rest seconds field added per exercise

### 5. Analytics Instrumentation

Added Firebase Analytics events throughout the app.

**Events added:**
- `LOGIN_COMPLETED` — `app/(auth)/log-in.tsx`
- `SIGNUP_COMPLETED` — `app/(auth)/sign-up.tsx`
- `ONBOARDING_STEP_VIEWED`, `ONBOARDING_COMPLETED` — `app/(onboarding)/quiz.tsx`
- `WEIGHT_LOGGED` — `app/(tabs)/dashboard/body-tracking.tsx`
- `PAYWALL_VIEWED`, `SUBSCRIPTION_STARTED` — `app/paywall.tsx`
- `CARDIO_SESSION_STARTED`, `CARDIO_SESSION_COMPLETED` — `src/hooks/useCardioSession.ts`
- `WORKOUT_SESSION_STARTED`, `WORKOUT_SESSION_COMPLETED` — `src/hooks/useWorkoutSession.ts`
- `TAB_SWITCHED` — `app/(tabs)/_layout.tsx`
- `PROGRESS_PHOTO_TAKEN` — `app/(tabs)/dashboard/progress-camera.tsx`

### 6. Weekly Cardio Summary

- `src/components/cardio/WeeklySummaryCard.tsx` — Card showing 7-day distance, duration, and session count; shown at top of cardio index
- `src/components/dashboard/CardioCard.tsx` — `computeWeeklySummary` helper added; dashboard card shows 7-day summary
- `src/services/cardioService.ts` — `getThisWeekCardioSummary` service method added

---

## Files

```
NEW  src/utils/halfLifeDecay.ts
NEW  src/types/sideEffect.ts
NEW  src/services/sideEffectService.ts
NEW  src/components/peptides/HalfLifeTimelineChart.tsx
NEW  src/components/peptides/LogSideEffectModal.tsx
NEW  src/hooks/useHalfLifeTimeline.ts
NEW  app/(tabs)/peptides/half-life-timeline.tsx
NEW  src/components/cardio/ShareCard.tsx
NEW  src/components/cardio/ShareModal.tsx
NEW  src/utils/shareCardio.ts
NEW  src/components/cardio/WeeklySummaryCard.tsx
MOD  app/(tabs)/peptides/index.tsx
MOD  app/(tabs)/peptides/_layout.tsx
MOD  src/services/firebase/firestore.ts
MOD  src/services/usdaService.ts
MOD  src/services/nutritionService.ts
MOD  src/services/cardioService.ts
MOD  app/(tabs)/nutrition/food-detail.tsx
MOD  src/types/nutrition.ts
MOD  src/hooks/useWorkoutSession.ts
MOD  app/(tabs)/training/template-builder.tsx
MOD  app/(tabs)/cardio/session-detail.tsx
MOD  app/(tabs)/cardio/session-summary.tsx
MOD  app/(tabs)/cardio/index.tsx
MOD  app/(tabs)/_layout.tsx
MOD  app/(tabs)/dashboard/progress-camera.tsx
MOD  app/(tabs)/dashboard/body-tracking.tsx
MOD  src/components/dashboard/CardioCard.tsx
MOD  app/(auth)/log-in.tsx
MOD  app/(auth)/sign-up.tsx
MOD  app/(onboarding)/quiz.tsx
MOD  app/paywall.tsx
```

---

## Ray Review Outcome

**CONDITIONAL APPROVAL — cleared to commit.**

Follow-up items deferred to next milestone:
1. Add `maxLength` on `notes` TextInput in `LogSideEffectModal` (Firestore doc size hygiene)
2. Surface `getSideEffects` errors in `useHalfLifeTimeline` (currently silently empty on error)
3. Improve `colorForPeptide` hash to reduce collision risk with 8+ peptides

---

## Deferred to Future Milestones

- Side effect history screen (view/delete past entries)
- Push notification for backgrounded rest timer
- Superset-aware rest timer
- Workout history screen
