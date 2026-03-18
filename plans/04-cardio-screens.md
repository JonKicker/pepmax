# Plan 04 — Cardio Tab Screens

**Status:** BUILT — awaiting Ray code review
**Date:** 2026-03-18
**Author:** Bob

---

## Pre-work Completed (Ray's Rejection Items 1–8)

All backend hook/utility bugs fixed before screen work begins:

| Item | Fix |
|------|-----|
| 1 | Removed duplicate `const sess` in `addRoutePoint` |
| 2 | Added `caloriesRef` mirror; `stop()` reads `caloriesRef.current` not stale state |
| 3 | Extracted `startCacheTimer()` / `stopCacheTimer()`; `resume()` calls `startCacheTimer()` |
| 4 | `useCardioSession` now accepts `weightKg: number` as parameter |
| 5 | Auto-pause reads `settings.autoPauseRun` / `settings.autoPauseCycle` from `settingsRef` |
| 6 | Split distance derived from `distanceUnit` (`1609.344m` for mi, `1000m` for km) via `splitDistanceMRef` |
| 7 | `useAudioCues` dep array now includes `settings`, `currentPace`, `unit` |
| 8 | `heartRate` removed from `AudioCueContent` type (no HR sensor planned) |
| 9 | Confirmed: `expo-speech ~14.0.8` already in package.json |

`npx tsc --noEmit` — **0 errors**.

---

## Bob → Ray Handoff

**What I'm proposing:** Build the Cardio tab UI screens, wiring into the fixed hook/service layer, with explicit location permission and error handling flows.

---

## Route Structure

```
app/(tabs)/cardio/
  _layout.tsx           Stack navigator
  index.tsx             Dashboard — 4 activity cards + history entry point
  start-session.tsx     Pre-session config (goal, indoor, pool length)
  active-session.tsx    Live session screen
  session-summary.tsx   Post-session stats + splits
  history.tsx           Completed sessions list
  settings.tsx          Audio cues + unit + auto-pause toggles
```

---

## Screen Specs

### `_layout.tsx`
- Stack navigator with default header on all screens except `active-session` (header hidden there — full-screen live view)

### `index.tsx` — Cardio Dashboard
- 4 activity cards: Run, Cycle, Walk, Swim
- Each card shows last session summary (distance, duration, date) via `getLastSessionByType()`
- "Start" button on each card → navigates to `start-session` with `activityType` param
- Settings icon in header → navigates to `settings`
- History link → navigates to `history`
- No permission request here — requested only when user commits to starting

### `start-session.tsx` — Pre-Session Config
- Shows activity type (from param)
- Goal picker: None / Distance / Time / Pace (with value input when relevant)
- Indoor mode toggle (Run and Cycle only; hidden for Walk and Swim)
- Pool length picker (Swim only): 25m / 50m / 25yd / 50yd / Custom
- **"Start Session" button flow:**
  1. If not indoor: call `requestLocationPermission()`
     - `'denied'`: show inline error banner "Location access is required for GPS tracking. Please allow location access and try again."
     - `'settings'`: show banner with "Open Settings" button linking to app settings via `Linking.openSettings()`
     - `'granted'`: proceed
  2. Call `createCardioSession(input)` — show loading indicator
     - On error: show inline error banner, do not navigate
     - On success: navigate to `active-session` with the new `sessionId`

### `active-session.tsx` — Live Screen

**start() timing (Ray conditional approval resolved — Option A):**
`start()` must NOT be called on mount. The hook's `sessionRef` is populated asynchronously
from Firestore. Calling `start()` before load completes means `sessionRef.current` is null,
`startWatcher()` is silently skipped, and zero GPS data is recorded.

Implementation: screen uses a `hasStartedRef = useRef(false)` guard and a `useEffect([session])`
dep. When `session` transitions from null → non-null for the first time, `start()` is called
once and the guard is set. This ensures GPS watcher starts only after session data is loaded.

- Fetches `userProfile` from `useAuth()` to get `weightKg` for calorie calc
- Gets `settings` from `useCardioSettings()`
- Instantiates `useCardioSession(sessionId, weightKg, settings, settings.distanceUnit)`
- Calls `start()` only after `session` non-null (see above)
- Displays: elapsed time (large), distance, current pace, average pace, calories, elevation gain
- Splits list scrollable at bottom
- `newSplit` banner: appears for 3s when a split fires (haptic + banner)
- Controls: Pause / Resume / Stop (with confirmation modal before stop)
- Abandon option in overflow menu (with confirmation)
- On `stop()` completion: navigate to `session-summary` replacing the active screen

### `session-summary.tsx` — Post-Session
- Receives `sessionId` param, fetches from Firestore
- Stats: distance, duration, avg pace, calories, elevation gain/loss
- Splits table: split #, distance, time, pace
- Map placeholder view (static — no live map package yet, to avoid new native deps)
- "Done" button → navigates to `index` (pops to root of cardio stack)

### `history.tsx` — Session History
- Calls `getRecentSessions(50)`
- Groups by week using session `createdAt`
- Each row: activity icon, distance, duration, date
- Tap row → navigate to `session-summary`

### `settings.tsx` — Cardio Settings
- Wires `useCardioSettings()` — all changes persisted to AsyncStorage immediately
- Audio cues: enabled toggle, frequency picker, content multi-select (distance / pace / time)
- Distance unit: mi / km toggle
- Auto-pause: separate toggles for Run and Cycle

---

## Packages

No new packages required. All dependencies already installed:
- `expo-location ~19.0.8`
- `expo-speech ~14.0.8`
- `expo-haptics ~15.0.8`
- `@react-native-async-storage/async-storage` (existing)

---

## Files Affected

```
app/(tabs)/cardio/_layout.tsx           NEW
app/(tabs)/cardio/index.tsx             NEW
app/(tabs)/cardio/start-session.tsx     NEW
app/(tabs)/cardio/active-session.tsx    NEW
app/(tabs)/cardio/session-summary.tsx   NEW
app/(tabs)/cardio/history.tsx           NEW
app/(tabs)/cardio/settings.tsx          NEW
src/hooks/useCardioSession.ts           FIXED (items 1–6)
src/hooks/useAudioCues.ts               FIXED (items 7–8)
src/types/cardio.ts                     FIXED (item 8)
```

Previously untracked files that will be committed as part of this milestone:
```
src/services/cardioService.ts
src/utils/cardio.ts
src/utils/cardioCache.ts
src/utils/locationPermission.ts
src/hooks/useCardioSettings.ts
```

---

## Security Considerations

- Location permission requested at "Start Session" tap — not on app launch or tab load
- `'settings'` permission state handled explicitly — user directed to system settings, not silently ignored
- All Firestore writes scoped to `users/{uid}/cardioSessions` — covered by existing security rules (users can only read/write their own UID path)
- No location data sent to any third party — only written to user's own Firestore doc
- `expo-location` watcher torn down in hook cleanup on unmount and on pause
- No map tile provider keys introduced (map is a placeholder only)
- `weightKg` sourced from authenticated user's own profile — not user-input on this screen

---

**Ready for review.**
