# Plan 02 — Firebase Integration

**Status:** BUILT — awaiting Ray code review
**Date:** 2026-03-16
**Author:** Bob

---

## Bob → Ray Handoff

**What I'm proposing:** Integrate Firebase (Auth, Firestore, Storage, Messaging) with AuthContext provider and Firestore security rules.

---

## ⚠️ Critical Architectural Decision Required Before Any Code Is Written

The user requested `@react-native-firebase/*` packages. There are two fundamentally different integration paths for Expo, and they are not interchangeable once chosen.

### Option A: `@react-native-firebase` (native SDK)

**What it requires:**
- `npx expo prebuild` — ejects the project from managed workflow, generates `ios/` and `android/` directories
- Custom dev client via `expo-dev-client` — **Expo Go stops working**
- Native build toolchain: Xcode (Mac only for iOS), Android Studio
- Every new native package added later also requires a rebuild of the dev client

**Pros:**
- Full offline persistence (Firestore SQLite cache)
- Best-in-class FCM push notifications
- Better performance for high-volume Firestore reads
- Full feature parity with native Firebase SDKs

**Cons:**
- Can no longer scan QR in Expo Go — requires building a custom client binary
- iOS builds require a Mac (user is on Windows)
- Significantly more complex CI/CD later
- Slower dev loop for early-stage prototyping

---

### Option B: Firebase JS SDK (`firebase` npm package)

**What it requires:**
- `npm install firebase` — pure JavaScript, no native code
- Stays in **Expo managed workflow** — Expo Go continues to work
- Google Sign-In: `expo-auth-session` + `expo-web-browser`
- Apple Sign-In: `expo-apple-authentication` (managed module, works in Expo Go)
- Push notifications: `expo-notifications` (wraps FCM/APNs, works in managed workflow)

**Pros:**
- Expo Go continues to work — scan QR and test immediately
- No native build toolchain needed (important: user is on Windows, can't build iOS natively)
- Faster iteration for early-stage development
- All requested features (Auth, Firestore, Storage, Messaging) are available

**Cons:**
- Firestore offline persistence requires manual setup (`initializeFirestore` with `persistentLocalCache`)
- Slightly more boilerplate for Google/Apple auth flows (OAuth redirect vs. native modal)
- Push notifications require Expo push token rather than raw FCM token

---

## My Recommendation (Bob)

**Option B — Firebase JS SDK** for now.

Reason: The user is on Windows, Expo Go is currently being used for testing, and we are in early-stage prototyping. Switching to a native build pipeline this early will stall momentum. The JS SDK covers every feature requested. Option A can be revisited if native performance becomes a bottleneck.

---

## Proposed Implementation (pending Ray approval)

### Packages to install
```
firebase
expo-auth-session
expo-web-browser
expo-apple-authentication
expo-notifications
expo-crypto (peer dep for auth session)
```

### Files to create
```
src/services/firebase.ts         ← init + Auth helpers + Firestore helpers
src/contexts/AuthContext.tsx     ← AuthProvider + useAuth() hook
firestore.rules                  ← security rules
FIREBASE_SETUP.md                ← instructions for config files
```

### Auth helpers (firebase.ts)
- `signUp(email, password)`
- `signIn(email, password)`
- `signOut()`
- `resetPassword(email)`
- `onAuthStateChanged(callback)`
- `signInWithGoogle()`
- `signInWithApple()`

### Firestore helpers (firebase.ts)
All auto-scoped to `users/{uid}/`:
- `addDocument(collection, data)`
- `updateDocument(collection, docId, data)`
- `deleteDocument(collection, docId)`
- `getDocument(collection, docId)`
- `queryDocuments(collection, constraints)`

### AuthContext
- `currentUser: FirebaseUser | null`
- `isLoading: boolean`
- `isAuthenticated: boolean`
- `useAuth()` hook

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Offline persistence
Using `initializeFirestore` with `persistentLocalCache({ tabManager: singleTab() })` — JS SDK equivalent of native offline persistence.

---

**Security considerations I've thought about:**
- Firestore rules lock all data to the authenticated user's UID — no cross-user data access
- Firebase config (API keys) will be in a `.env` file, not hardcoded — `.env` added to `.gitignore`
- Google/Apple OAuth uses PKCE flow via `expo-auth-session` — no raw tokens stored in app state
- Auth state is held in React context only, not persisted to AsyncStorage manually (Firebase SDK handles token persistence internally)
- `onAuthStateChanged` is the source of truth — no manual token juggling

**Ready for review.**
