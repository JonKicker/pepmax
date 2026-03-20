# PepMax Feature Tracker

## Active Branch: `feature/build-all-priorities`

---

## Milestone 18 — Recovery Logging Data Layer

**Status:** ✅ Ray-approved (pending commit)
**Date:** 2026-03-20

### Features included

- `src/types/recovery.ts` — `RecoveryInput` type (sleepHours, sleepQuality, soreness, stress, readiness, recoveryMultiplier, timestamp, date). Replaces old `RecoveryEntry` (effortScore model).
- `src/utils/recoveryCalc.ts` — `calculateRecoveryMultiplier(sleepHours, sleepQuality, soreness, stress, readiness)` pure function. 5 mapping tables (sleepHours range-based, 4 discrete 1–5 fields). `clampRating()` throws on invalid discrete inputs. `parseFloat(toFixed(1))` rounding.
- `src/services/recoveryService.ts` — `saveRecovery(input)` (validates, calculates multiplier, writes to `COLLECTIONS.RECOVERY` keyed by `toLocalDateKey()`). `getRecovery(date)` reads by YYYY-MM-DD key. Both return `ServiceResult<T>`. Validation failures return `{ data: null, error }` — never throws past the return type.

### Architecture decision

Firestore path confirmed as `users/{uid}/recovery/YYYY-MM-DD` (Option A) — consistent with all 20+ existing collections. Spec path `users/{uid}/days/{date}/recovery` rejected as an orphaned pattern not used elsewhere.

### Known downstream breakage (intentional — follow-up milestone)

- `src/components/dashboard/RecoveryCard.tsx` — uses old `RecoveryEntry`, `effortScore`
- `src/components/dashboard/RecoveryCheckInModal.tsx` — uses old `saveRecovery` signature, `calculateEffortScore`
- `src/services/dashboardService.ts` — uses removed `getTodayRecovery`
- `src/types/dashboard.ts` — uses old `RecoveryEntry`
- `app/(tabs)/cardio/session-summary.tsx` — uses removed `getRecoveryByDate`, `effortScore`
- `src/utils/recovery.ts` — `effortColor()` helper for old effortScore

### Ray Review Notes

**Status:** APPROVED (after two conditional approval rounds)

**Round 1 fixes (first pass):**
1. ✅ `clampRating()` — throws explicitly on out-of-range/non-finite discrete inputs, removed `?? 1.0` silent fallbacks
2. ✅ `parseFloat(avg.toFixed(1))` — replaces `Math.round(avg * 10) / 10`
3. ✅ Input validation added to `saveRecovery` before Firestore write

**Round 2 fixes:**
4. ✅ Firestore path confirmed correct (Option A — existing flat pattern)
5. ✅ `validateRecoveryInput` wrapped in try/catch — validation failures now return `ServiceResult` error instead of throwing past return type

---

## Milestone 17 — Pro Subscription Gating + Dev Trial

**Status:** ✅ Ray-approved (pending commit)
**Date:** 2026-03-20

### Features included

- `src/types/subscription.ts` — `isTrial: boolean`, `startTrial: () => Promise<void>` added to `PremiumState`
- `src/constants/premium.ts` — `PRO_FEATURES` array (12 features, free/pro availability flags)
- `src/services/subscriptionService.ts` — `startDevTrial()` (write `users/{uid}/subscription/trial`), `getDevTrial()` (read same)
- `src/contexts/PremiumContext.tsx` — `checkTrial()` (validates Firestore trial, sets `expirationDate`), `startTrial()` (idempotent — throws `TRIAL_ALREADY_USED` if prior trial exists), trial check wired into `checkSubscription()` for both dev and RevenueCat paths
- `src/components/premium/PremiumGate.tsx` — "Tap to unlock" now routes to `/go-pro` instead of `/paywall`
- `app/(tabs)/peptides/half-life-timeline.tsx` — Wrapped in `<PremiumGate fullScreen>`
- `app/(tabs)/training/measurement-trends.tsx` — Wrapped in `<PremiumGate fullScreen>`
- `app/(tabs)/nutrition/micros.tsx` — Wrapped in `<PremiumGate fullScreen>`
- `app/(tabs)/training/session-preview.tsx` — Bare Minimum panel gated in `<PremiumGate>` + `ProBadge` on toggle button
- `app/(tabs)/peptides/index.tsx` — `ProBadge` on "Blood Levels" button
- `app/(tabs)/training/body-measurements.tsx` — `ProBadge` on "View Trends" button
- `app/(tabs)/nutrition/index.tsx` — `ProBadge` on "Micronutrients" card
- `app/go-pro.tsx` — **NEW** — Free vs Pro comparison table, "Start Free 7-Day Trial" CTA, trial status display, "View Plans" link
- `app/_layout.tsx` — `go-pro` registered as modal route
- `app/(tabs)/profile/index.tsx` — "Upgrade to Premium" → "Go Pro" button routes to `/go-pro`

### Ray Review Notes

**Status:** CONDITIONAL APPROVAL → fixes applied → APPROVED

**Round 1 fixes applied:**
1. ✅ `checkTrial()` now sets `setExpirationDate(data.expiresAt)` — days-remaining display works correctly
2. ✅ `startTrial()` idempotency guard — throws `TRIAL_ALREADY_USED` if prior trial exists; no clock reset exploit
3. ✅ Dev error logging added to `checkTrial()` catch block
4. ✅ `go-pro.tsx` error handler distinguishes `TRIAL_ALREADY_USED` from generic errors

**Tracked observations (non-blocking, future cleanup):**
- Dual `expiresAt` computation: service computes at write time, context computes post-async — sub-second delta, low impact. Fix: have `startDevTrial()` return the written timestamp
- Magic string sentinel `'TRIAL_ALREADY_USED'` — acceptable for single-layer mobile app; convert to typed error class if error handling grows
- `checkTrial` false-path: `setExpirationDate(null)` not called on expiry — stale value in memory until cold relaunch (no user-visible impact currently)

---

## Milestone 16 — Privacy & Data

**Status:** ✅ Committed (b32b68f)
**Date:** 2026-03-20

### Features included

- `app/(tabs)/profile/privacy.tsx` — Privacy Panel: 4-card accordion (single-open, chevron icons), inline "type DELETE" account deletion confirmation (cross-platform TextInput, no Alert.prompt)
- `app/(tabs)/profile/export-data.tsx` — Export screen: premium gate (useEffect redirect), JSON + CSV/ZIP format buttons, per-button loading spinners + "Gathering your data…" message
- `src/services/dataExportService.ts` — Full rewrite: `exportUserDataAsJSON()` (all collections + profile), `exportUserDataAsCSV()` (JSZip bundle, per-collection CSVs, Timestamps → ISO strings, key union across rows), `exportUserData` alias for backward compat
- `src/services/accountService.ts` — 11 missing collections added to `QUERYABLE_COLLECTIONS`: sideEffects, aiInsights, consistency, cycles, recipes, bodyMeasurements, inventory, recovery, reconProtocols, equipmentProfiles, nutrition
- `app/(tabs)/profile/_layout.tsx` — `privacy` + `export-data` routes added
- `app/(tabs)/profile/index.tsx` — Data & Privacy section: "Privacy & Data" nav row, "Export My Data" nav row, "Delete All Data" kept; Delete Account + handleExportData handlers removed (moved to new screens)
- `jszip` installed (pure JS, Expo managed workflow compatible)

### Ray Review Notes

**Status:** CONDITIONAL APPROVAL → fix applied, committed

**Fix applied before commit:**
1. ✅ `router.replace('/paywall')` moved from render body into `useEffect` — React rules violation fix

**Tracked observations (non-blocking):**
- File accumulation in `documentDirectory` — acknowledged, cleanup pass deferred
- CSV formula injection — low risk (user's own data to themselves), no fix required

---

## Milestone 15 — Body Measurements

**Status:** ✅ Committed (17cc508)
**Date:** 2026-03-20

### Features included

- `src/types/bodyMeasurement.ts` — `BodyMeasurement`, `CircumferenceMeasurements`, `BodyMeasurementInput`, `CIRCUMFERENCE_FIELDS`
- `src/services/bodyMeasurementService.ts` — CRUD + photo upload/compress (expo-image-manipulator) + weight sync to `bodyWeight` collection on save
- `src/utils/bodyMeasurementUtils.ts` — `filterByTimeRange`, `computeWeeklyAverages`, `findPersonalBests`, `computeMonthlyChange`
- `src/components/body/MeasurementTrendChart.tsx` — Victory Native chart: daily faint line + weekly average scatter + area fill + time range tabs
- `src/components/training/BodyMeasurementSummary.tsx` — Training tab summary card (latest weight + monthly change)
- `app/(tabs)/training/body-measurements.tsx` — History list, delete with confirmation, error/retry state
- `app/(tabs)/training/log-measurement.tsx` — Log form: weight, body fat %, 9 circumference fields, photo (stubbed, needs expo-image-picker), notes. Full input validation + maxLength
- `app/(tabs)/training/measurement-trends.tsx` — Weight / BF% / waist trend charts + personal bests, error/retry state
- `src/hooks/useUnits.ts` — `lengthLabel`, `formatLength`, `convertLengthToDisplay`, `convertLengthToCm`
- `app/(tabs)/training/_layout.tsx` — Routes added for all 3 new screens
- `app/(tabs)/training/index.tsx` — `BodyMeasurementSummary` wired

### Ray Review Notes

**Status:** APPROVED (after two conditional approval rounds)

**Round 1 fixes:**
1. ✅ Input validation on weight, body fat %, and circumference fields (range checks before Firestore write)
2. ✅ `maxLength={500}` on notes TextInput
3. ✅ Error state + tappable retry on `getMeasurementHistory()` failure in both screens
4. ✅ Dead `computeMonthlyChange` import removed from `training/index.tsx`
5. ✅ `Colors.light?.success` → `Colors.light.success` (removed unnecessary optional chain)

**Round 2 fix:**
6. ✅ Unused `Alert` import removed from `measurement-trends.tsx`

### Known gaps (future milestone)
- Photo picker stubbed — needs `expo-image-picker` installed and wired
- `computeMonthlyChange` in Training index always returns null (full history not fetched there) — tracked for future enhancement

---

## Milestone 13 — Recovery Card + Daily Check-In

**Status:** ✅ Implemented + Ray fixes applied (pending commit)
**Date:** 2026-03-19

### Features included

- `src/types/recovery.ts` — `RecoveryEntry` type (sleepQuality, sleepHours, energyLevel, effortScore, timestamp)
- `src/utils/recovery.ts` — `effortColor(score)` shared presentation utility
- `src/services/recoveryService.ts` — `calculateEffortScore`, `saveRecovery`, `getTodayRecovery`, `getRecoveryByDate`
- `src/services/firebase/firestore.ts` — `RECOVERY: 'recovery'` collection constant
- `src/types/dashboard.ts` — `'recovery'` added to `DashboardCardId`, `recovery` field on `DashboardData`, default card order updated
- `src/services/dashboardService.ts` — `getTodayRecovery()` added to parallel fetch
- `src/hooks/useDashboard.ts` — card order migration for `'recovery'`
- `src/components/dashboard/RecoveryCheckInModal.tsx` — bottom sheet with sleep quality (5 buttons), sleep hours (stepper 3–12, step 0.5), energy level (5 buttons), live score preview, skip-with-nag + AsyncStorage dismiss
- `src/components/dashboard/RecoveryCard.tsx` — effort score (green/yellow/red) with sleep/energy emojis, or "Check In" prompt
- `app/(tabs)/dashboard/index.tsx` — card wired, modal wired, auto-trigger useEffect
- `app/(tabs)/cardio/session-summary.tsx` — effort score `StatRow` with color coding

### Ray Review Notes

**Status:** CONDITIONAL APPROVAL → fixes applied

**Fixes applied:**
1. ✅ `skipCount` resets to 0 on modal open (`useEffect([visible])`)
2. ✅ `handleSkip` AsyncStorage.setItem wrapped in try/catch/finally
3. ✅ Dead ternary in sleep hours display removed (`${sleepHours}h`)
4. ✅ `RecoveryEntry.timestamp` typed as `Timestamp` (from firebase/firestore)
5. ✅ `effortColor` extracted to `src/utils/recovery.ts` (not service layer — Ray's architecture note applied)
6. ✅ `useEffect` dep tightened from `[data]` to `[data?.recovery]`

---

## Milestone 14 — Peptide Inventory Tracker

**Status:** ✅ Committed
**Date:** 2026-03-19

### Features included

- `src/types/inventory.ts` — `InventoryItem`, `InventoryItemType`, `CompoundSubType`, `SupplyCategory`, `StockStatus`, `SUPPLY_CATEGORIES`, `SUPPLY_CATEGORY_LABELS`, `AUTO_DECREMENT_SUPPLY_TYPES`
- `src/services/firebase/firestore.ts` — `INVENTORY: 'inventory'` collection constant
- `src/services/inventoryService.ts` — CRUD (`addInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `getInventoryItems`) + FIFO decrement (`decrementCompoundInventory`, `decrementSupplyItems`, `decrementInventoryOnDose`)
- `src/services/notificationService.ts` — `scheduleLowStockNotification`, `cancelLowStockNotification`, `cancelAllLowStockNotifications`
- `src/hooks/useInventory.ts` — `useInventory()` hook with `computeDailyConsumption`, `computeDaysUntilEmpty`, `computeStockStatus` pure functions; auto-schedules low-stock notifications on focus
- `src/components/peptides/AddInventoryItemModal.tsx` — Add/edit modal for compound (vial/pen) and supply items with full validation
- `app/(tabs)/peptides/inventory.tsx` — Inventory screen: color-coded cards (green/yellow/red), progress bars, swipe-to-delete, FAB + ActionSheet/Alert for compound vs supply add
- `app/(tabs)/peptides/_layout.tsx` — `inventory` Stack.Screen added
- `app/(tabs)/peptides/index.tsx` — "Inventory" quick-action button (`cube-outline`)
- `app/(tabs)/peptides/log-dose.tsx` — fire-and-forget `decrementInventoryOnDose()` after dose save; Toast gains optional inventory sub-line

### Ray Review Notes (Milestone 14 — Inventory Tracker)

**Status:** APPROVED (after conditional approval round)

**Fixes applied before full approval:**
1. ✅ FIFO cascade bug: `remainingToSubtract` now carries overflow to the next item when an item is fully exhausted; was unconditionally zeroed out before
2. ✅ Toast totals: replaced `lastUpdatedItem` with `finalStates[]` array accumulating all items (updated + untouched); reduce sums across all for accurate total
3. ✅ Android FAB: `Alert.alert()` now offers both "Compound" and "Supply" choices on Android (was hardcoded to compound)
4. ✅ `remainingAmount > totalAmount` validation added in `AddInventoryItemModal.handleSave()` before Firestore write

---

## Milestone 13 — Recipe Builder

**Status:** ✅ Committed
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

## Micronutrient Dashboard — Post-Ray Fixes

**Status:** ✅ Applied (pending commit)
**Date:** 2026-03-19

### Ray Conditional Approval items resolved

1. ✅ **Fix 1 (must)** — Race condition: removed `timeRange` from `useFocusEffect` inner `useCallback` deps. `useFocusEffect` now fires only on screen focus; all range-change reloads go exclusively through `handleRangeChange`. ESLint suppression comment added explaining the intentional omission.
2. ✅ **Fix 2 (must)** — Silent error swallowing: added `error: string | null` state. `load()` calls `setError(null)` at the top (Ray clarification), sets error message on Firestore failure. Error UI renders as tappable retry row with alert icon above the list. List suppressed while error is active.
3. ✅ **Fix 3 (tracked)** — 28-day window: added precise doc comment explaining 4×7=28 day evaluation window and why days 29–30 of the 30-day chart are excluded (unequal final week would skew per-week RDA average).
4. ✅ **Fix 4 (tracked)** — Already correct: `weeklyAvgRdaPercents` was already using `slice.length` as divisor. No change needed.
5. ✅ **Fix 5 (tracked)** — Removed unused `Micronutrients` import from `microAggregation.ts`. Added inline comment on cast sites confirming intentional `Record<string, number | null>` cast.

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
