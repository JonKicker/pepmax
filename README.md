# PepMax

> All-in-one wellness app for peptide tracking, nutrition logging, gym training, and GPS cardio.

**This is a private project. Not open source.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 55) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Backend | Firebase (Auth, Firestore, Storage) |
| Payments | RevenueCat *(planned)* |

---

## Modules

- **Peptides** — dose tracking, reminders, side effect logging
- **Nutrition** — meal logging, calories, macro targets (auto-calculated via TDEE)
- **Training** — workout logging with sets/reps/weight, PR tracking
- **Cardio** — GPS cardio session tracking *(planned)*

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS or Android)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/[YOUR-USERNAME]/pepmax.git
cd pepmax

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your Firebase config values — see FIREBASE_SETUP.md

# 4. Start the dev server
npx expo start
```

### Firebase Setup

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for full instructions on:
- Creating a Firebase project
- Enabling Auth (email/password, Google, Apple)
- Setting up Firestore and Storage
- Deploying security rules

### Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase credentials.
**Never commit `.env`** — it is gitignored.

---

## Project Structure

```
app/                    Expo Router pages (file-based routing)
  (auth)/               Welcome, Sign Up, Log In screens
  (onboarding)/         Onboarding quiz
  (tabs)/               Main app tabs (Dashboard, Nutrition, Training, Peptides, Profile)
src/
  components/           Reusable UI components
  constants/            Theme tokens, color system
  contexts/             AuthContext (auth state + user profile)
  hooks/                useTheme()
  services/firebase/    Firebase init, auth helpers, Firestore helpers
  types/                TypeScript types (UserProfile, ServiceResult, etc.)
  utils/                TDEE + macro calculation, unit conversions
plans/                  Bob/Ray build plans and milestone docs
firestore.rules         Firestore security rules
FIREBASE_SETUP.md       Step-by-step Firebase project setup guide
```

---

## Color System

| Module | Color |
|--------|-------|
| Brand primary | `#1B4F72` |
| Peptides | `#2E86C1` |
| Nutrition | `#27AE60` |
| Training | `#8E44AD` |

Supports light and dark mode via `useTheme()` hook.
