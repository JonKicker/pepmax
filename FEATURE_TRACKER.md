# PepMax Feature Tracker

## Active Branch: `feature/recovery-readiness-score`

---

## Daily Quests — Dashboard Integration

**Status:** ✅ Ray-approved (2026-03-24, Plan: 0 cycles (wiring only), Build: 1 cycle)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

Wired the existing Daily Quests system into the dashboard card feed. All quest logic was already production-ready — this was purely integration.

- `src/types/dashboard.ts` — Added `'quests'` to `DashboardCardId` union + default order (position 3, after Body Hub)
- `src/hooks/useDashboard.ts` — Migration block for existing users
- `app/(tabs)/dashboard/index.tsx` — `DailyQuestsCard` + `useQuests` wired into renderCard switch
- `src/components/gamification/XPToast.tsx` — Added quest source labels

### How it works
- 3 daily quests (module-aware, de-duplicated, deterministic seed)
- Auto-complete via progressCoordinator when matching actions occur
- 10-20 XP per quest + 25 XP bonus for completing all 3
- Countdown timer to midnight reset

---

## Profile Section Redesign — Photo, Bio, Username, Smart Reminders, Weight Sync

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle, Build: 3 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Profile Card Redesign** (`app/(tabs)/profile/index.tsx`)
- Profile picture upload/remove via Firebase Storage (compressed to 400px, mirrored to publicProfiles)
- Username display (`@username`) with link to choose-username screen if unset
- Short bio editing (160 char max, inline edit with character counter)
- Removed "Go Pro" button, "Restore Purchases" button, and FREE badge
- PRO badge only shown when user has active subscription

**Reminder Time Pickers** (`app/(tabs)/profile/index.tsx`)
- Dose, Workout, and Recovery reminders now support Custom time or Optimized mode
- Custom: native `DateTimePicker` for selecting exact time
- Optimized: HealthKit-aware — derives ideal times from 7-day sleep/wake pattern
- Fallback to smart defaults (7 AM / 9 AM / 5 PM) when no HealthKit data

**Profile Picture Service** (`src/services/profilePictureService.ts`)
- `uploadProfilePicture()` — compress, upload to Storage, update profile + publicProfiles
- `removeProfilePicture()` — delete from Storage, clear from profile + publicProfiles
- Critical profile doc errors propagate; secondary writes are fire-and-forget

**Optimized Reminder Service** (`src/services/optimizedReminderService.ts`)
- `getOptimizedTimes()` — queries 7 days of HealthKit sleep, averages wake time, derives reminder offsets
- `applyOptimizedSchedule(type)` — schedules notification + updates profile prefs

**Notification Scheduling** (`src/services/notificationService.ts`)
- Added `scheduleWorkoutReminder` / `cancelWorkoutReminder`
- Added `scheduleDoseReminderDaily` / `cancelDoseReminderDaily`

**Weight → Body Stats Sync** (`src/services/bodyWeightService.ts`)
- Logging today's weight now fire-and-forget syncs `weightKg` to profile body stats

**Types** (`src/types/profile.ts`)
- Added `profilePictureUrl`, `bio`, `username` to UserProfile
- Extended `notificationPrefs` with hour/minute/optimized fields for dose + workout reminders

**Firestore Rules** (`firestore.rules`)
- Added `publicProfiles/{uid}` rules: authenticated read, owner-only write

**Tests:** 33 tests across 3 files (profilePictureService: 11, optimizedReminderService: 10, notificationServiceReminders: 12)

### Architecture decisions
- Profile picture stored at `users/{uid}/profilePicture/avatar.jpg` in Firebase Storage
- Image compressed to 400px width via expo-image-manipulator before upload
- Bio stored in private profile doc only (not mirrored to publicProfiles)
- Optimized reminders re-derive times from HealthKit on each toggle (adapts to changing sleep patterns)
- Weight sync only fires for today's date to prevent historical corrections overwriting current weight
- `@react-native-community/datetimepicker` installed for native time picker UI

### Ray follow-ups (tracked, not blockers)
1. No server-side bio length validation in Firestore rules (client enforces 160 char max)
2. PII denylist in analytics could add `bio` and `profilePictureUrl` as defense-in-depth
3. No accessibility labels on avatar, bio edit, and time picker interactive elements
4. Optimized reminder tests only cover fallback path — HealthKit computation logic untested
5. `uploadProfilePicture` does not validate MIME type or file size before upload

---

## Progress Charts — Fill All Gaps

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle, Build: 2 cycles — 7 fixes applied)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

6 progress/trend charts filling all data visualization gaps:

**1. Body Weight Sparkline** — widened from 14→30 entries (`BodyWeightCard.tsx`)
**2. Recovery Score Extended** — selectable 1W/1M/3M/6M/ALL time ranges (was fixed 7-day)
**3. Nutrition Macro Trends** — calories area chart + macros grouped bars on new `nutrition/progress.tsx`
**4. Peptide Dose Frequency** — doses-per-day bar chart on new `peptides/progress.tsx`
**5. XP Growth Curve** — cumulative area chart added to `xp-hub.tsx`
**6. Consistency Trend** — weekly % with green/orange/red zones on new `consistency-detail.tsx`

### Files (25 total: 12 new, 13 modified)

New hooks: `useRecoveryProgress`, `useNutritionProgress`, `usePeptideProgress`, `useXPProgress`, `useConsistencyProgress`
New charts: `MacroTrendChart`, `DoseFrequencyChart`, `XPGrowthChart`, `ConsistencyTrendChart`
New screens: `nutrition/progress`, `peptides/progress`, `dashboard/consistency-detail`
Modified: `BodyWeightCard`, `RecoveryTrendChart`, `recovery-detail`, `xp-hub`, `ConsistencyCard`, `nutritionService`, `gamificationService`, `firestore`, `analytics`, 3 layouts, 2 index screens

### Ray fixes applied
B1: null timestamp guard in usePeptideProgress, B3: useMemo for derived values, N1: yMax floor, N2: unused import, N3: timezone anchor, N4: Colors.gold spinner, N5: retry buttons

---

## Body Hub Dashboard Upgrade — Hero Card + Muscular SVG Model

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle conditional, Build: 2 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Dashboard Integration**
- Promoted Body Hub from a buried list item at bottom of dashboard to a first-class hero card in the configurable card feed
- `BodyHubHeroCard` (previously built, never wired) now renders at position 2 (after Recovery score)
- Layer tab strip (Muscles / Inject / Measure / Cardio), stat chips, and BodyHubSVG all visible inline without tapping
- Tapping card navigates to full Body Hub detail screen with front/back toggle
- Hero card is front-view only — hooks supply front-view data, full toggle on detail screen

**Dashboard Wiring**
- `src/types/dashboard.ts` — Added `'bodyHub'` and `'gamification'` to `DashboardCardId` union + default order
- `src/hooks/useDashboard.ts` — Migration block inserts `'bodyHub'` after `'recovery'` for existing users
- `app/(tabs)/dashboard/index.tsx` — Imported `BodyHubHeroCard` + 3 deferred hooks (`useBodyHubMuscles`, `useBodyHubInjections`, `useBodyHubCardio`), gated on `!loading && !hiddenCards.includes('bodyHub')`; removed old Body Hub list item

**Muscularly Defined SVG Body Model**
- `src/constants/bodyHubPaths.ts` — Replaced all 4 outline paths (male front/back, female front/back) with anatomically detailed versions showing muscle contours (deltoid bumps, serratus notches, V-taper, quad sweep, calf diamond). Added `DetailLine` type and `MUSCLE_DETAIL_LINES` array (63 total lines: male front 23, male back 15, female front 14, female back 11) — sternum split, pec borders, ab grid, serratus fingers, oblique V-cuts, bicep separation, quad teardrops, trap diamond, spine, lat borders, tricep horseshoe, gluteal folds, hamstring midlines, rhomboid lines
- `src/components/bodyHub/BodyHubSVG.tsx` — New `<G opacity={0.2}>` layer between outline and region fills renders detail lines as subtle strokes (strokeWidth=0.6, dark/light mode aware)
- Male: pronounced muscular definition. Female: toned athletic definition
- Sex-specific rendering via `userProfile?.sex` from onboarding

**BodyHubHeroCard Cleanup**
- `src/components/dashboard/BodyHubHeroCard.tsx` — Removed front/back toggle (hero card is front-only preview), cleaned up unused styles and dead code

### Architecture decisions
- Hero card hooks hardcoded to `view='front'` — avoids supplying both-view data when only front is displayed
- Hooks deferred with `!loading` gate — prevents Firestore reads from racing with primary dashboard data fetch
- Same ViewBox (300x600), same region IDs, same `getBodyPaths(sex)` API — zero breaking changes to existing body hub functionality
- Detail lines rendered below region fills for layered depth effect

### Ray review notes (tracked, non-blocking)
1. `useBodyHubCardio` uses `useFocusEffect` (not `useEffect`) — won't fire until next focus if `enabled` flips mid-session
2. Migration ordering may produce slightly different card sequence than DEFAULT_CARD_ORDER for users missing multiple cards simultaneously
3. Detail line filter/map could be memoized with `useMemo` (63 items, negligible perf impact)
4. `'gamification'` added to union type but not in DEFAULT_CARD_ORDER (pre-existing issue)
5. `muscleRecovery` passed as null — no aggregate recovery score source yet

---

## Navigation Wiring Fix — Orphaned Screen Registration

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle conditional, Build: 1 cycle)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Dashboard Layout Registration** (`app/(tabs)/dashboard/_layout.tsx`)
- Registered 16 previously orphaned screens: `body-hub`, `social`, `friends`, `friend-profile`, `friend-search`, `crews`, `crew-detail`, `create-crew`, `join-crew`, `leaderboards`, `challenges`, `challenge-detail`, `create-duel`, `duel-detail`, `xp-hub`, `trophy-case`

**Profile Layout Registration** (`app/(tabs)/profile/_layout.tsx`)
- Registered 3 previously orphaned screens: `choose-username`, `compare-privacy`, `my-templates`

**Dashboard Entry Points** (`app/(tabs)/dashboard/index.tsx`)
- Added Social Hub card (purple, `people-circle-outline` icon) → navigates to social hub
- Added Challenges card (amber, `trophy-outline` icon) → navigates to challenges screen
- Both cards placed between Body Hub and Community Library, using identical card style pattern

### Architecture decisions
- No new components, styles, or files — purely wiring existing screens into navigation
- Card ordering: Body Hub → Social Hub → Challenges → Community Library (body-first, then social, competitive, browse)
- `join-crew` registered but has no inbound navigation (crews.tsx handles joining inline) — registered for future use

### Notes
- `animation: 'slide_from_right'` added to dashboard Stack screenOptions for consistent transitions
- 36 pre-existing tsc errors in unrelated files remain unchanged

---

## Exercise Demonstration GIFs — Animated Exercise Previews

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle conditional, Build: 3 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

Animated exercise demonstration GIFs from ExerciseDB/azilRababe dataset (MIT license) — static thumbnails in exercise list, autoplay GIF on exercise detail view.

**Data source** (`src/data/exerciseMediaMap.ts`)
- Static Record mapping 129 of 137 exercises to fitnessprogramer.com GIF URLs
- 123 unique GIF URLs, all verified HTTP 200
- 8 exercises unmapped (no match in dataset): tibialis raise, man maker, sled push, cable kickback (glute), JM press, spider curl, single-leg glute bridge — graceful fallback to barbell icon

**Service** (`src/services/exerciseMediaService.ts`)
- Pure synchronous `getExerciseMedia(id)` lookup, returns `{ gifUrl, thumbnailUrl } | null`

**Components**
- `src/components/training/ExerciseThumbnail.tsx` — expo-image with `autoplay={false}`, `cachePolicy="disk"`, `recyclingKey` for FlatList performance, barbell-outline fallback icon
- `src/components/training/ExerciseGifPlayer.tsx` — expo-image with `autoplay={true}`, loading spinner, "No demo available" fallback

**Screen integrations**
- `app/(tabs)/training/exercises.tsx` — ExerciseThumbnail on left side of each ExerciseCard
- `app/(tabs)/training/exercise-detail.tsx` — ExerciseGifPlayer below exercise name, above category badge

**Tests** (`src/__tests__/exerciseMediaService.test.ts`)
- 22 tests: happy path, null fallbacks, URL validation, bulk coverage of all 129 mapped IDs, pinned URL assertions

### Architecture decisions
- Exercise type NOT modified — media resolved externally by ID via service
- expo-image for native GIF caching (installed via npx expo install for SDK 54 compat)
- Static first-frame thumbnails in FlatList (autoplay=false) to avoid memory pressure
- GIFs hosted on fitnessprogramer.com (MIT-licensed dataset) — not bundled in app
- imageBackgroundColor prop on both components for theme flexibility

### Ray follow-ups (tracked, not blockers)
1. Hotlink risk — fitnessprogramer.com could block direct linking. Fallback: self-host on Firebase Storage (MIT license permits redistribution)
2. No getItemLayout on FlatList for thumbnail performance optimization
3. 8 unmapped exercises could be addressed with custom GIFs or alternative sources

---

## Compare Feature — Integration & Polish Pass

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle conditional, Build: 2 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Empty States & Navigation Edge Cases**
- New user with no data: friendly empty state with barbell icon and guidance to log activities
- No overlapping modules: info banner explaining why only cross-module stats are shown
- Self-compare guard: fun "You vs You? You always win!" screen with trophy icon (new `status: 'self'` in CompareState union)
- Logout navigation: useEffect watches auth state, safely navigates to dashboard on logout
- Deep link: TODO comment placed for v2 deep link validation

**Performance**
- `RadarChart` wrapped with `React.memo` to prevent scroll-triggered re-renders
- Module sections lazy-loaded via `InteractionManager.runAfterInteractions` with placeholder (VS header + radar render first)
- In-memory session cache in `compareDataService.ts`: Map-based, 50-entry cap, 5-min TTL, oldest eviction, `clearCompareCache()` exported

**Animations**
- Stat rows: staggered fade-in via `animDelay` prop (100ms between rows, 300ms duration)
- Winner pulse: scale 1.0→1.05→1.0, 3 iterations then stops (not infinite)
- Share button: spring scale animation on press (0.95 in, 1.0 out)

**Accessibility**
- RadarChart: `accessibilityRole="image"`, dynamic label listing all axes with scores
- CompareStatRow: screen reader labels "Stat: You X, Opponent Y. You/Opponent wins."
- ShareCardGenerator: `accessibilityRole="image"`, descriptive label
- All touch targets: `minHeight: 48` on buttons

### Files modified
- `src/types/compare.ts` — added `{ status: 'self' }` to CompareState union
- `src/services/compareDataService.ts` — session cache + `OWN_SCORES_MISSING` structured error code
- `src/components/compare/RadarChart.tsx` — React.memo + accessibility
- `src/components/compare/CompareStatRow.tsx` — fade animation, pulse, a11y labels, touch targets
- `src/components/compare/ShareCardGenerator.tsx` — accessibility
- `app/(tabs)/dashboard/compare.tsx` — empty states, self-compare, logout nav, lazy load, animations, touch targets
- `app/(tabs)/dashboard/share-preview.tsx` — touch targets

### Tests
- `src/__tests__/comparePolish.test.ts` — 13 tests (cache TTL/eviction/clear, buildA11yLabel win/lose/tie, buildRadarA11yLabel empty/normal, OWN_SCORES_MISSING pinning)
- `src/__tests__/compareDataService.test.ts` — updated with clearCompareCache() in beforeEach

### Architecture decisions
- `{ status: 'self' }` added to CompareState discriminated union — type-safe, no magic strings
- `OWN_SCORES_MISSING` exported constant prefix in error messages — avoids fragile string matching
- Cache uses Map insertion order for eviction (FIFO, not LRU) — acceptable for 50-entry cap with 5-min TTL
- Winner pulse limited to 3 iterations — avoids battery drain on low-end devices
- InteractionManager deferred sections have minHeight:300 placeholder — prevents layout jump

### Ray follow-ups (tracked, non-blocking)
1. Cache eviction is FIFO not LRU — hit entries are not re-inserted (add TODO)
2. `_cache` exported for tests exposes internals — consider test-only helpers in future
3. `withTimeout` promise pattern has minor cleanup concern — consider AbortController in v2
4. Cross-Module section outside lazy guard means statIndex stagger may feel inconsistent
5. `opponentId` undefined tracking as empty string in analytics — minor

---

## Route Segment Competition

**Status:** ✅ Ray-approved (Plan: 2 cycles, Build: 3 cycles — 5 blocking fixes applied)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What's been built

#### Types
- `src/types/segments.ts` — `RouteSegment`, `SegmentEffort`, `SegmentMatch`, `LiveSegmentState`, `SegmentFilter`, `CreateSegmentInput`, `SegmentActivityType`, `SegmentPoint`

#### Pure Utilities
- `src/utils/routeDownsample.ts` — Iterative Ramer-Douglas-Peucker downsampling, `downsampleRoute(points, maxPoints=500)` with auto-tuning epsilon. Stack-based to avoid call-stack overflow on long routes.
- `src/utils/segmentMatcher.ts` — `haversineDistance`, `matchSessionToSegments` (50m start/end + 90% of points within 30m), `isEnteringSegment` (live detection), `isExitingSegment`

#### Service Layer
- `src/services/segmentService.ts` — Full CRUD via `communityFirestore.ts` helpers: `createSegment`, `deleteSegment`, `getSegmentById`, `getAccessibleSegments` (batched in chunks of 10 for Firestore `in` limit), `getNearbySegments` (bounding box query), `submitEffort` (runTransaction for atomicity, PR-only overwrites), `getSegmentLeaderboard`. Sentry breadcrumbs, ServiceResult<T> pattern, best-effort silent failures.

#### Hooks
- `src/hooks/useSegments.ts` — Fetches accessible segments (own + friends' + crew), loading/error/refresh
- `src/hooks/useLiveSegment.ts` — Pre-fetches nearby segments into useRef on mount (no Firestore reads during GPS loop), in-memory proximity detection, LiveSegmentState machine (idle → approaching → active → completed), dismissTimerRef with unmount cleanup

#### Components
- `src/components/cardio/LiveSegmentBanner.tsx` — HUD overlay banner with fade animation, live +/- time comparison vs PR, completion toast. Uses useTheme() for text colors, documented HUD exception for dark overlay background.
- `src/components/cardio/SegmentCard.tsx` — Segment list card with non-interactive MapView + Polyline, leader info, user's best time
- `src/components/cardio/SegmentLeaderboard.tsx` — Ranked list with crown for #1, user highlight, filter pills (All-Time / This Month / Friends Only / Crew), client-side filtering
- `src/components/cardio/SegmentCreator.tsx` — Bottom sheet modal: name input, public/private toggle, map preview, route downsampling on create
- `src/components/cardio/SegmentMatchCard.tsx` — Post-session matched segments card with PR badges

#### Screens
- `app/(tabs)/cardio/segments.tsx` — Segments list with FlatList, pull-to-refresh, empty state
- `app/(tabs)/cardio/segment-detail.tsx` — Full map with route overlay + SegmentLeaderboard + segment stats

#### Integration
- `app/(tabs)/cardio/_layout.tsx` — Registered `segments` and `segment-detail` screens
- `app/(tabs)/cardio/index.tsx` — Segments entry card on cardio home
- `app/(tabs)/cardio/session-detail.tsx` — "Save as Segment" button for outdoor GPS sessions, opens SegmentCreator
- `app/(tabs)/cardio/active-session.tsx` — useLiveSegment + LiveSegmentBanner integration
- `app/(tabs)/cardio/settings.tsx` — "Live Segment Detection" toggle
- `src/types/cardio.ts` — Added `liveSegmentsEnabled?: boolean` to CardioSettings

#### Firestore Rules & Analytics
- `firestore.rules` — `/segments/{segmentId}` (authenticated read, creator write, 20-segment cap via segmentCount, visibility enum validation, route size ≤ 500) + `/segments/{segmentId}/efforts/{uid}` (auth.uid == uid, PR-only updates, field whitelist via hasOnly, durationSeconds positive int). Split update rule allows non-creator bestEffort field writes.
- `src/services/analytics.ts` — 8 new events: SEGMENT_CREATED, SEGMENT_DELETED, SEGMENT_MATCHED, SEGMENT_PR, SEGMENT_LEADERBOARD_VIEWED, SEGMENTS_LIST_VIEWED, LIVE_SEGMENT_ENTERED, LIVE_SEGMENT_COMPLETED

#### Tests
- `src/__tests__/segmentMatcher.test.ts` — 27 tests (haversine, route matching, live detection)
- `src/__tests__/routeDownsample.test.ts` — 17 tests (RDP algorithm, edge cases)

### Architecture decisions
- **Top-level `/segments` collection** — cross-user competitive data, same pattern as `/templates`
- **Effort doc ID = user UID** — deterministic, one-per-user-per-segment, no query+delete race
- **runTransaction for effort + course record** — eliminates TOCTOU race on concurrent PR submissions
- **RDP downsampling to ≤500 points** — enforced in Firestore rules via `route.size() <= 500`, prevents 1 MiB doc limit
- **communityFirestore.ts** for all reads/writes (raw SDK only for transactions, documented)
- **Live detection fully in-memory** — segments pre-fetched to useRef on mount, zero Firestore reads during GPS loop
- **Segment matching triggered from session-summary** — not injected into useCardioSession.stop() to protect the critical save path
- **20-segment cap** enforced in Firestore rules via `get()` on user doc's segmentCount with null fallback

### Ray Review Fixes Applied

**Plan review (Cycle 1 → 2):**
- B1-B7: Firestore rules added, effort doc ID = UID, cap enforced server-side, RDP downsampling, communityFirestore usage, matching moved to session-summary, live detection pre-fetched

**Code review — Core (Cycle 1 → 2):**
1. ✅ submitEffort refactored to use communityFirestore helpers (raw SDK only for transaction)
2. ✅ Firestore update rule split: non-creator bestEffort writes via affectedKeys().hasOnly()
3. ✅ submitEffort wrapped in runTransaction for atomicity

**Code review — UI (Cycle 2 → 3):**
4. ✅ LiveSegmentBanner: useTheme() added for text, HUD dark overlay documented, magic strings extracted to constants
5. ✅ useLiveSegment: dismissTimerRef added, cleanup on unmount, clear-before-set guard

**Advisory (tracked, non-blocking):**
- N1: Boolean expression in useLiveSegment dependency array (eslint-disable present)
- N2: SegmentLeaderboard Date.now() on every render — consider useMemo
- N3: segment-detail MapView is interactive (intentional — detail view allows zoom)
- N4: segment-detail Marker pinColor hardcoded green
- N5: SegmentCreator handleCreate lacks outer try/catch (service catches internally)
- W1: durationSeconds is int vs JS float fragility
- W2: displayName not in PII denylist
- W3: Private segments excluded from nearby query (intentional)
- W4: No segmentService test file — add with Firestore mocks

**Targeted checklist (2026-03-24) — 8/8 PASS:**
1. ✅ Segment matching handles GPS drift (30m proximity threshold covers 5-15m drift)
2. ✅ No false-positive on perpendicular crossings (90% coverage check on segment points vs session track)
3. ✅ Leaderboard ranks correctly, crown on #1 (ascending durationSeconds query)
4. ✅ Live indicator only on known segment start (proximity to startPoint only, not mid-segment)
5. ✅ Leaderboard updates after effort (mount-based fetch on navigation)
6. ✅ Friend/crew filter works (client-side filter, includes user's own time, handles empty friends)
7. ✅ GPS coordinates saved correctly (from session route, RDP preserves start/end)
8. ✅ All outdoor types covered (run/walk/cycle — `hike` doesn't exist in PepMax ActivityType; swim is indoor)

**Tracked concerns from checklist (non-blocking):**
- Matching uses naive point-to-point distance, not closest-point-on-line — could miss valid matches on sparse curvy routes
- Live detection lacks directional/heading validation — proximity to start alone triggers banner (post-hoc matching still validates for effort submission)
- No real-time leaderboard listener (onSnapshot) — mount-based fetch only

### Firestore schema
```
/segments/{segmentId}                    → RouteSegment (name, creator, route[], distance, visibility, bestEffort*)
/segments/{segmentId}/efforts/{uid}      → SegmentEffort (time, pace, sessionId, attemptedAt)
/users/{uid}.segmentCount                → integer (creation cap enforcement)
```

---

## Shareable Comparison Card

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle, Build: 2 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Types**
- `src/types/shareCard.ts` — Added `CompareCardData` type (myName, opponentName, avatars, scores, visibleModules, units) to the `ShareCardData` discriminated union

**Pure Utilities**
- `src/utils/shareCardStats.ts` — `STAT_DEFINITIONS` (7 modules, 11 stat fields with format functions and winner direction), `getStatDefinitions(units)` (unit-aware factory), `buildVisibleStats(myScores, opponentScores, visibleModules, units)` (bilateral -1 sentinel + undefined guard + module toggle filtering)

**Components**
- `src/components/compare/ShareCardGenerator.tsx` — 360×640 off-screen card (captured at 3x = 1080×1920 Instagram Story ratio). Dark background (#1F2937), "pepmax.app" header in purple (#7C3AED), VS row with initial-based avatars, RadarChart at 280px, stat highlight rows (winner in accent, loser gray), footer tagline. Re-exports pure helpers from shareCardStats.

**Screen**
- `app/(tabs)/dashboard/share-preview.tsx` — Preview + customize screen. Route params: myName, opponentName, opponentAvatar, myScoresJson, opponentScoresJson, units. Scaled-down card preview (55%), module toggle switches (peptides defaults OFF), Share button (purple) + Cancel button (gray). ViewShot off-screen capture → captureAndShare from cardGenerator.ts. Double-tap guard, loading indicator, navigate back on success.

**Wiring**
- `app/(tabs)/dashboard/compare.tsx` — Replaced "Coming Soon" alert with router.push to share-preview, passing serialized compare data + units
- `app/(tabs)/dashboard/_layout.tsx` — Registered `share-preview` Stack.Screen
- `src/services/analytics.ts` — Added `COMPARE_CARD_SHARED`, `COMPARE_CARD_CUSTOMIZED` events
- `src/services/cardGenerator.ts` — Dynamic `dialogTitle` based on card type ('compare' → 'Share comparison')

**Tests**
- `src/__tests__/shareCardGenerator.test.ts` — 18 tests covering bilateral visibility, module toggle filtering, winner/loser color assignment, tie handling, empty/undefined scores edge cases

### Architecture decisions
- **No new shareService.ts** — reuses existing `captureAndShare()` from `cardGenerator.ts`
- **No new packages** — `react-native-view-shot` and `expo-sharing` already installed
- **Pure helpers in utils** — `shareCardStats.ts` has no React Native imports, enabling Jest testing without native module mocks
- **SENTINEL_SCORES fallback** — malformed JSON route params produce a full -1 sentinel object, not `{}`, preventing undefined values from passing visibility checks
- **Peptides default OFF** — share card toggles default all modules ON except peptides, matching the sensitive-data policy in ComparePrivacy
- **Units threaded end-to-end** — compare.tsx → route params → share-preview → cardData → ShareCardGenerator → buildVisibleStats → format functions

### Ray Review Fixes Applied

**Cycle 1 — Conditional Approval (2 blockers + 4 non-blocking):**
1. ✅ Peptides toggle defaults OFF (`mod !== 'peptides'`)
2. ✅ SENTINEL_SCORES constant (13 numeric fields = -1) replaces `{} as CompareScores` fallback; `buildVisibleStats` adds `undefined` guard
3. ✅ Stale "stub" comment removed from compare.tsx
4. ✅ Units param added: `getStatDefinitions(units)` factory, threaded from compare.tsx through to format functions
5. ✅ Two tests added for empty/undefined scores path
6. ✅ Tie test updated to use actual STAT_DEFINITIONS entries

### Follow-up items (tracked)
- No component-level screen test for share-preview.tsx (pure logic tested via shareCardStats)
- Imperial/metric default inconsistency: compare.tsx defaults to 'imperial' (US users), rest of pipeline defaults to 'metric' — intentional but worth documenting

---

## Compare Screen

**Status:** ✅ Ray-approved (conditional → all 3 fixes applied 2026-03-24)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What's been built

**Types & Data Layer**
- `src/types/compare.ts` — Added `TopLift`, `CompareData`, `CompareState` discriminated union; added v2 optional fields to `CompareScores` (`top3Lifts?`, `strengthTrend30d?`, `workoutConsistency?`, `weeklyCardioSessions?`, `cardioTrend30d?`, `avgDailyProtein?`, `macroTargetHitRate?`, `loggingConsistency?`, `cycleAdherence?`, `protocolConsistency?`, `badgesEarned?`). Fixed path comment (was `users/{uid}/stats/compareScores`, now `userStats/{uid}/compareScores/current`).
- `src/services/compareDataService.ts` — Orchestration layer: `fetchCompareData(opponentUid)` delegates to existing `compareService.ts` (no raw Firestore calls). Parallel fetch with 10s timeout via `Promise.race` (timer cleared on resolve). Privacy graceful degrade via inner try/catch.
- `src/utils/compareFormatters.ts` — Pure presentation utilities: `formatWeight`, `formatDistance`, `formatPace`, `formatTrend`, `formatStat`. Unit conversion constants `KG_TO_LB`, `KM_TO_MI`.

**UI Components**
- `src/components/compare/CompareStatRow.tsx` — Three-column row (40/20/40). Winner gets accent color, loser gray, tie default. Optional trend arrow.
- `src/components/compare/CompareModuleSection.tsx` — Section header with Ionicons icon + accent underline + children.

**Screen**
- `app/(tabs)/dashboard/compare.tsx` — Full compare screen with route params `{ opponentId, opponentName, opponentAvatar? }`. States: loading (skeleton with pulse), blocked, unavailable, error (retry), ready (VS header, RadarChart, module sections, share stub). Module visibility: bilateral check via -1 sentinels. `avgPace` uses `winnerLower`. Calories show no winner. Dark mode safe.
- `app/(tabs)/dashboard/_layout.tsx` — Registered `compare` screen.

**Firestore & Config**
- `firestore.rules` — Added `userStats/{uid}/compareScores/{doc}`: read if authenticated, write if false (CF uses Admin SDK).
- `src/services/firebase/firestore.ts` — Added `SETTINGS` and `USER_STATS` to `COLLECTIONS`.
- `src/services/analytics.ts` — Added `COMPARE_FETCH_FAILED` and `COMPARE_SHARE_TAPPED` events.

**Tests**
- `src/__tests__/compareDataService.test.ts` — 9 tests (happy path, blocked, unavailable, own scores null/error, privacy graceful degrade ×2, timeout, analytics on exception)
- `src/__tests__/compareFormatters.test.ts` — 25 tests (all formatters, constants, edge cases)

### Architecture decisions
- **No raw Firestore calls in compareDataService** — delegates entirely to `compareService.ts` for score reads and block checks
- **Privacy via sentinels** — opponent privacy NOT read (can't access `users/{opponentId}/`); CF already writes -1 for hidden modules
- **Unit conversion in presentation layer** — `compareFormatters.ts` is pure; data service returns raw metric values
- **CompareState discriminated union** — exhaustive switch in consumers: loading, ready, error, blocked, unavailable
- **Timer cleanup** — `withTimeout` clears setTimeout on resolve/reject to prevent orphan timers
- **Peptide safety** — client NEVER reads raw peptide subcollections; `cycleAdherence`/`protocolConsistency` computed by CF only

### Ray Review Fixes Applied

**Must-fix (all resolved):**
1. ✅ Timer leak in `withTimeout` — `clearTimeout(timer)` on both resolve and reject paths
2. ✅ `isPeptidesVisible` — changed from `>= 0` to `!== -1` for consistency with other visibility checks
3. ✅ Type comment path — fixed from `users/{uid}/stats/compareScores` to `userStats/{uid}/compareScores/current`

**Advisory (resolved):**
4. ✅ Skeleton hardcoded color — replaced `#E5E7EB` with `colors.surface` for dark mode support

**Advisory (tracked):**
5. `opponentId` not validated as UID format at screen level — validate via regex in a future pass
6. `as any` casts for timestamps in privacy fallback — consider using `Timestamp.now()`
7. No component-level screen tests — data service and formatters tested, screen smoke test deferred

### Follow-up items (tracked)
- Extend `computeCompareScores` Cloud Function to compute v2 fields (top3Lifts, strengthTrend30d, workoutConsistency, weeklyCardioSessions, cardioTrend30d, avgDailyProtein, macroTargetHitRate, loggingConsistency, cycleAdherence, protocolConsistency, badgesEarned)
- Wire Share button to share card generation (Prompt 5)
- Add component-level screen test

---

## Peptide Fasting Windows — Per-Compound Eating Restrictions

**Status:** ✅ Ray-approved (2026-03-24, Plan: 1 cycle conditional, Build: 2 cycles)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What was built

**Types** (`src/types/peptideFasting.ts`)
- `PeptideFastingWindow` — `preInjectionMinutes`, `postInjectionMinutes`, `notifyWhenWindowEnds`, `enabled`
- `ActivePeptideFastingWindow` — runtime computed: `peptideName`, `peptideId`, `windowStartsAt`, `windowEndsAt`, `doseTimestamp`
- `PEPTIDE_CATEGORY_FASTING_DEFAULTS` — GH Secretagogue: 90/90, GLP-1: 30/30, Healing/Other: 0/0 disabled

**Peptide type extension** (`src/types/peptide.ts`)
- Added optional `fastingWindow?: PeptideFastingWindow` to `Peptide` (backward compatible)

**Pure utilities** (`src/utils/peptideFasting.ts`)
- `clampPeptideFastingMinutes()` — enforces 0–480 min bounds
- `validatePeptideFastingWindow()` — checks enabled + positive durations
- `getDefaultPeptideFastingWindow(category)` — category-based sensible defaults
- `buildPeptideFastingGuidanceText()` — human-readable "No food X before / Y after" string
- `computeActivePeptideFastingWindows(doses, peptides)` — finds windows active right now
- `isPeptideFastingActive(timestamp, windows)` — boolean + conflicting windows
- `msUntilPeptideFastingWindowEnds()` — countdown for notification scheduling

**Hook** (`src/hooks/usePeptideFasting.ts`)
- Fetches doses from last 12h (cross-midnight safe — does NOT use getTodaysDoses)
- Computes active windows, auto-refreshes every 60 seconds
- Returns `activeWindows`, `isAnyWindowActive`, `loading`, `refresh()`

**Components**
- `src/components/peptides/FastingWindowBanner.tsx` — info card shown at dose-log time with pre/post durations
- `src/components/peptides/FastingWindowSettings.tsx` — stepper form (pre/post minutes from step list + notify toggle)

**Screen integrations**
- `app/(tabs)/peptides/log-dose.tsx` — shows FastingWindowBanner when selected peptide has fasting enabled; schedules eating-window notification after save
- `app/(tabs)/nutrition/add-food.tsx` — shows dismissible warning banner when any peptide fasting window is active

**Service changes**
- `src/services/peptideService.ts` — `addPeptide` applies category-based defaults when `fastingWindow` is undefined (covers both preset and manual adds)
- `src/services/notificationService.ts` — `schedulePeptideFastingWindowNotification` / `cancelPeptideFastingWindowNotification` with key namespace `pepmax:notif:peptidefasting:{peptideId}`

**Analytics** (`src/services/analytics.ts`)
- `PEPTIDE_FASTING_REMINDER_SET`, `PEPTIDE_FASTING_WARNING_SHOWN`

**Tests** (`src/__tests__/peptideFasting.test.ts`)
- 50 tests covering all 7 utility functions + defaults structure

### Architecture decisions
- "peptideFasting" prefix everywhere to avoid collision with existing IF fasting feature
- Notification key namespace `pepmax:notif:peptidefasting` distinct from IF fasting keys
- 12h dose lookback instead of calendar-day filtering handles cross-midnight windows
- Step list [0, 15, 30, 45, 60, 90, 120...480] for settings UX
- 60-second interval refresh in hook keeps activeWindows fresh
- Advisory-only food warning — never blocks user from logging food
- No new Firestore collections or security rules needed

### Ray follow-ups (tracked, not blockers)
1. Hook setLoading(true) fires every 60s — consider suppressing on interval refreshes
2. Peptides array reference stability on parent re-fetch
3. No server-side validation for fastingWindow fields (matches existing architecture)
4. Hook + notification scheduling paths not unit-tested
5. add-food.tsx fires getPeptides() on every visit — wasted read for non-peptide users
6. Consider PEPTIDE_FASTING_WARNING_DISMISSED analytics event

---

## Warm-Up Calculator + Plate Loading Visual

**Status:** ✅ Ray-approved (3 rounds — 5 code fixes + 3 checklist fixes applied)
**Date:** 2026-03-24
**Branch:** `feature/recovery-readiness-score`

### What's been built

#### Types
- `src/types/warmUp.ts` — `WarmUpSet`, `WarmUpResult`, `PlateSet`, `PlateResult`, `BarType` (derived from `Equipment` via `Extract`), `WeightUnit`, `GymSettings`

#### Pure Utilities
- `src/utils/warmUpCalculator.ts` — `computeWarmUpSets(workingWeight, barType, unit)`: 5-set warm-up protocol (empty bar x10, 40% x8, 55% x5, 70% x3, 80%+ x2), rounding to nearest 5 lbs / 2.5 kg, skip-if-below-bar-weight logic. Exports shared `BAR_WEIGHTS` constant (Barbell=45/20, EZ Bar=25/11, Smith Machine=45/20). Handles Barbell, EZ Bar, Smith Machine, and Dumbbell equipment types.
- `src/utils/plateCalculator.ts` — `computePlates(totalWeight, unit)`: greedy largest-first plate breakdown per side. Imports `BAR_WEIGHTS` from warmUpCalculator (single source of truth). Returns `isExact` flag + `totalAchievable` for non-standard weights. Guard rails for NaN, negative, and sub-bar-weight inputs.

#### Components
- `src/components/training/WarmUpSets.tsx` — Tabular warm-up set display with tap-to-strikethrough, "Skip Warm-Up" button, gray/italic styling via `useTheme()`
- `src/components/training/PlateCalculator.tsx` — Horizontal barbell SVG diagram (react-native-svg) with color-coded plates per side (45=red, 35=blue, 25=green, 10=yellow, 5=white, 2.5=gray), text summary below, amber warning for non-exact weights

#### Hook
- `src/hooks/useGymSettings.ts` — AsyncStorage-backed toggles (`showWarmUp`, `showPlateCalculator`), functional updater pattern (no stale closures), try/catch with silent fallback to defaults on corrupt storage

#### Integration
- `app/(tabs)/training/active-session.tsx` — `getBarType()` type guard replaces unsafe cast; WarmUpSets renders above first working set for bar-based exercises when first set has weight > 0; PlateCalculator renders below weight input for barbell exercises

#### Tests
- `src/__tests__/warmUpCalculator.test.ts` — 35 tests (barbell/EZ bar/dumbbell/Smith Machine, metric/imperial, edge cases, below-bar-weight)
- `src/__tests__/plateCalculator.test.ts` — 28 tests (standard breakdowns, remainder handling, edge cases, unit variants)

### Architecture decisions
- **BAR_WEIGHTS single source of truth** — exported from `warmUpCalculator.ts`, imported by `plateCalculator.ts`; prevents drift
- **BarType = Extract<Equipment, ...>** — derived from canonical `Equipment` type; TypeScript catches drift automatically
- **Warm-up sets are local UI state only** — not persisted to Firestore or `SessionExercise.sets`; display-only guidance
- **Working weight from first set** — `exercise.sets[0].weight` drives both warm-up and plate calculations dynamically
- **Functional updater in useGymSettings** — eliminates stale closure risk on rapid toggles

### Ray Review Fixes Applied

**Cycle 1 — Conditional Approval (5 mandatory):**
1. ✅ Duplicated `BAR_WEIGHTS` extracted to single export in `warmUpCalculator.ts`
2. ✅ `useGymSettings` stale closure fixed with functional updater pattern
3. ✅ Redundant `isNaN` guard removed from `plateCalculator.ts`
4. ✅ `BarType` derived from `Equipment` via `Extract<>` instead of hand-written union
5. ✅ Unsafe `as BarType` cast replaced with `getBarType()` type guard in `active-session.tsx`

**Cycle 3 — Targeted Checklist Fixes (3 mandatory):**
6. ✅ Rounding increments fixed: 2.5 lbs / 1 kg → 5 lbs / 2.5 kg (matches standard gym plate loading)
7. ✅ SVG overflow fixed: dynamic plate width scaling via `effectivePlateWidth()` — compresses plates proportionally for heavy loads, 4px minimum
8. ✅ Integration into `active-session.tsx` verified — WarmUpSets + PlateCalculator + useGymSettings all imported and conditionally rendered

**Advisory (tracked, non-blocking):**
- No tests for `useGymSettings` hook — add with AsyncStorage mock
- `WeightUnit` may duplicate existing type — consolidate if found

---

## Safety Beacon — Cardio Live Location Sharing

**Status:** ✅ Ray-approved (conditional — mandatory follow-up applied 2026-03-23)
**Date:** 2026-03-23
**Branch:** `feature/recovery-readiness-score`

### What's been built

**Client — Types & Service Layer**
- `src/types/beacon.ts` — `SafetyContact`, `SafetyContactInput`, `BeaconLocation`, `ActiveBeacon`, `ActiveBeaconInput` (uid omitted — always set by service)
- `src/services/beaconService.ts` — Safety contact CRUD + `createActiveBeacon` / `updateBeaconLocation` / `deactivateBeacon` + `triggerBeaconSms` Cloud Function callable
- `src/services/analytics.ts` — 4 new events: `BEACON_ACTIVATED`, `BEACON_DEACTIVATED`, `BEACON_CONTACT_ADDED`, `BEACON_CONTACT_REMOVED`

**Client — Hooks**
- `src/hooks/useSafetyContacts.ts` — Fetch/add/remove contacts, E.164 validation, max-3 enforcement
- `src/hooks/useBeaconSession.ts` — Session-scoped lifecycle: `activate` → 15s throttled `updateLocation` → `deactivate`

**Client — UI Components**
- `src/components/cardio/SafetyContactsManager.tsx` — Contact list + inline add form + delete; masked phone display
- `src/components/cardio/BeaconToggle.tsx` — Toggle (outdoor sessions only, requires ≥1 contact)
- `src/components/cardio/BeaconIndicator.tsx` — Green "Beacon Active" pill on active-session screen

**Client — Screen Integration**
- `app/(tabs)/cardio/settings.tsx` — "SAFETY BEACON" section with `SafetyContactsManager`
- `app/(tabs)/cardio/start-session.tsx` — `BeaconToggle` + contacts serialized as JSON router param (eliminates race condition)
- `app/(tabs)/cardio/active-session.tsx` — Beacon activate/update/deactivate wired to GPS lifecycle

**Firestore**
- `firestore.rules` — `activeBeacons/{tokenId}`: owner-write only; `allow read: if false` (Admin SDK bypasses)
- `src/services/firebase/firestore.ts` — Added `SAFETY_CONTACTS` collection key
- `src/services/firebase/index.ts` — Added `getFunctions` + `functions` export

**Cloud Functions**
- `functions/src/sendBeaconSms.ts` — `onCall` v2; verifies `caller.uid === beacon.uid`; Twilio SMS to each contact; phone PII masked in logs
- `functions/src/beaconTrackingPage.ts` — `onRequest` v2; HTML + JSON endpoint; `escapeHtml` + `Number.isFinite` guards; 15s AJAX poll; "Workout completed" overlay
- `functions/src/cleanupBeacons.ts` — `onSchedule` daily; deletes beacons where `active === false && endedAt < 24h ago`
- `functions/src/index.ts` — Exports `sendBeaconSms`, `beaconTrackingPage`, `cleanupBeacons`
- `firebase.json` — Hosting rewrite `/beacon/**` → `beaconTrackingPage`
- `functions/package.json` — Added `twilio ^5.0.0`
- `functions/tsconfig.json` — Target/lib updated to `es2020`

### Architecture decisions
- `activeBeacons/{shareToken}` — token IS the doc ID; O(1) Cloud Function lookup, no query
- `uid` absent from `ActiveBeaconInput` — service is sole authority; prevents caller-supplied uid bypass
- Contacts serialized as JSON router param in `start-session` — synchronous parse in `active-session` via `useMemo`; eliminates async race condition
- GPS piggybacking via `useEffect([route.length])` — no changes to `useCardioSession.ts`
- 15s Firestore throttle lives in `useBeaconSession.updateLocation` via `lastUpdateRef`

### Ray Review Fixes Applied

**Blocking (all resolved):**
1. ✅ Dead code (`formatDuration`, `formatDistance`, `hasLocation`) removed from `beaconTrackingPage.ts`
2. ✅ Race condition eliminated — contacts passed via serialized router param, not async re-fetch
3. ✅ lat/lng JS injection fixed — `Number.isFinite()` validation with SF fallback coordinates
4. ✅ Phone PII masked in Cloud Function logs — `phone.slice(0, 3) + '•••' + phone.slice(-4)`
5. ✅ `uid: ''` code smell removed — `uid` deleted from `ActiveBeaconInput` type entirely

**Mandatory follow-up (resolved):**
6. ✅ `triggerCompletionSms` dead callable deleted from `beaconService.ts` — never wired; removed to prevent confusion and unintentional invocation

### Pre-deploy manual steps (required before public release)
```
[ ] cd functions && npm install
[ ] firebase functions:secrets:set TWILIO_ACCOUNT_SID
[ ] firebase functions:secrets:set TWILIO_AUTH_TOKEN
[ ] firebase functions:secrets:set TWILIO_PHONE_NUMBER
[ ] firebase functions:secrets:set GOOGLE_MAPS_API_KEY
[ ] firebase functions:secrets:set APP_BASE_URL
[ ] firebase deploy --only functions,hosting,firestore:rules
```

---

## Phase 8.3 — Apple Watch Gym Module

**Status:** ✅ Ray-approved (2026-03-23)
**Date:** 2026-03-23
**Branch:** `feature/recovery-readiness-score`

### What's been built

- `ios-native/PepMaxWatch Watch App/WatchDataModels.swift` — Added `WatchLoggedSet`, `WatchWorkoutExercise`, `WatchActiveWorkout` structs for live workout state
- `ios-native/PepMaxWatch Watch App/WatchWorkoutManager.swift` — New singleton `ObservableObject` state machine: `.idle`/`.exercising`/`.resting`/`.summary` phases; `startWorkout()`, `logSet()`, `skipRest()`, `skipExercise()`, `finishWorkout()`, `reset()`; internal rest timer (haptic at zero) + elapsed timer; sends `GYM_SET_LOGGED` per set and `GYM_WORKOUT_COMPLETE` on save via `WatchSessionManager.shared.sendMessageToPhone()`
- `ios-native/PepMaxWatch Watch App/Views/GymTabView.swift` — Full rewrite: `NavigationStack` + `navigationDestination(isPresented:)` for active workout; 4 states: awaiting sync / rest day (checkmark + weekly volume) / active-in-progress (Resume button) / scheduled workout (Start Workout button + exercise count); builds local `WatchActiveWorkout` from synced gym glance data as fallback
- `ios-native/PepMaxWatch Watch App/Views/ActiveWorkoutView.swift` — Set-by-set logging: exercise name (bold), "Set X of Y", Digital Crown weight (5 lb increments), +/- reps (44pt targets), "Log Set" button; `.sheet(isPresented:)` for rest timer; `navigationDestination(isPresented:)` for summary; `onChange(of: phase)` drives all navigation transitions
- `ios-native/PepMaxWatch Watch App/Views/RestTimerView.swift` — `Circle().trim` depleting ring + remaining seconds (large); next exercise preview; "Skip Rest" button (44pt); parent sheet dismissed via `phase → .exercising` `onChange`
- `ios-native/PepMaxWatch Watch App/Views/WorkoutSummaryView.swift` — Duration / volume / sets completed vs planned; "Save Workout" button calls `finishWorkout()` (sends `GYM_WORKOUT_COMPLETE` to phone) then `reset()` after 0.5s (triggers nav pop via `showActiveWorkout = false`)
- `ios-native/PepMaxWatch Watch App/PepMaxWatchApp.swift` — Added `WatchWorkoutManager.shared` as `@StateObject`; injected as `.environmentObject`; `onContextParsed` now handles `"ACTIVE_WORKOUT"` type → decodes with `millisecondsSince1970` → calls `workoutManager.startWorkout()` if idle
- `ios-native/PepMaxWatch Watch App/ContentView.swift` — Added `workoutManager` environment object, passed to `GymTabView`
- `ios-native/PepMaxWatch Watch App/WatchSessionManager.swift` — Added `"ACTIVE_WORKOUT"` to forwarding switch case
- `src/utils/watchSync.ts` — Added `pushActiveWorkoutToWatch(session)`: maps `SessionExercise[]` to watch format, calls `sendToWatch('WORKOUT_UPDATE', { type: 'ACTIVE_WORKOUT', ... })` fire-and-forget
- `src/types/watchConnectivity.ts` — Added `'GYM_SET_LOGGED'` and `'GYM_WORKOUT_COMPLETE'` to `WatchMessageType`
- `src/hooks/useWorkoutSession.ts` — Calls `pushActiveWorkoutToWatch(newSession)` after session created in `startSession()`
- `app/(tabs)/training/active-session.tsx` — Added `onWatchMessage` listener: `GYM_SET_LOGGED` → `completeSet()`; `GYM_WORKOUT_COMPLETE` → navigate to session-summary

### Architecture decisions

- **WatchWorkoutManager is a singleton** — consistent with `WatchStateManager` / `WatchSessionManager`; allows `PepMaxWatchApp.onContextParsed` callback to call `startWorkout()` without capturing a `@StateObject`
- **LocalFallback for watch-initiated workouts** — if ACTIVE_WORKOUT payload arrives before the watch tab is opened, `PepMaxWatchApp.onContextParsed` starts the workout. If the user taps "Start Workout" before the phone sends the payload, `GymTabView.startLocalWorkout()` builds a workout from the synced glance data with `sessionId: "local"` (phone will reconcile on `GYM_WORKOUT_COMPLETE`)
- **Sheet for rest timer** — cleaner than push navigation; naturally overlays; dismissed when `phase → .exercising`
- **Real-time channel (`sendToWatch`) for ACTIVE_WORKOUT** — `updateApplicationContext` (background) would overwrite the GYM glance data; `sendToWatch` (real-time) preserves both
- **Weight in lbs only (Phase 1)** — Digital Crown in 5 lb increments; unit support deferred to Phase 2

### Ray Review Fixes Applied

**Blocking (all resolved):**
1. ✅ `WorkoutSummaryView` — `@State private var isSaving = false` guard; "Save Workout" button disables + shows "Saving..." after first tap; prevents double-tap from sending duplicate `GYM_WORKOUT_COMPLETE` to phone
2. ✅ `active-session.tsx` GYM_SET_LOGGED handler — added `typeof` + bounds validation on `exerciseIndex`, `setIndex`, `weight`, `reps` before calling `completeSet()`; silently returns if watch/phone session arrays have diverged
3. ✅ `RestTimerView` — `nextExerciseName` now only shown when `isLastSet` is true; mid-exercise rest now shows "Next: Set X" instead of incorrectly showing next exercise name

**Non-blocking (all resolved):**
4. ✅ `WatchWorkoutManager` — `private init()` added; singleton enforced; previews that used `WatchWorkoutManager()` are unaffected (Swift allows `private init` to be called from within the class itself via `static let shared`)
5. ✅ Timer RunLoop mode — both `startRestTimer` and `startElapsedTimer` now use `Timer(timeInterval:repeats:)` + `RunLoop.main.add(timer, forMode: .common)` instead of `Timer.scheduledTimer`; timers fire during Digital Crown scroll events
6. ✅ `pushActiveWorkoutToWatch` — now accepts optional `templateTargetReps: number[]`; `startSession()` builds this array from `sourceExercises.map(te => parseInt(te.targetReps, 10) || 0)` while template data is in scope; watch now prefills correct target reps from the plan

---

## Community Protocol Templates

**Status:** ✅ Ray-approved (2026-03-23, conditional → all fixes confirmed)
**Date:** 2026-03-23
**Branch:** `feature/recovery-readiness-score`

### What's been built

**Phase 1 — Foundation**
- `src/types/communityTemplate.ts` — all community types: `CommunityTemplate`, `TemplateReview`, `TemplateReport`, `ImportedTemplate`, `ProtocolData` discriminated union, `PeptideCycleProtocol`, `WorkoutProtocol`, `NutritionProtocol`
- `src/utils/anonymousId.ts` — SHA-256 hashing of uid via `expo-crypto` with app salt
- `src/services/firebase/communityFirestore.ts` — top-level collection CRUD: `addGlobalDocument`, `getGlobalDocument`, `queryGlobalDocuments`, `updateGlobalDocument`, `addSubDocument`, `querySubDocuments`, `incrementField`
- `firestore.rules` — rules for `/templates`, `/templates/{id}/reviews`, `/reports`, `/bannedUsers`

**Phase 2 — Publish Flow**
- `src/services/communityTemplateService.ts` — full service: publish, query, import, review, report, aggregate recompute
- `src/components/community/PublishTemplateModal.tsx` — bottom-sheet: preview → title/desc/tags → disclaimer → publish
- `app/(tabs)/peptides/cycle-planner.tsx` — "Share as Community Template" button on Step 4 (Review)
- `app/(tabs)/training/templates.tsx` — share icon on each template card

**Phase 3 — Library Browser**
- `src/components/community/StarRating.tsx` — display + interactive star component
- `src/components/community/CategoryTabs.tsx` — horizontal chip filter
- `src/components/community/TemplateCard.tsx` — compact library card
- `src/hooks/useCommunityTemplates.ts` — paginated data hook with category/sort/search
- `app/(tabs)/dashboard/community.tsx` — library screen with search, filter, sort, infinite scroll
- `app/(tabs)/dashboard/_layout.tsx` — registered community + template-detail screens
- `app/(tabs)/dashboard/index.tsx` — Community Library entry card

**Phase 4 — Template Detail + Import + Reviews + Reports**
- `src/components/community/ProtocolView.tsx` — category-switched protocol renderer
- `src/components/community/ReviewCard.tsx` — review display
- `src/components/community/ReviewModal.tsx` — write review bottom sheet
- `src/components/community/ReportModal.tsx` — report bottom sheet
- `src/components/community/ImportConfirmModal.tsx` — import confirmation with rename
- `app/(tabs)/dashboard/template-detail.tsx` — full detail screen with sticky import button

**Phase 5 — Cloud Functions**
- `functions/src/index.ts` — entry point
- `functions/src/onReviewWrite.ts` — recompute averageRating/reviewCount on review write
- `functions/src/onReportCreate.ts` — auto-flag at 3+ reports
- `functions/package.json` + `tsconfig.json` — Functions project setup
- `firebase.json` — Functions + emulators config

**Phase 6 — Polish**
- `src/components/community/EmptyState.tsx` — reusable empty state
- `app/(tabs)/profile/my-templates.tsx` — My Published Templates screen
- `app/(tabs)/profile/_layout.tsx` — registered my-templates screen
- `app/(tabs)/profile/index.tsx` — My Templates SettingsRow
- `src/services/analytics.ts` — 5 new community events
- `src/services/firebase/firestore.ts` — added `IMPORTED_TEMPLATES` collection key

### Architecture decisions
- `/templates` is top-level (not under `users/{uid}/`) — first cross-user collection
- `anonymousId` = SHA-256(uid + APP_SALT) via expo-crypto — consistent, not reversible casually
- `communityFirestore.ts` is a separate module from `firestore.ts` — top-level vs user-scoped
- Client-side aggregate stopgap until Cloud Functions deployed (recomputeAverageRating)
- Import creates true deep copy via existing CRUD (no reference to community template)
- `importedTemplates` tracked under `users/{uid}/importedTemplates/` via existing addDocument

### Security flags

**Addressed (Ray CONDITIONAL APPROVAL — 2026-03-23)**
1. **Template update rule — known vandalism risk**: The `allow update` rule only prevents changing `anonymousAuthorId`. Any authenticated user can update any template's content (title, description, protocolData, status) by preserving the publicly-readable hash. Comment updated in `firestore.rules`. Server-side authorship enforcement requires Cloud Functions (Phase 5).
2. **Banned users could post reviews**: Fixed — added `!exists(bannedUsers/uid)` ban check to review `allow create` rule in `firestore.rules`.
3. **onReviewWrite NaN vulnerability**: Fixed — `onReviewWrite.ts` now validates `typeof r.rating === 'number' && isFinite(r.rating)` before summing.
4. **importTemplate unknown-category silent no-op**: Fixed — explicit `else` branch returns an error for unrecognized categories.

**Tracked known risks (post-MVP)**
5. **Duplicate import inflation**: No server-side check against re-importing the same template. Move enforcement to Cloud Function if abused.
6. **Client-side flagging race condition**: `reportTemplate()` has a read-after-write race — concurrent callers may fail to trigger auto-flag. Documented in code. Cloud Function `onReportCreate` (Phase 5) is the fix.
7. **`incrementField` field injection**: Helper takes arbitrary `field: string`. Currently only called with hardcoded names. Never pass user-controlled input to this helper. Documented in code.
8. One-review-per-user enforced client-side + Cloud Function only. Firestore rules can't check subcollection uniqueness.

---

## Recovery Readiness Score

**Status:** ✅ Ray-approved (2026-03-23)
**Date:** 2026-03-23
**Branch:** `feature/recovery-readiness-score`

### What's been built

#### Types & Pure Scoring Engine
- `src/types/recoveryScore.ts` — `RecoveryZone`, `RecoverySubScores`, `RecoverySubScoreWeights`, `RecoveryScoreResult`, `MorningCheckInInput`, `RecoveryScoreInputs`, `RecoveryScoreDoc`, `ScoreBreakdownEntry`
- `src/utils/recoveryScore.ts` — Pure scoring functions: `computeSleepSubScore` (7-9h=100, <6h=30, deep sleep bonus), `computeHrvSubScore` (vs 30-day avg, 70/30 HRV/RHR blend), `computeTrainingLoadSubScore` (acute:chronic ratio), `computeNutritionSubScore` (protein+calorie adherence), `computeSubjectiveSubScore` (1-5 → 0-100 + stress penalty), `redistributeWeights` (proportional scaling when sources unavailable), `calculateRecoveryScore` (main orchestrator), zone/label/color/multiplier helpers, `getRecommendations` (zone-specific + driver-specific)

#### Service Layer
- `src/services/recoveryScoreService.ts` — `computeAndSaveRecoveryScore(checkIn, profile)` orchestrates HealthKit + Firestore + nutrition + training data; `getTodayRecoveryScore()`; `getRecoveryScoreHistory(days)`. Includes HRV/RHR baseline bootstrap (30-day HealthKit history) and EMA update (alpha=0.1).
- `src/services/healthKitService.ts` — Added `fetchHRVHistory(days)` and `fetchRHRHistory(days)` for multi-day HealthKit queries
- `src/services/notificationService.ts` — Added `scheduleRecoveryReminder(hour, minute)` (daily CALENDAR trigger with deep-link data) and `cancelRecoveryReminder()`
- `src/services/analytics.ts` — 5 new events: `RECOVERY_SCORE_COMPUTED`, `RECOVERY_CHECK_IN_COMPLETED`, `RECOVERY_CHECK_IN_SKIPPED`, `RECOVERY_DETAIL_VIEWED`, `RECOVERY_REMINDER_CONFIGURED`
- `src/types/profile.ts` — Added `recoveryCheckIn?`, `recoveryCheckInHour?`, `recoveryCheckInMinute?` to `notificationPrefs`

#### Components
- `src/components/recovery/ScoreGauge.tsx` — Circular SVG arc (react-native-svg), zone-colored, center score text, label below
- `src/components/recovery/SubScoreBar.tsx` — Horizontal progress bar per sub-score, colored by quality (green >70, yellow 50-70, red <50)
- `src/components/recovery/RecoveryTrendChart.tsx` — 7-day Victory-native sparkline with area fill and touch tooltips
- `src/components/dashboard/RecoveryScoreCard.tsx` — Replaces old RecoveryCard. Three states: new score (gauge + zone + recommendation), legacy multiplier (backward compat), no score (CTA button)

#### Screens & Wiring
- `app/(tabs)/dashboard/morning-check-in.tsx` — Simplified check-in: 5 emoji feeling buttons (1-5) + optional stress pills (Low/Med/High) + optional notes. Auto-fetches HealthKit sleep, shows Apple Health badge. Submit → compute score → brief result display → navigate back.
- `app/(tabs)/dashboard/recovery-detail.tsx` — Full breakdown: large ScoreGauge, primary recommendation, 5 SubScoreBar components with weight percentages, full recommendations list, 7-day RecoveryTrendChart, Redo Check-In button.
- `app/(tabs)/dashboard/_layout.tsx` — Registered `morning-check-in` and `recovery-detail` screens
- `app/(tabs)/dashboard/index.tsx` — Swapped `RecoveryCard` → `RecoveryScoreCard`, removed `RecoveryCheckInModal` + auto-trigger useEffect, navigation to new screens
- `src/services/dashboardService.ts` — Switched from `getRecovery()` to `getTodayRecoveryScore()`
- `src/types/dashboard.ts` — Changed `recovery` field from `RecoveryInput` to `RecoveryScoreDoc`
- `app/_layout.tsx` — Added `Notifications.addNotificationResponseReceivedListener` for deep-link from recovery reminder → morning-check-in screen
- `app/(tabs)/profile/index.tsx` — Added "Recovery Check-In (7:00 AM)" toggle in Notifications section

### Architecture decisions
- **Evolves, not replaces**: Same `RECOVERY_LOG/{date}` Firestore collection. New fields added alongside old ones. `recoveryMultiplier` derived from score (0.5 + score/100) for Body Model backward compat.
- **Weight redistribution**: When data sources are unavailable (no HealthKit, no nutrition), weights are proportionally redistributed to remaining sources. Always computes a score if at least subjective input is available.
- **4-zone system**: green (80-100) "High Recovery", yellow (60-79) "Moderate", orange (40-59) "Below Baseline", red (0-39) "Low Recovery"
- **HRV/RHR baselines**: EMA (alpha=0.1) stored in recovery doc. Bootstrapped from 30-day HealthKit history on first use. Today's value as fallback if no history.
- **Training load reuse**: Imports `computeAcuteChronicRatio` from `bodyModelCalc.ts` — no duplication
- **Screen over modal**: Morning check-in is a navigable screen (not modal) for push notification deep-link support
- **Fire-and-forget Body Model**: `computeAndSaveBodyModel(date)` fires after score save, same pattern as old recovery service

### Ray Review Fixes Applied

**Blocking (all resolved):**
1. `validateCheckIn()` added to `recoveryScoreService.ts` — validates `feelingRating` (integer 1-5) and `stress` (integer 1-3 if present) at system boundary before any computation
2. `submittingRef` guard added to `morning-check-in.tsx` `handleSubmit` — prevents double-tap race condition; `navTimerRef` cleanup on unmount prevents state update on unmounted component
3. `getRecoveryScoreHistory` now filters `where('date', '>=', startDateKey)` — skips pre-upgrade docs that lack `recoveryScore`, ensures N valid days returned

**Non-blocking (resolved):**
4. Dead `useAuth` import removed from `recovery-detail.tsx`
5. `navTimerRef` cleanup on unmount added (fixed alongside #2)

**Non-blocking (tracked for next pass):**
6. `hkBadge` dark-mode hardcoded colors — same as M22 tracked observation
7. Legacy multiplier branch in RecoveryScoreCard not tappable — polish item
8. Nutrition sub-score "50/100" UX label when only one target is set — polish item

### Security considerations
- No new external API calls
- HealthKit read-only (no new write permissions)
- Firestore writes scoped to user's own RECOVERY_LOG
- Notification data payload contains only screen route name (no PII)
- Notes truncated to 500 chars (same as existing)

---

## "What If" Dose Simulator

**Status:** ✅ Ray-approved (conditional → all 3 blocking fixes applied)
**Date:** 2026-03-23
**Branch:** `feature/dose-simulator`

### What's been built

- `src/utils/pharmacokinetics.ts` — Pure utility: `generateProjectedDoses` (synthetic future doses from frequency), `computeCurveStats` (peak/trough/steady-state from decay curve), `computeVialDurationWeeks` (parses compound DB strings), `frequencyToIntervalHours`, `SimFrequency` type (extends `InjectionFrequency` with `'every2Weeks'`), frequency mappers (`mapSimFreqToPeptideFreq`, `mapPeptideFreqToSimFreq`), `computeSimWindowMs` (auto-extends for long half-lives)
- `src/hooks/useDoseSimulator.ts` — Data hook: fetches peptides + doses, generates baseline curve (actual doses) + simulated curve (projected doses) via `generateCompoundCurve()`, computes `ProtocolStats` for both, filters to peptides with `halfLifeHours > 0`, adaptive time window
- `src/components/peptides/DoseSimulatorChart.tsx` — Victory-native dual-curve chart: baseline (blue #2E86C1, solid) + simulated (orange #E8722A, dashed), vertical "now" marker, legend, VictoryVoronoi tooltips, empty/no-baseline states
- `src/components/peptides/ComparisonStatsTable.tsx` — Side-by-side stats table: peak level, trough level, steady-state time, weekly usage, doses/week, vial duration
- `app/(tabs)/peptides/dose-simulator.tsx` — Main screen: compound picker (dropdown), dose stepper (+/−), frequency pill buttons, Calendar date picker, chart, stats table, disclaimer, Apply/Discard buttons. Apply updates `Peptide` doc + matching active `Cycle` if exists
- `app/(tabs)/peptides/half-life-timeline.tsx` — Added "Simulate" pill button (flask icon) below chart, navigates to dose-simulator
- `app/(tabs)/peptides/_layout.tsx` — Registered `dose-simulator` route

### Architecture decisions

- Reuses existing `generateCompoundCurve()` from `halfLifeDecay.ts` for both curves — no duplication of pharmacokinetic math
- New `pharmacokinetics.ts` keeps simulator-specific math separate from the existing decay engine
- Adaptive time window: `max(30d, ceil(5 × halfLifeHours × 2 / 24)d)` ensures steady-state visible for semaglutide (168h → ~70d)
- Compound picker shows only user's saved peptides with `halfLifeHours > 0` (not full COMPOUND_DATABASE)
- Apply updates `Peptide.defaultDose` + `Peptide.frequency`; also updates matching active `Cycle` if one exists (non-critical failure)
- All simulation is client-side, in-memory — no Firestore writes until Apply confirmed
- `SimFrequency` extends `InjectionFrequency` with `'every2Weeks'` per prompt requirement

### Ray Review Fixes Applied

**Blocking (all resolved):**
1. ✅ `buildStats` now passes `compound.concentrationAfterRecon` as first arg (was passing `typicalVialSize` twice)
2. ✅ `computeVialDurationWeeks` normalizes both vial and weekly usage to mg — dead `vialMg` variable eliminated
3. ✅ `ComparisonStatsTable` header border uses `colors.border` via inline style — dark mode safe

**Non-blocking (tracked):**
4. `2xWeek` → `3xPerWeek` lossy frequency mapping — consider adding `2xPerWeek` to `Frequency` type before public release

---

## Injection Site Rotation Map

**Status:** ✅ Ray-approved (2 rounds — blocking animation fix + 3 import cleanups applied)
**Date:** 2026-03-23
**Branch:** `main`

### What's been built

- `src/utils/siteRotation.ts` — Pure utility: `BodyMapZone`, `SiteStats`, `computeSiteStats`, `suggestNextSite`, `getSiteStatus`, `getSiteColor`, `daysSince`, `BODY_MAP_ZONES` (10 zones → 8 InjectionSite values), `SITE_STATUS_COLORS`
- `src/components/peptides/BodyMapSVG.tsx` — SVG body outline (react-native-svg) with 10 tappable color-coded zones; front/back views; selected zone gets 2px Colors.peptide highlight
- `src/components/peptides/SiteDetailSheet.tsx` — Animated slide-up bottom sheet; shows site name, status badge, last used date + days, total injection count, "Select This Site" button
- `src/components/peptides/InjectionSiteMap.tsx` — Full modal: suggestion banner, front/back toggle pill, BodyMapSVG, SiteDetailSheet; loads dose history via getDoses() on each open
- `src/components/peptides/SiteRotationThumbnail.tsx` — Small (68×100) front-only body mini-map with color-coded dots; loads its own stats on mount
- `app/(tabs)/peptides/log-dose.tsx` — Site grid replaced with "Select Injection Site" button (body-outline icon + label); opens InjectionSiteMap modal; site state type unchanged
- `app/(tabs)/peptides/index.tsx` — "Site Map" quick-action button added; InjectionSiteMap modal in view-only mode
- `src/services/analytics.ts` — `SITE_MAP_OPENED` and `SITE_SELECTED_FROM_MAP` events added

### Architecture decisions
- **No new Firestore collection** — rotation stats derived entirely from existing `doses` collection via `getDoses()`; `computeSiteStats` groups client-side
- **10 visual zones → 8 InjectionSite values** — front/back thighs both map to `leftQuad`/`rightQuad`; no type changes, full backward compatibility with existing dose records
- **Modal pattern** — consistent with existing peptide modals (animationType="slide", transparent backdrop, borderTopLeftRadius: 20)
- **Stats cache cleared on each open** — ensures fresh rotation data after a new dose is logged
- Color thresholds: red ≤ 2 days, yellow 3–6 days, green 7+ days, gray = never used

---

## Adaptive Calorie Coaching

**Status:** ✅ Ray-approved (conditional → all 5 blocking + 5 non-blocking fixes applied)
**Date:** 2026-03-23
**Branch:** `feature/m22-tracked-cleanup`

### Features included

- `src/types/adaptiveCoaching.ts` — `AdaptiveCoachingState`, `WeightTrendPoint`, `AdaptiveTDEEResult`, `AdaptiveTargets`, `DataReadiness`
- `src/types/profile.ts` — `adaptiveCoaching?: AdaptiveCoachingState` added to `UserProfile`
- `src/utils/expenditureAlgorithm.ts` — pure: `smoothWeight` (EMA α=0.1), `calculateAdaptiveTDEE`, `generateTargets` (sex-based calorie floors), `daysUntilNextCheckIn`, `hasEnoughData`
- `src/services/adaptiveCoachingService.ts` — `getAdaptiveCoachingData`, `runWeeklyCheckIn`, `acceptCheckIn`, `dismissCheckIn`, `enableAdaptiveCoaching`, `disableAdaptiveCoaching`
- `app/(tabs)/nutrition/weight-log.tsx` — quick daily weight entry, 30-day trend chart with EMA overlay, opt-in card
- `src/components/nutrition/WeeklyCheckInModal.tsx` — ready/progress states, floor guardrail warning, "How it works" collapsible
- `app/(tabs)/nutrition/index.tsx` — scale icon, TDEE info card, `useFocusEffect` check-in trigger, modal
- `app/(tabs)/nutrition/settings.tsx` — `AdaptiveCoachingSection` toggle with status display
- `src/components/body/WeightChart.tsx` — optional `smoothedData` EMA overlay prop
- `src/services/analytics.ts` — 5 new events

### Ray Review Fixes Applied

**Blocking (all resolved):**
1. ✅ `dismissCheckIn` now writes full `AdaptiveCoachingState` — prevents nested map clobber
2. ✅ `acceptCheckIn` now takes `existing: AdaptiveCoachingState` — preserves `dataStartDate`
3. ✅ `daysUntilNextCheckIn` uses local date arithmetic — fixes UTC-vs-local parsing bug
4. ✅ `trendLabel` conditionally converts only for imperial users — metric users see correct kg values
5. ✅ `todayKey` moved inside component body — no stale date if app left open overnight

**Non-blocking (all resolved):**
6. ✅ No double Firestore fetch — `runWeeklyCheckIn` now accepts pre-fetched `AdaptiveCoachingData`
7. ✅ `refreshProfile()` called after `acceptCheckIn` — CalorieRing updates immediately
8. ✅ Dead `smoothWeight` import removed from `weight-log.tsx`
9. ✅ Duplicate `adaptiveCoachingService` import merged into one
10. ✅ Dead `maxDeficitTarget`/`MAX_DEFICIT` removed from `generateTargets`

---

## Phase 8.2 — Watch Navigation, Data Models & State Manager

**Status:** ✅ Ray-approved (conditional → blocking fix applied)
**Date:** 2026-03-23
**Branch:** `feature/phase8-watch`

### What's been built

- `ios-native/PepMaxWatch Watch App/WatchDataModels.swift` — 5 Codable+Equatable structs: `WatchNutritionState`, `WatchPeptideState`, `WatchGymState` (with `WatchGymExercise`), `WatchCardioState`, `WatchReadinessState`. Each has `static let empty` default.
- `ios-native/PepMaxWatch Watch App/WatchStateManager.swift` — Singleton `ObservableObject`; `@Published` for all 5 module states + `lastSyncTime` + `hasSynced`; `handleParsedContext(type:context:)` decodes `[String:Any]` → Codable via JSONSerialization; persists to `UserDefaults(suiteName: "group.com.pepmax.watchapp")` for future WidgetKit complications.
- `ios-native/PepMaxWatch Watch App/WatchSessionManager.swift` — Patched: `onContextParsed` callback added; `parseContext` expanded with `"PEPTIDE"`, `"GYM"`, `"CARDIO"`, `"READINESS"` cases; forwarding call at end of switch. Existing nutrition `@Published` properties unchanged.
- `ios-native/PepMaxWatch Watch App/Utilities/Color+Hex.swift` — `Color.init(hex:)` extension.
- `ios-native/PepMaxWatch Watch App/Views/ReadinessTabView.swift` — red accent, `heart.circle.fill`, readiness score or placeholder
- `ios-native/PepMaxWatch Watch App/Views/PeptideTabView.swift` — #7B2D8E accent, `syringe.fill`, compound name or placeholder
- `ios-native/PepMaxWatch Watch App/Views/GymTabView.swift` — #E67E22 accent, `dumbbell.fill`, workout name / rest day / placeholder
- `ios-native/PepMaxWatch Watch App/Views/NutritionTabView.swift` — #27AE60 accent; wraps existing `NutritionGlanceView` + `MacroBarView` + `NutritionEmptyView` (moved from ContentView.swift)
- `ios-native/PepMaxWatch Watch App/Views/CardioTabView.swift` — #2980B9 accent, `figure.run`, weekly miles or placeholder
- `ios-native/PepMaxWatch Watch App/ContentView.swift` — Rewritten as 5-page vertical `TabView` (`.tabViewStyle(.verticalPage)`). NutritionGlanceView/MacroBarView/EmptyStateView moved to NutritionTabView.swift.
- `ios-native/PepMaxWatch Watch App/PepMaxWatchApp.swift` — Added `WatchStateManager` `@StateObject`; wires `onContextParsed` callback in `init()`; injects both environment objects.

### Ray Review Fixes Applied

**Blocking (resolved):**
1. ✅ `GymTabView` rest day logic fixed — condition now gates on `hasSynced` alone; shows "Rest Day" / "No workout logged" / workout name correctly

**Non-blocking (all resolved):**
2. ✅ `decodeFromDict` now logs serialization and decode failures via `NSLog` with type name + error description
3. ✅ `decoder.dateDecodingStrategy = .millisecondsSince1970` — handles JS `Date.now()` for `WatchPeptideState.nextDoseTime`
4. ✅ `NutritionTabView` + `NutritionGlanceView` migrated to `WatchStateManager.nutrition` — dual `hasSynced` eliminated; `ContentView` no longer references `sessionManager`
5. ✅ `NutritionEmptyView` gets `.tint(accent)` from `NutritionTabView`

### Architecture decisions
- `WatchStateManager` composes alongside `WatchSessionManager` (does not own WCSession) — forwarding callback keeps session ownership clean
- All 5 tab views read exclusively from `WatchStateManager` — single source of truth on watch
- `decodeFromDict<T>` bridges `[String:Any]` → Codable via JSON serialization — avoids manual key mapping
- Complications deferred to dedicated prompt (requires Widget Extension Xcode target + App Group entitlements)

### Required manual step (macOS Xcode)
- Add `group.com.pepmax.watchapp` App Group entitlement to the watch target for `UserDefaults` suite to work (falls back to `.standard` otherwise — functional, just not shareable with future complications)

---

## Phase 8.1 — Today's Macros Watch Screen

**Status:** 🔄 Ray review pending
**Date:** 2026-03-23
**Branch:** `feature/phase8-watch`

### What's been built

- `src/utils/watchSync.ts` — `pushNutritionToWatch(entries, targets)` fire-and-forget helper; computes totals from entries, calls `updateWatchState` with nutrition payload including consumed + target values + timestamp
- `app/(tabs)/nutrition/index.tsx` — imports `pushNutritionToWatch`, calls it after `setEntries` in `load()` with loaded entries and user targets
- `ios-native/PepMaxWatch Watch App/WatchSessionManager.swift` — typed `@Published` properties for calories, protein, carbs, fat (consumed + targets), `lastSyncTime`, `hasSynced`; `parseContext()` method routes by `type` field and populates typed properties
- `ios-native/PepMaxWatch Watch App/ContentView.swift` — `NutritionGlanceView` (calorie ring + 3 macro progress bars + sync time label), `EmptyStateView` ("Open PepMax on your iPhone to sync"), `MacroBarView` component; SwiftUI preview with simulated data

### Architecture decisions
- Payload includes both consumed AND targets so watch renders independently (no profile fetch)
- `pushNutritionToWatch` is a standalone utility, not inlined in the component — reusable from manual-entry, food-detail, etc.
- `parseContext` is `type`-switched so future watch screens (peptides, workouts) add cases without restructuring
- Fire-and-forget pattern: no await, `.catch(() => {})`, mirrors HealthKit write pattern

---

## Phase 8 — Apple Watch Companion App (Foundation Layer)

**Status:** ✅ Ray-approved (conditional — observations resolved)
**Date:** 2026-03-23
**Branch:** `feature/phase8-watch`

### What's been built

#### TypeScript Layer (complete)
- `src/types/watchConnectivity.ts` — `WatchMessageType`, `WatchMessage`, `WatchState` types
- `src/services/watchConnectivity.ts` — Lazy native module wrapper (mirrors `healthKitService.ts` pattern): `sendToWatch`, `updateWatchState`, `isPaired`, `isReachable`, `onWatchMessage`
- `src/hooks/useWatchConnectivity.ts` — React hook with paired/reachable state + message subscription

#### Native Code — Staged in `ios-native/` (copy to `ios/` after prebuild)
- `ios-native/PepMax/PepMax-Bridging-Header.h` — Swift/ObjC interop
- `ios-native/PepMax/WatchSessionManager.swift` — Phone-side WCSession singleton (activate, sendMessage, updateApplicationContext, transferUserInfo, delegate callbacks)
- `ios-native/PepMax/WatchConnectivityModule.swift` — RN bridge module (`RCTEventEmitter`), activates WCSession on init, emits `onWatchMessage` events to JS
- `ios-native/PepMax/WatchConnectivityModule.m` — ObjC bridge macros
- `ios-native/PepMaxWatch Watch App/WatchSessionManager.swift` — Watch-side WCSession singleton (ObservableObject, @Published state)
- `ios-native/PepMaxWatch Watch App/PepMaxWatchApp.swift` — Watch app entry point
- `ios-native/PepMaxWatch Watch App/ContentView.swift` — "Hello PepMax" view with connection status

#### Expo Config Plugin
- `plugins/withWatchConnectivity.js` — Copies phone-side files from `ios-native/` into `ios/PepMax/`, registers with Xcode project, sets bridging header build setting, links `WatchConnectivity.framework`

#### app.json changes
- Added `"bundleIdentifier": "com.pepmax.app"` under `expo.ios`
- Added `"./plugins/withWatchConnectivity"` to plugins array

### Required manual steps (macOS only)

1. **Run prebuild on macOS:**
   ```
   npx expo prebuild --platform ios
   ```

2. **Open Xcode:** `ios/PepMax.xcodeproj`

3. **Add WatchKit target:**
   - File → New → Target → watchOS → App
   - Product Name: `PepMaxWatch`
   - Bundle ID: `com.pepmax.app.watchkitapp`
   - Interface: SwiftUI, Language: Swift, no tests
   - Embed in: PepMax

4. **Copy watch-side files** from `ios-native/PepMaxWatch Watch App/` into the new `ios/PepMaxWatch Watch App/` directory (replace the auto-generated ContentView.swift and add WatchSessionManager.swift + PepMaxWatchApp.swift)

5. **Set bridging header in Xcode:** PepMax target → Build Settings → "Objective-C Bridging Header" → `PepMax/PepMax-Bridging-Header.h` (the config plugin sets this automatically, but verify)

6. **Build both targets** to paired simulators

### Architecture decisions
- Watch NEVER talks to Firebase — phone relays all data
- WCSession activates in `WatchConnectivityModule.init()` — no AppDelegate changes needed
- Three WatchConnectivity channels: `sendMessage` (real-time), `updateApplicationContext` (latest-state), `transferUserInfo` (queued background)
- Lazy native module load with `NativeModules.WatchConnectivityModule` — safe for Expo Go (no crash, all functions no-op)
- `NativeEventEmitter` for watch→phone messages — new pattern in this codebase, standard RN mechanism

### Verification checklist
- [ ] `ios/` directory generated by prebuild
- [ ] Both PepMax + PepMaxWatch schemes visible in Xcode
- [ ] Watch simulator shows "Hello PepMax" + connection status
- [ ] Phone app builds without errors
- [ ] `NativeModules.WatchConnectivityModule` is defined in JS (not undefined)
- [ ] `sendToWatch('SYNC_STATE', { test: true })` arrives in watch Xcode console

---

## Active Branch: `feature/m22-tracked-cleanup`

---

## M22 Tracked Cleanup — Non-Blocking Observations Resolved

**Status:** ✅ Ray-approved (conditional → fixes applied)
**Date:** 2026-03-22
**Branch:** `feature/m22-tracked-cleanup`

### Fixes applied

1. **Strength tooltip unit label** (`training/progress.tsx`) — `useAuth` + `userProfile?.units` → `'lbs'` or `'kg'` (defaults `'kg'` when profile unloaded); appended to est. 1RM tooltip text
2. **HeartRateChart hardcoded axis colors** (`components/cardio/HeartRateChart.tsx` + `cardio/session-detail.tsx`) — `colors` prop added (typed `ReturnType<typeof useTheme>['colors']`); `'#ccc'`/`'#888'`/`'#eee'` replaced with `colors.border`/`colors.textSecondary`
3. **Dark mode badge contrast** (`components/peptides/PresetBrowser.tsx`) — `statusBadgeProps(status, isDark)` now takes dark flag; dark-mode variants: FDA `#1B5E20`/`#A5D6A7`, Research `#BF360C`/`#FFCCBC`, Compounded `#424242`/`#E0E0E0`
4. **`parseRoute` fallback audit** (`services/peptideService.ts`) — returns `Route | null` instead of always `'SubQ'`; `addPeptideFromPreset` uses `?? 'SubQ'`; `if (r) setRoute(r)` in `peptide-form.tsx` now has meaning
5. **FlatList → .map() in recon calculator** (`peptides/recon-calculator.tsx`) — compound picker dropdown replaced with `.map()`; `FlatList` removed from imports

---

## Milestone 22 — Custom Meal Slots + Copy Yesterday's Meals

**Status:** ✅ Ray-approved (conditional → fixes applied)
**Date:** 2026-03-22

### Features included

#### Custom Meal Slots in Add-Food Flow
- `src/types/nutrition.ts` — `FoodLogEntry.mealSlot: string` (widened from `MealSlot` union); `getSlotLabel(slotId, slots)` helper added after `DEFAULT_MEAL_SLOTS`
- `src/services/nutritionService.ts` — `FoodLogInput.mealSlot: string`; removed `MealSlot` import
- `src/services/recipeService.ts` — `logRecipeAsFood` param `mealSlot: string`; removed `MealSlot` import
- `app/(tabs)/nutrition/add-food.tsx` — imports `useAuth`, loads `activeSlots` from `userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS`, slot state widened to `string`, slot picker iterates `activeSlots`; `useEffect([userProfile])` syncs `mealSlot` when profile loads after first render
- `app/(tabs)/nutrition/food-detail.tsx` — same pattern: `useAuth`, `activeSlots`, `string` state, dynamic picker; `useEffect([userProfile])` sync fix applied
- `app/(tabs)/nutrition/manual-entry.tsx` — same pattern
- `app/(tabs)/nutrition/my-recipes.tsx` — `LogRecipeModal` gets `useAuth` + `activeSlots` directly; same picker overhaul
- `app/(tabs)/nutrition/barcode-scan.tsx` — route param type `string`, `MealSlot` import removed

#### Copy Yesterday's Meals
- `src/services/nutritionService.ts` — `copyMealsFromDate(fromDate, toDate, slotFilter?)` — fetches source entries, sequential `logFood` calls (avoids HealthKit flooding), returns copied count
- `app/(tabs)/nutrition/index.tsx` — `CopyMealsModal` component: slide-up sheet, per-slot checkboxes with item count + kcal, all pre-selected, "Copy Selected (N)" button, loading/error/empty states; copy icon added to header (between calendar and recipes); `showCopyModal` state; `onCopied` refreshes today's log; `yesterdayKey` computed at body level and included in `useEffect` deps (ESLint fix)

### Architecture decisions
- `MealSlot` union type kept as-is — still useful as documentation for the 4 defaults; `MEAL_SLOTS` and `MEAL_SLOT_LABELS` unchanged (used by settings screen for default slot management)
- `FoodLogEntry.mealSlot` widened to `string` — Firestore never enforced the union at runtime; this brings the type contract in line with reality
- Sequential `logFood` in `copyMealsFromDate` — intentional to avoid parallel HealthKit writes; each copy triggers body model recompute (fire-and-forget, last-write-wins acceptable)
- `CopyMealsModal` fetches yesterday's data on every open (not eagerly on focus) — avoids unnecessary Firestore reads when user never opens the modal

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
