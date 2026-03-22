# PepMax Feature Tracker

## Active Branch: `feature/m22-analytics-sentry-settings`

---

## UI Polish — Stagger Animations, Screen Transitions, Cardio FAB, Chart Polish

**Status:** ✅ Ray-approved (one conditional round resolved)
**Date:** 2026-03-22
**Commit:** f866ab4

### Features included

#### Dashboard Card Stagger Animations
- `app/(tabs)/dashboard/index.tsx` — `AnimatedCard` wrapper component (Reanimated 4): each card fades in + slides up (`opacity: 0→1`, `translateY: 20→0`) with `withDelay(index * 100, ...)`, 100ms stagger per card. Skeleton cards also staggered. Mount-only animation (intentional `[]` dep with ESLint suppression comment).

#### Screen Slide Transitions
- `app/(tabs)/dashboard/_layout.tsx` — `animation: 'slide_from_right'` added to `screenOptions`
- `app/(tabs)/nutrition/_layout.tsx` — same
- `app/(tabs)/training/_layout.tsx` — same
- `app/(tabs)/peptides/_layout.tsx` — same
- `app/(tabs)/cardio/_layout.tsx` — same

#### Cardio FAB
- `app/(tabs)/cardio/index.tsx` — Floating `+` button (`Colors.cardio`, `bottom: 72`, `right: 24`) navigates to `start-session`. `paddingBottom: 148` on scroll list ensures last card clears FAB + footer.

#### Chart Polish
- `src/components/cardio/HeartRateChart.tsx` — `VictoryVoronoiContainer` + `VictoryTooltip` (shows time + bpm on touch)
- `app/(tabs)/cardio/progress.tsx` — Voronoi tooltip on pace trend chart (date + pace/unit label)
- `app/(tabs)/training/progress.tsx` — `interpolation="monotoneX"` on strength VictoryLine + Voronoi tooltip
- `src/components/body/MeasurementTrendChart.tsx` — `interpolation="monotoneX"` on both VictoryLine + VictoryArea

### Ray Review Notes

**Status:** APPROVED (after one conditional round)

**Fixes applied:**
1. ✅ `paddingBottom` on cardio scroll list: 16 → 148 (FAB was obscuring last activity card's Start button)
2. ✅ `AnimatedCard` `useEffect` — `eslint-disable-next-line react-hooks/exhaustive-deps` with rationale comment added

**Tracked observations (non-blocking):**
- Strength tooltip missing unit label (`lbs`/`kg`) — future pass should pull from `userProfile`
- `HeartRateChart` axis colors still hardcoded — pre-existing; component has no `colors` prop; deferred

---

## Milestone 22 — Analytics Wiring, Sentry API Breadcrumbs & Settings Completion

**Status:** ✅ Ray-approved (one conditional round resolved — commit 02ef207)
**Date:** 2026-03-22

### Features included

#### Analytics Events (7 previously defined-but-never-called)
- `app/(tabs)/peptides/peptide-form.tsx` — PEPTIDE_ADDED on save, guarded to add-only path (`!isEditing`)
- `app/(tabs)/peptides/log-dose.tsx` — DOSE_LOGGED after successful `addDose`; REMINDER_SET inside `if (intervalHours !== undefined)` block after `scheduleDoseReminder`
- `src/components/peptides/LogSideEffectModal.tsx` — SIDE_EFFECT_REPORTED after successful `addSideEffect`
- `app/(tabs)/dashboard/photo-comparison.tsx` — PHOTO_COMPARISON_VIEWED via `useFocusEffect`; PHOTO_SHARED in `handleShare` after `Share.share()` resolves
- `app/_layout.tsx` — SCREEN_VIEWED via `useEffect` on `segments` changes (gated on `navigationState?.key`)
- `app/_layout.tsx` — `modules_active: userProfile.goals` added to `setUserProperties` block
- `app/_layout.tsx` — `PremiumSync` component added inside PremiumProvider; calls `setUserProperties({ plan_type })` when plan changes

#### Sentry API Breadcrumbs
- `src/services/usdaService.ts` — `addBreadcrumb('api', 'usda_food_search')` before food search fetch; `addBreadcrumb('api', 'usda_barcode_search')` before barcode fetch
- `src/services/aiInsightService.ts` — `addBreadcrumb('api', 'ai_insight_request')` before Claude API fetch

#### Settings Screen: Delete Account
- `app/(tabs)/profile/index.tsx` — "Delete My Account" SettingsRow added below "Delete All Data" in Data & Privacy section
- Handler: haptic warning → Alert.alert → Alert.prompt (email confirmation) → case-insensitive email match → `deleteAccount()` from accountService → `auth/requires-recent-login` surfaced specifically → AuthGuard handles redirect on success

#### Nutrition Settings: Lean Bulk
- `app/(tabs)/nutrition/settings.tsx` — goal adjustment type widened to `<-500 | 0 | 250 | 500>`; options renamed Cut / Maintain / Lean Bulk (+250) / Bulk (+500)

### Architecture decisions
- `PremiumSync` renders null and lives inside PremiumProvider — cleanest way to access `usePremium()` from within `_layout.tsx` without restructuring provider hierarchy
- REMINDER_SET fires only when `intervalHours !== undefined` — matches existing fire-and-forget pattern; no tracking for compounds with no scheduled frequency
- PHOTO_SHARED fires after `Share.share()` resolves — user may have cancelled the share sheet; this is intentional (sheet was shown = intent to share)
- Delete Account does not call `analytics.reset()` explicitly — `auth/requires-recent-login` path aborts before deletion; on success, AuthGuard detects `currentUser → null` and the prevUidRef effect in `_layout.tsx` calls `analytics.reset()` + `sentrySetUser(null)` automatically

---

## Compound Database Integration (FINAL)

**Status:** ✅ Ray-approved (one conditional round resolved)
**Date:** 2026-03-22

### Changes

- `src/data/compoundDatabase.ts` — Replaced with fact-checked FINAL version: type-safe `DoseUnit`, `hasSafetyWarning()` export, corrected compound data (Selank, Semax, Sermorelin, CJC-1295, TB-500 corrections). Fixed `reconstitutionNeeded: true` → `false` on Semaglutide and Tirzepatide (prefilled pens).
- `src/components/peptides/PresetBrowser.tsx` — ⚠️ warning icon on compounds with safety warnings; filled status badges ("FDA" green, "Research" orange, "Compounded" gray); 500ms search debounce via `debouncedQuery` + `debounceRef`; orange/bold warning text for `⚠️` segments in `notesForUsers`; 48dp min touch targets on chips, dose chips, custom add btn, details toggle.
- `app/(tabs)/peptides/recon-calculator.tsx` — Compound picker section using `getReconstitutableCompounds()`; pre-fills vial size (regex parsed from `typicalVialSize`) and first common dose on selection; user can override.
- `app/(tabs)/peptides/peptide-form.tsx` — Compound autocomplete on name input (≥2 chars, top 5 results, suppressed in edit mode); on selection pre-fills name, dose, unit, frequency, route, category, halfLifeHours, storage, notes.
- `src/services/peptideService.ts` — Exported `parseRoute`, `parseUnit`, `parseFrequency`, `mapGroupToCategory` for use in peptide form.
- `compoundDatabase_FINAL.ts` — Deleted from project root (moved to `src/data/`).

### Ray Review Notes

**Status:** CONDITIONAL APPROVAL

**Tracked observations (non-blocking, fix before public release):**
1. Dark mode badge contrast — FDA/Research badge pastels (#E8F5E9, #FFF3E0) may look jarring on dark surfaces. Recommend dark-mode variants before paywall/public release.
2. `parseRoute` always returns `'SubQ'` fallback — `if (r) setRoute(r)` in `handleSelectSuggestion` is always true. Audit `ROUTES` array vs compound route strings.
3. `FlatList` with `scrollEnabled={false}` in recon calculator — simple `.map()` would suffice for ~17 items. Cleanup candidate.

---

## Milestone 21 — Deferred Items Completion

**Status:** ✅ Ray-approved (one conditional round resolved)
**Date:** 2026-03-22

### Features included

#### Body Model Trigger Wiring
- `src/hooks/useWorkoutSession.ts` — fire-and-forget `computeAndSaveBodyModel(toLocalDateKey())` after `updateSession` in `finishWorkout`
- `src/hooks/useCardioSession.ts` — fire-and-forget `computeAndSaveBodyModel(toLocalDateKey())` before `clearCachedSession` in `stop`
- `src/services/recoveryService.ts` — fire-and-forget `computeAndSaveBodyModel(date)` on success path of `saveRecovery`
- `src/services/nutritionService.ts` — fire-and-forget `computeAndSaveBodyModel(data.date)` inside `if (result.data)` in `logFood`

#### Photo Picker (Body Measurements)
- `expo-image-picker` installed (SDK 54.0.0 compatible)
- `app/(tabs)/training/log-measurement.tsx` — `handlePickPhoto` stub replaced with real `launchImageLibraryAsync` call. Upload/compression/preview/Firebase Storage were already wired.

#### Compound Exercise Modifier
- `src/constants/bodyModel.ts` — `COMPOUND_EXERCISE_MODIFIER = 1.2` constant added
- `src/types/workout.ts` — `category?: ExerciseCategory` added to `SessionExercise` (optional, backward-compatible)
- `src/hooks/useWorkoutSession.ts` — `category` captured from exercise library at 3 build points: template load, `addExercise`, `swapExercise`
- `src/utils/bodyModelCalc.ts` — `buildFatigueEvents` applies `COMPOUND_EXERCISE_MODIFIER` when `ex.category === 'Compound'`

### Ray Review Notes

**Status:** APPROVED (after one conditional round)

**Fix applied:**
1. ✅ `handlePickPhoto` wrapped in try/catch — `launchImageLibraryAsync` can throw on Android when photo library permission is permanently denied; `Alert.alert` shown on failure

**Tracked observations (non-blocking):**
- Nutrition trigger fires on every `logFood` call with no debounce — low impact at current write volumes, last-write-wins semantics are fine; debounce is a future optimization

### Architecture decisions
- All body model triggers are fire-and-forget (`.catch(() => {})`) — matching HealthKit write pattern; never surface to UI
- `category` on `SessionExercise` is optional — Firestore sessions written before this change have `undefined`, which falls through to the `1.0` default modifier (no behavior change for old data)
- Photo picker uses `launchImageLibraryAsync` only (no camera) — no new permission strings required beyond photo library access already granted

---

---

## PresetBrowser → COMPOUND_DATABASE Migration

**Status:** ✅ Committed (04b84d7)
**Date:** 2026-03-20

### Changes
- `src/components/peptides/PresetBrowser.tsx` — full rewrite: SectionList with 14 CompoundCategory groups, expandable cards, dose chips, custom dose input (capped ≤10000), View Details panel (mechanism, side effects, stacks, reconstitution, storage, notes)
- `src/services/peptideService.ts` — `parseRoute`, `parseUnit`, `parseFrequency`, `mapGroupToCategory` helpers; `addPeptideFromPreset` now accepts `Compound` (Firestore schema unchanged)
- `app/(tabs)/peptides/index.tsx` — `PresetCompound` → `Compound` import
- `src/data/presetCompounds.ts` — deleted

### Ray Review
**Status:** APPROVED (after one conditional round)

**Fixes applied:**
1. ✅ `parseFrequency` check order — `2x/3x weekly` checked before `weekly`; `nightly` added to `daily` branch
2. ✅ Custom dose upper bound — `val <= 10000` guard before Firestore write
3. ✅ Alias suppression — `.startsWith('N/A')` replaces exact magic string match

---

## Milestone 20 — Body Model Scoring Engine

**Status:** ✅ Ray-approved (one conditional round resolved)
**Date:** 2026-03-20

### Features included

- `src/types/bodyModel.ts` — `MusculoskeletalZone` (13 zones), `SystemZone` (5 zones), `MuscleZoneScores`, `SystemZoneScores`, `BodyModelBonuses`, `BodyModelSnapshot`
- `src/constants/bodyModel.ts` — `DEFAULT_RECOVERY_MULTIPLIER = 1.0`, `FATIGUE_LOOKBACK_DAYS = 14`, `BODY_MODEL_MAX_RANGE_DAYS = 90`, `BASE_FATIGUE_PER_SET = 6`, `RPE_MULTIPLIERS`, `BASE_RECOVERY_HOURS` (per zone), `MUSCLE_GROUP_TO_ZONES` mapping, `ZONE_WEIGHTS` (verified sum = 1.000)
- `src/utils/bodyModelCalc.ts` — Pure functions: `computeAllMuscleZones`, `computeAllSystemScores`, `computeSynergyScore`, `computeBonuses`, `computeAcuteChronicRatio`, `hasConsistencyBonus`, `rpeMultiplier`, `recoveryFraction`, `computeZoneScore`
- `src/services/bodyModelService.ts` — `computeAndSaveBodyModel(date, calorieTarget?)`, `getBodyModel(date)`, `getBodyModelRange(startDate, endDate)`
- `src/services/firebase/firestore.ts` — `BODY_MODEL: 'bodyModel'` added to COLLECTIONS
- `src/services/accountService.ts` — `BODY_MODEL` added to `QUERYABLE_COLLECTIONS`
- `src/services/dataExportService.ts` — `BODY_MODEL` added to `EXPORT_COLLECTIONS`

### Architecture decisions

- **Partial data failure**: `Promise.allSettled` used for all 4 data source fetches. Any failure falls back to a safe default — computation always proceeds.
- **Recovery multiplier fallback**: `DEFAULT_RECOVERY_MULTIPLIER = 1.0` applied when no check-in exists. Prevents division-by-zero in `effectiveHours = baseHours / multiplier`.
- **Phase 1 system scores**: CNS and Immune are data-driven; Cardiovascular uses cardio session history; Metabolic uses calorie adherence; GI hardcoded to 90 (pending side-effect integration). All enhancement targets documented inline.
- **Trigger wiring deferred**: `computeAndSaveBodyModel` is not yet called from workout/recovery/cardio completion — that's M21 or a follow-up task.
- **No compound modifier**: `SessionExercise` stores `primaryMuscle` only, not exercise category. Compound 1.2× modifier deferred until workout data model captures category.
- **getBodyModelRange cap**: `BODY_MODEL_MAX_RANGE_DAYS = 90` enforced via Firestore query `limit()`.

### Ray's conditional approval decisions (locked before code was written)

1. ✅ `DEFAULT_RECOVERY_MULTIPLIER = 1.0` — named constant, null-checked in `recoveryFraction()` before division
2. ✅ Partial data failure → proceed with defaults (not abort). Each source has a documented fallback.

### Ray Review Notes

**Status:** APPROVED (after one conditional round)

**Fixes applied:**
1. ✅ `recovery?.stress` → `recovery?.stressLevel` — stress field name mismatch; CNS/immune scores now use actual logged stress
2. ✅ `s.totalSets ?? 0` guards in `computeCNSScore` and `computeAcuteChronicRatio` — prevents NaN propagation from missing fields
3. ✅ `s.duration ?? 0` guards in `computeCardiovascularScore` and `computeAcuteChronicRatio` — same NaN protection
4. ✅ `!isNaN(referenceDate.getTime())` guard added post-date-parse (Ray tracked item)
5. ✅ Future-timestamp bounds (`daysAgo >= 0`) added to `hasConsistencyBonus` and `computeAcuteChronicRatio` filters (Ray tracked item)

---

## Milestone 19 — Apple HealthKit Integration

**Status:** ✅ Ray-approved (three conditional rounds resolved)
**Date:** 2026-03-20

### Features included

- `src/types/healthKit.ts` — `HealthKitRecoveryData`, `HealthKitSleepData` types
- `src/constants/healthKit.ts` — `HK_READ_IDENTIFIERS`, `HK_WRITE_IDENTIFIERS` arrays (string-literal v13 style)
- `src/services/healthKitService.ts` — full read/write layer: sleep, HR, HRV, steps, weight, nutrition sync, cardio sync, strength sync. Platform.OS guard + try/catch on every export. Never throws. `requestPermissions` uses documented `as any` cast pending upstream type fix.
- `src/hooks/useHealthKit.ts` — `enable()` (checks `requestPermissions()` return before writing Firestore flag), `disable()`, `syncRecoveryData()`, `syncSteps()`, `syncWeight()`. Foreground AppState listener debounced to 5min.
- `src/services/bodyWeightService.ts` — fire-and-forget `writeBodyWeight` after `logWeight`; `note === 'healthkit'` guard prevents sync loop.
- `src/services/nutritionService.ts` — fire-and-forget `writeNutrition` after `logFood`; UUID stored in Firestore for deduplication.
- `src/services/bodyMeasurementService.ts` — fire-and-forget `writeBodyWeight`/`writeBodyFat` after measurement log.
- `src/hooks/useCardioSession.ts` — `writeCardioWorkout` on session end; `healthKitUUID` stored in Firestore.
- `src/types/profile.ts` — `healthKitEnabled?: boolean`
- `src/types/cardio.ts` — `healthKitUUID?: string`
- `src/types/nutrition.ts` — `healthKitUUID?: string` on `FoodLogEntry`
- `src/components/dashboard/RecoveryCheckInModal.tsx` — HealthKit auto-fill on open (sleep hours, sleep quality, resting HR, HRV refs). `userTouchedRef` guard prevents overwriting user input. Apple Health badge shown when data pre-filled. `.catch()` on async HealthKit chain.

### Ray Review Notes

**Status:** APPROVED (after four conditional approval rounds)

**Round 1 fixes:**
1. ✅ Renamed constants `HK_READ_PERMISSIONS` → `HK_READ_IDENTIFIERS`, `HK_WRITE_PERMISSIONS` → `HK_WRITE_IDENTIFIERS` (string-literal v13 API style)
2. ✅ Unsafe type cast replaced with documented `as any` + ESLint disable comment explaining v13 API mismatch
3. ✅ `enable()` now checks `requestPermissions()` return value before persisting `healthKitEnabled: true` to Firestore
4. ✅ Dead `HK_CACHE_KEY` constant removed

**Round 2 fixes:**
5. ✅ `syncWeight()` in `useHealthKit` — `note: 'healthkit'` guard added to `bodyWeightService.logWeight` to prevent HealthKit→Firestore→HealthKit sync loop
6. ✅ Fire-and-forget writes use `.catch(() => {})` — never surface to UI
7. ✅ `writeNutrition` UUID stored in Firestore for deduplication

**Round 3 fixes:**
8. ✅ `sleepQuality` estimation incorporates deep/rem ratio (restorative >35% → +1, <15% → -1)
9. ✅ `userTouchedRef` guard in RecoveryCheckInModal prevents HealthKit pre-fill from overwriting user input after interaction
10. ✅ Missing `hkBadge`/`hkBadgeText` StyleSheet entries added
11. ✅ Silent save failure fixed — `Alert.alert` shown on both `result.error` branch and catch branch

**Round 4 fixes:**
12. ✅ `as any` cast + misleading comment removed from `requestPermissions` — package types already declare `{ toRead, toShare }` signature
13. ✅ `'healthkit'` magic string replaced with `HK_WEIGHT_SOURCE_MARKER` constant in `constants/healthKit.ts`; both `bodyWeightService` and `useHealthKit` import and use it
14. ✅ `Platform.OS !== 'ios'` guard added to `fetchRecoveryData` — avoids 3 no-op parallel calls on Android
15. ✅ Dead `durationSeconds` field removed from `StrengthWriteData` type and `session-summary.tsx` call site

---

## Milestone 18 — Recovery Logging Data Layer

**Status:** ✅ Ray-approved (two conditional rounds resolved)
**Date:** 2026-03-20

### Features included

- `src/types/recovery.ts` — `RecoveryInput` type (sleepHours, sleepQuality, soreness, stress, readiness, recoveryMultiplier, timestamp, date). Replaces old `RecoveryEntry` (effortScore model).
- `src/utils/recoveryCalc.ts` — `calculateRecoveryMultiplier(sleepHours, sleepQuality, soreness, stress, readiness)` pure function. 5 mapping tables (sleepHours range-based, 4 discrete 1–5 fields). `clampRating()` throws on invalid discrete inputs. `parseFloat(toFixed(1))` rounding.
- `src/services/recoveryService.ts` — `saveRecovery(input)` (validates, calculates multiplier, writes to `COLLECTIONS.RECOVERY` keyed by `toLocalDateKey()`). `getRecovery(date)` reads by YYYY-MM-DD key. Both return `ServiceResult<T>`. Validation failures return `{ data: null, error }` — never throws past the return type.

### Architecture decision

Firestore path confirmed as `users/{uid}/recovery/YYYY-MM-DD` (Option A) — consistent with all 20+ existing collections. Spec path `users/{uid}/days/{date}/recovery` rejected as an orphaned pattern not used elsewhere.

### Consumer fixes (follow-up commit — 2026-03-20)

All downstream breakage resolved:

- `src/types/dashboard.ts` — `RecoveryEntry` → `RecoveryInput`
- `src/components/dashboard/RecoveryCard.tsx` — `readinessScore` display with `effortColor`, sleep/soreness detail
- `src/components/dashboard/RecoveryCheckInModal.tsx` — 5-input form (sleep quality, sleep hours, muscle soreness, stress level, overall readiness 0-10), scrollable layout, live `readinessScore` preview, notes field
- `src/utils/recovery.ts` — `effortColor` (0-100 readinessScore), `multiplierColor`, `multiplierLabel`
- `src/utils/recoveryCalc.ts` — updated to use type field names (`muscleSoreness`, `stressLevel`, `overallReadiness` 0-10), added `multiplierToDisplayScore`
- `src/services/recoveryService.ts` — accepts full type field names + `notes`, dual-collection fallback for legacy docs
- `app/(tabs)/cardio/session-summary.tsx` — `getRecovery` + `recoveryMultiplier` display

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

**Status:** ✅ Committed (cb3ca0c)
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

**Status:** ✅ Committed (0438985)
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

**Status:** ✅ Committed
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

**Status:** ✅ Committed (531a7a0)
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
