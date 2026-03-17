# Firebase Setup Instructions

## Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `PepMax`
3. Disable Google Analytics (optional for now)

---

## Step 2 — Register Your App

1. In your Firebase project, click the **`</>` Web** icon to add a web app
   - Name it `PepMax`
   - Do **not** enable Firebase Hosting
2. Copy the `firebaseConfig` object values shown

---

## Step 3 — Add Your Config to .env

```bash
cp .env.example .env
```

Open `.env` and paste in your values from the Firebase config object:

| .env key | Firebase config field |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

> **.env is gitignored.** The `.env.example` file (with placeholder values) is what gets committed.

---

## Step 4 — Enable Authentication

1. Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password**
3. Enable **Google** — download the updated `google-services.json` after enabling
4. Enable **Apple** (requires Apple Developer account)

### Google OAuth Client IDs
After enabling Google sign-in:
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Copy your Web, iOS, and Android OAuth 2.0 Client IDs into `.env`

---

## Step 5 — Set Up Firestore

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select a region close to your users

### Deploy Security Rules
```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login and init
firebase login
firebase init firestore   # point to your project, use existing firestore.rules file

# Deploy rules
firebase deploy --only firestore:rules
```

---

## Step 6 — Set Up Storage

1. Firebase Console → **Storage** → **Get started**
2. Start in production mode (rules will need to be added later)

---

## Step 7 — Push Notifications (expo-notifications + FCM)

For push notifications on Android, Firebase Cloud Messaging requires native config files.
**This requires a custom dev build (not Expo Go).**

When ready to set up push notifications:

### Android — `google-services.json`
1. Firebase Console → Project Settings → **Your apps** → Android app
2. Register with package name (e.g., `com.yourname.pepmax`)
3. Download `google-services.json`
4. Place it in the **root** of the project (Expo handles the rest via app.json plugin)
5. Add to `app.json`:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json"
   }
   ```

### iOS — `GoogleService-Info.plist`
1. Firebase Console → Project Settings → **Your apps** → iOS app
2. Register with bundle ID (e.g., `com.yourname.pepmax`)
3. Download `GoogleService-Info.plist`
4. Place it in the **root** of the project
5. Add to `app.json`:
   ```json
   "ios": {
     "googleServicesFile": "./GoogleService-Info.plist"
   }
   ```

> Both files contain no secrets beyond your Firebase project ID — they are safe to commit,
> but many teams gitignore them anyway and manage via CI secrets.

---

## File Checklist

| File | Status | Notes |
|------|--------|-------|
| `.env` | ❌ You create this | Copy from `.env.example`, fill in values |
| `.env.example` | ✅ Committed | Placeholder keys only |
| `firestore.rules` | ✅ Committed | Deploy via Firebase CLI |
| `google-services.json` | ❌ Download when ready | Android push notifications only |
| `GoogleService-Info.plist` | ❌ Download when ready | iOS push notifications only |
