# PepMax Feature Tracker

## Active Branch: `feature/build-all-priorities`

---

## Milestone 13 — Recipe Builder

**Status:** ✅ Implemented (pending commit)
**Date:** 2026-03-19

### Features included

- `src/types/recipe.ts` — `RecipeIngredient`, `MacroTotals`, `Recipe`, `RecipeInput`, `SERVING_FRACTIONS`
- `src/services/recipeService.ts` — `saveRecipe`, `updateRecipe`, `deleteRecipe`, `getRecipes`, `getRecipe`, `logRecipeAsFood`
- `src/utils/nutrition.ts` — `computeRecipeTotals()`, `computePerServing()` pure functions
- `src/services/firebase/firestore.ts` — `RECIPES: 'recipes'` collection constant
- `app/(tabs)/nutrition/_layout.tsx` — `my-recipes` and `create-recipe` routes
- `app/(tabs)/nutrition/create-recipe.tsx` — Create/edit screen with ingredient list, up/down reorder, inline amount editing, sticky macro footer, ingredient round-trip via params
- `app/(tabs)/nutrition/my-recipes.tsx` — Recipe list with search, Log Recipe modal (meal slot + fraction picker for batch cook), FAB, error/retry state
- `app/(tabs)/nutrition/index.tsx` — `book-outline` header icon → My Recipes
- `app/(tabs)/nutrition/add-food.tsx` — Recipes tab (hidden in ingredient mode), batch cook → navigates to My Recipes, non-batch logs inline
- `app/(tabs)/nutrition/food-detail.tsx` — ingredient mode hides meal picker, "Add Ingredient" button returns ingredient JSON param to create-recipe

### Ray Review Notes (Milestone 13 — Recipe Builder)

**Status:** CONDITIONAL APPROVAL → Fixes applied

**Fixes applied before full approval:**
1. ✅ Silent delete failure: `deleteRecipe` error checked before filtering local state; Alert shown on failure
2. ✅ Error state added: `getRecipes()` failure shows retry screen; `hasLoaded` ref prevents spinner on every focus re-visit
3. ✅ JSON param validation: all required numeric fields checked with `isFinite()` + `foodName` string check before accepting ingredient from params
4. ✅ `as never` replaced with `as WithFieldValue<RecipeInput>` in both `saveRecipe` and `updateRecipe`
5. ✅ Batch cook recipes in Add Food Recipes tab redirect to My Recipes (fraction picker); non-batch log inline immediately

---

## Milestone 12 — Peptide Cycle Planner, Consistency Tracking, AI Insight, Notifications

**Status:** ✅ Committed (3185fe3)
**Date:** 2026-03-18

### Features included

#### Peptide Cycle Planner
- `src/types/cycle.ts` — IncrementFrequency, InjectionFrequency, DayOfWeek, PlannedDose, Cycle, CycleWizardData
- `src/utils/cyclePlanner.ts` — pure `generateCyclePlan()` (dose titration, taper, EOD/2x/3x, no React/Firebase deps)
- `src/services/cycleService.ts` — CRUD + `markPlannedDoseCompleted`, `getActiveCycles` (client-side filter)
- `src/hooks/useCycleStatus.ts` — ActiveCycleInfo hook (currentWeek, currentDose, missedCount in yellow)
- `app/(tabs)/peptides/cycle-planner.tsx` — 4-step wizard: compound picker → dose schedule → timing + calendar → review
- `app/(tabs)/peptides/index.tsx` — Plan Cycle quick-action button + ActiveCycleCard on dashboard
- `app/(tabs)/peptides/log-dose.tsx` — auto-marks matching planned cycle dose as completed on save
- `src/services/firebase/firestore.ts` — CYCLES collection constant added

#### Consistency Tracking
- `DayConsistency` type with `future` status, `isRestDay`, `isBareMinimum`
- `computeConsistency()` — 30-day on-plan computation from sessions/doses/nutrition
- `ConsistencyCard` — 30-day dot calendar, weekly ring, rest-day toggle
- Dashboard settings screen for card reordering/visibility

#### AI Weekly Insight
- `aiInsightService` — Claude API call (max_tokens 300), 7-day Firestore cache, AbortController dedup
- `AIInsightCard` — tap-to-refresh, loading state, cache age display

#### Notifications
- `notificationService` — notification scheduling service

### Ray Review Notes (Milestone 12 — Cycle Planner)

**Status:** APPROVED (after conditional approval round)

**Conditional fixes applied before approval:**
1. ✅ Review calendar navigates to cycle start month (`current={planResult.plannedDoses[0]?.date ?? data.startDate}`)
2. ✅ `isTaperDay` only fires when dose actually decreases (`taperWeeksElapsed > 0 && ...`)
3. ✅ Empty plan guard in `handleSave()` with user-facing error message
4. ✅ `planError` state from `useMemo` → Step4 renders error UI instead of perpetual spinner

---

## Milestone 11 — Cardio Sharing, Peptide Side Effects, USDA Nutrition, Training Enhancements

**Status:** ✅ Committed (8f1e670)
**Date:** 2026-03-18

### Features included

#### Cardio Sharing
- `ShareCard.tsx` — off-screen capture component (Story 9:16 + Feed 1:1 formats)
- `ShareModal.tsx` — share sheet UI with live preview, Save + Share actions
- `shareCardio.ts` — pure utils: captureRef, shareImage, saveToPhotos
- `session-detail.tsx` — Share button integration
- `session-summary.tsx` — Share button integration

#### Peptides: Half-Life Timeline + Side Effect Logging
- `halfLifeDecay.ts` — pure exponential decay math (decayLevel, generateCompoundCurve)
- `sideEffect.ts` — types + constants (SideEffect, SideEffectSeverity, SIDE_EFFECT_OPTIONS)
- `sideEffectService.ts` — Firestore CRUD for sideEffects collection
- `HalfLifeTimelineChart.tsx` — Victory-native chart with compound curves, dose markers, side-effect overlays
- `LogSideEffectModal.tsx` — emoji grid + severity + peptide link form
- `useHalfLifeTimeline.ts` — data hook (peptides + doses + side effects → chart series)
- `half-life-timeline.tsx` — screen shell
- `peptides/index.tsx` — Blood Levels quick-action button wired
- `peptides/_layout.tsx` — half-life-timeline route added

#### Nutrition: USDA FoodData Central Integration
- `usdaService.ts` — USDA API search + barcode lookup (degrades gracefully if no API key)
- `nutritionService.ts` — parallel USDA + OFF search, smart caching (partial results not cached)
- `food-detail.tsx` — micronutrient panel, RDA % badges, USDA portion buttons, source badge
- `nutrition.ts` — types for Micronutrients, FoodPortion, FoodSource, extended FoodSearchResult

#### Training Enhancements
- `active-session.tsx` — equipment swap, bare-minimum mode UI
- `useWorkoutSession.ts` — equipment swap, bare-minimum mode logic, crash recovery cache
- `workout.ts` — isBareMinimum, bareMinimumTimeCap, originalTotalSets fields

#### Firestore
- `firestore.ts` — SIDE_EFFECTS collection constant added

---

## Ray Review Notes (Milestone 11)

**Status:** REJECTED → FIXED (7bc2a3c)

**Fixed items:**
1. ✅ `maxLength={500}` added to notes TextInput in `LogSideEffectModal`
2. ✅ `seResult.error` surfaced in `useHalfLifeTimeline` error guard
3. ✅ `colorForPeptide` upgraded to djb2-style full-string hash (eliminates first-char collisions)
4. ✅ `getDoses()` now accepts optional `startDate` filter; hook passes 90-day lookback bound
5. ✅ `getFilteredSessions` activityType moved to client-side filter (same fix as `getSessionsInDateRange`)

---

## Pre-Launch Audit — Console / PII Cleanup

**Status:** ✅ Committed
**Date:** 2026-03-18

### Changes

- Wrapped 5 debug `console.log` calls in `__DEV__` guards:
  - `app/_layout.tsx` — AuthGuard state log
  - `app/(onboarding)/quiz.tsx` — 3 quiz flow logs (no currentUser, Firestore confirmed, refreshProfile complete)
  - `src/contexts/PremiumContext.tsx` — RevenueCat skip log
- Wrapped 2 PII-leaking `console.error` calls in `__DEV__` guards (Ray-flagged):
  - `src/services/firebase/auth.ts` — `JSON.stringify(e)` could embed email addresses
  - `src/contexts/AuthContext.tsx` — logged user UID on fetchProfile failure

### Not changed
- All `console.error`/`console.warn` on real failure paths with no user data retained as-is
- `LogWeightModal` consolidation skipped — incompatible APIs, both components actively used

---

---

## Milestone 12 — Flexible Consistency System

**Status:** ✅ Implemented (pending commit)
**Date:** 2026-03-18

### Features included

- `src/types/consistency.ts` — `DayStatus`, `DayConsistency`, `ConsistencyData` types
- `src/types/profile.ts` — `trainingDays?: number[]` added (0=Sun..6=Sat)
- `src/services/firebase/firestore.ts` — `CONSISTENCY: 'consistency'` collection
- `src/services/consistencyService.ts` — pure `computeConsistency()` + Firestore helpers (`getConsistencyDocs`, `persistConsistencyDay`, `markRestDayOverride`, `toggleRestDay`)
- `src/services/dashboardService.ts` — parallel-fetches 30-day nutrition logs + all doses + saved consistency docs; accepts `userProfile`
- `src/hooks/useDashboard.ts` — accepts `UserProfile`, card migration adds `consistency` after `greeting`, `toggleRestDay` action
- `src/components/dashboard/ConsistencyCard.tsx` — hero stat, monthly %, weekly ring chart, 30-day dot calendar, tap-to-tooltip + rest day toggle
- `src/components/dashboard/GreetingSection.tsx` — streak badge removed
- `app/(tabs)/dashboard/index.tsx` — ConsistencyCard wired, `useDashboard(userProfile)`

#### Classification: full / partial / rest / missed
- Based on user goals (training, nutrition, peptides)
- Bare-minimum workout + partial nutrition = yellow (partial)
- trainingDays config or manual override = gray (rest, neutral)

---

## Previous Milestones

| Milestone | Description | Status |
|---|---|---|
| 1 | Scaffold (Expo + Firebase + Auth) | ✅ Committed |
| 2 | Firebase setup + Firestore helpers | ✅ Committed |
| 3 | Auth flow (login, signup, onboarding) | ✅ Committed |
| 4–8 | Core modules (Peptides, Nutrition, Training, Cardio, Profile) | ✅ Committed |
| 9 | Peptides v2, HR monitoring, Theme, Equipment profiles | ✅ Committed |
| 10 | Smart Insights, USDA food data, Data export, Session preview | ✅ Committed |
| 11 | Cardio sharing, Peptide side effects + half-life, USDA integration, Analytics, Weekly summary | ✅ Committed |
| 12 | Flexible Consistency System (replaces streak counter) | ✅ Implemented |
