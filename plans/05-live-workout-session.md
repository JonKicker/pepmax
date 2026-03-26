# Plan 05 — Live Workout Session & Set Logging

**Status:** APPROVED by Ray
**Date:** 2026-03-18
**Author:** Bob

---

## Context

The Training tab had basic single-exercise logging but no live workout session tracking. This milestone adds the complete live workout experience: start from a template or quick-start, log sets in real time with rest timer, auto-save per set, crash recovery, personal record detection, and a post-workout summary.

## Pre-existing Infrastructure (discovered during exploration)

The following already existed and were reused as-is:
- `src/types/exercise.ts` — Exercise, MuscleGroup, ExerciseCategory types
- `src/types/template.ts` — WorkoutTemplate, TemplateExercise types
- `src/data/exerciseLibrary.ts` — Static exercise seed data
- `src/services/exerciseService.ts` — Exercise search/filter helpers
- `src/services/templateService.ts` — Template CRUD + starter templates
- `src/contexts/ExercisePickerContext.tsx` — Picker callback context
- `app/(tabs)/training/exercises.tsx` — Exercise Library with picker mode

## What Was Built

### Types
- `src/types/workout.ts` — SessionSet, SessionExercise, WorkoutSession, SessionStatus

### Services
- `src/services/workoutSessionService.ts` — createSession, updateSession, getSessionById, getActiveSession, getRecentSessions, getLastSessionWithExercise
- `src/services/personalRecordService.ts` — O(1) PR detection per exercise via dedicated Firestore collection (personalRecords/{exerciseId}). Detects 4 PR types: weight, volume, reps-at-weight, estimated 1RM
- `src/types/personalRecord.ts` — PRType, PREntry, RepPREntry, PersonalRecord, PRDetectionResult

### Hooks
- `src/hooks/useWorkoutSession.ts` — Full session lifecycle (start/resume/completeSet/addSet/removeSet/addExercise/removeExercise/finish/abandon), 1s elapsed timer, 30s AsyncStorage cache, immediate Firestore writes on set completion
- `src/hooks/useRestTimer.ts` — Countdown timer with progress, skip, +/-15s adjust, haptic at zero
- `src/hooks/useWorkoutRecovery.ts` — Focus-aware active session check via exported `check()` callback
- `src/utils/weightMemory.ts` — AsyncStorage-backed last-used weight per exercise (linter moved from hooks/)

### Screens
- `app/(tabs)/training/active-session.tsx` — Full-screen live workout: custom header with timer, exercise sections with set rows (weight/reps/RPE inputs, swipe-delete), rest timer overlay, add exercise via picker, back-prevention dialog
- `app/(tabs)/training/session-summary.tsx` — Post-workout: stats grid (duration/volume/exercises/sets), PR highlights (gold badges), star rating, notes, save & finish

### Modified
- `app/(tabs)/training/_layout.tsx` — Added active-session and session-summary routes
- `app/(tabs)/training/index.tsx` — Added recovery banner (resume/discard), changed FAB to Quick Start (flash icon)
- `src/services/firebase/firestore.ts` — Added WORKOUT_SESSIONS to COLLECTIONS

## Files

```
NEW  src/types/workout.ts
NEW  src/services/workoutSessionService.ts
NEW  src/hooks/useWorkoutSession.ts
NEW  src/hooks/useRestTimer.ts
NEW  src/hooks/useWorkoutRecovery.ts
NEW  app/(tabs)/training/active-session.tsx
NEW  app/(tabs)/training/session-summary.tsx
MOD  app/(tabs)/training/_layout.tsx
MOD  app/(tabs)/training/index.tsx
MOD  src/services/firebase/firestore.ts
```

10 files total (7 new, 3 modified).

## TypeScript: `npx tsc --noEmit` — 0 errors

## Ray Review Fixes Applied
1. PR N+1 query → O(1) dedicated `personalRecords` collection
2. Write race in `completeSet` → re-reads `sessionRef.current` before Firestore write
3. Resume validation → rejects non-active sessions
4. Volume display → derives unit from first completed set's `weightUnit`
5. Stale state in `handleCompleteSet` → hook returns `{prResult, isLastSet, exerciseName}`
6. Empty state text → updated to match Quick Start FAB
7. Recovery hook → focus-aware via exported `check()` callback
8. Session summary error handling → shows error screen with back button on failed fetch

## Tracked Should-Fixes (Next Milestone)
- `beforeRemove` listener re-registration on every `workout.session` change
- `weightMemory` exerciseId sanitization
- Rest timer should use template's `restSeconds` instead of hardcoded 90s

## Deferred to Future Work
- Push notifications for backgrounded rest timer (expo-notifications setup)
- Superset-aware rest timer logic
- Template "Start Workout" button on template cards (requires templates screen)
- Workout history screen
