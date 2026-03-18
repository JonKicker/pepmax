# PepMax Feature Tracker

## Active Branch: `feature/build-all-priorities`

---

## Milestone 11 — Cardio Sharing, Peptide Side Effects, USDA Nutrition, Training Enhancements

**Status:** Committing
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

**Status:** CONDITIONAL APPROVAL — cleared to commit

**Follow-up items for next milestone:**
1. Add `maxLength` on `notes` TextInput in `LogSideEffectModal` (no Firestore doc size issue, but good practice)
2. Surface `getSideEffects` errors in `useHalfLifeTimeline` (currently silently empty)
3. Improve `colorForPeptide` hash to reduce collision risk with 8+ peptides

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
| 11 | Cardio sharing, Peptide side effects + half-life, USDA integration, Training enhancements | 🔄 Committing |
