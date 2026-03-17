# Plan 03 — Authentication Flow & Onboarding

**Status:** BUILT — awaiting Ray code review
**Date:** 2026-03-16
**Author:** Bob

---

## Bob → Ray Handoff

**What I'm proposing:** Build the complete auth flow — Welcome carousel, Sign Up, Log In, and 4-step Onboarding Quiz — with auth guard routing and TDEE/macro calculation.

---

## Route Structure

```
app/
  _layout.tsx          ← AuthProvider + routing guard (MODIFIED)
  (auth)/
    _layout.tsx        ← Stack, no header
    welcome.tsx        ← 3-slide carousel + Get Started / Skip
    sign-up.tsx        ← Email/password + Google + Apple
    log-in.tsx         ← Email/password + Google + Apple + Forgot Password
  (onboarding)/
    _layout.tsx        ← Stack, no header
    quiz.tsx           ← 4-step quiz, saves to Firestore, calculates TDEE
  (tabs)/              ← existing, unchanged
    ...
```

### Auth Guard Logic (root _layout.tsx)
Three states, three destinations — decided in the root layout using `useAuth()` and a profile check:

| State | Destination |
|-------|-------------|
| `isLoading === true` | Splash / loading spinner (no redirect yet) |
| `isAuthenticated === false` | `/(auth)/welcome` |
| `isAuthenticated && !onboardingComplete` | `/(onboarding)/quiz` |
| `isAuthenticated && onboardingComplete` | `/(tabs)` |

`onboardingComplete` = Firestore `users/{uid}/profile` document exists with `quizCompletedAt` field.

---

## AuthContext Extension

`AuthContext` will be extended with:
```ts
userProfile: UserProfile | null;
profileLoading: boolean;
```

This avoids a separate ProfileContext for now. If profile state grows significantly, we split it later.

`onAuthStateChanged` triggers a Firestore fetch for `users/{uid}/profile/data`. Both `currentUser` and `userProfile` update atomically before the guard redirects — prevents redirect flicker.

---

## New Files

| File | Purpose |
|------|---------|
| `app/(auth)/_layout.tsx` | Auth stack |
| `app/(auth)/welcome.tsx` | 3-slide reanimated carousel |
| `app/(auth)/sign-up.tsx` | Sign up form |
| `app/(auth)/log-in.tsx` | Log in form |
| `app/(onboarding)/_layout.tsx` | Onboarding stack |
| `app/(onboarding)/quiz.tsx` | 4-step quiz |
| `src/utils/tdee.ts` | TDEE + macro calculation (pure functions, unit-testable) |
| `src/types/profile.ts` | UserProfile TypeScript type |

---

## Packages to Install

- `react-native-reanimated` — carousel slide transitions (Expo managed, no native eject)

---

## Data Saved to Firestore

Path: `users/{uid}/profile/data` (single document, fixed ID)

```ts
type UserProfile = {
  // Quiz answers
  goals: ('peptides' | 'nutrition' | 'training' | 'cardio')[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  units: 'imperial' | 'metric';

  // Body stats (stored in metric internally, display in user's preferred units)
  heightCm: number;
  weightKg: number;
  age: number;
  sex: 'male' | 'female';

  // Calculated targets
  tdee: number;               // kcal/day
  calorieTarget: number;      // same as tdee initially
  macros: {
    proteinG: number;         // 30% of calories / 4
    carbsG: number;           // 40% of calories / 4
    fatG: number;             // 30% of calories / 9
  };

  // Meta
  quizCompletedAt: Timestamp;
  updatedAt: Timestamp;
};
```

**Internal storage decision:** All measurements stored in metric (cm, kg) regardless of user's display preference. UI converts at render time. This prevents unit confusion in calculations.

---

## TDEE Calculation (src/utils/tdee.ts)

```
Mifflin-St Jeor:
  Male:   (10 × kg) + (6.25 × cm) - (5 × age) + 5
  Female: (10 × kg) + (6.25 × cm) - (5 × age) - 161
  × 1.55 (Moderate activity — adjustable later in settings)

Macros:
  Protein: TDEE × 0.30 / 4  (grams)
  Carbs:   TDEE × 0.40 / 4  (grams)
  Fat:     TDEE × 0.30 / 9  (grams)
```

Pure functions, no Firebase calls. All rounding to nearest integer.

---

## Form Validation Rules

| Field | Rule |
|-------|------|
| Email | RFC-valid format, non-empty |
| Password | Min 8 characters |
| Height (imperial) | ft: 1–9, in: 0–11 |
| Height (metric) | 50–300 cm |
| Weight (imperial) | 50–999 lbs |
| Weight (metric) | 20–500 kg |
| Age | 13–120 |

---

## Firebase Error Mapping

```ts
const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};
```

---

## Haptics

- All button presses: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- "Finish" button on quiz step 4: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
- Carousel next/skip: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

---

## Security Considerations

- Passwords never logged, stored in state only during active form input, cleared on navigation
- Firebase Auth handles all credential storage — no manual token management
- `EXPO_PUBLIC_GOOGLE_*` client IDs will be needed for Google sign-in — currently empty in .env; Google sign-in button will be disabled with a clear "Coming soon" note until those are populated
- Apple sign-in rendered only on iOS (`Platform.OS === 'ios'`)
- Firestore profile write uses `setDocument` from our typed service layer (Plan 02), scoped to `users/{uid}/`
- No real secrets involved — all auth flows use public client IDs + Firebase Auth tokens

---

**Files affected:**
- `app/_layout.tsx` — add guard logic
- `src/contexts/AuthContext.tsx` — add userProfile + profileLoading
- 8 new files (listed above)
- `src/types/profile.ts` — new type
- `src/utils/tdee.ts` — new utility

**Ready for review.**
