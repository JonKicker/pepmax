/**
 * Firebase initialization — exports app, auth, db, storage instances only.
 * No helper logic lives here. See auth.ts and firestore.ts.
 */
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// getReactNativePersistence is present in the React Native Metro bundle but absent
// from firebase's default TS types (no "react-native" condition in package exports).
// require() bypasses the type lookup; Metro resolves it correctly at bundle time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Guard against duplicate initialization during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initializeAuth throws auth/already-initialized on hot reload when the module
// re-executes but the Firebase app instance already exists. Fall back to getAuth().
export const auth = (() => {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    console.warn('[firebase/auth] initializeAuth failed, falling back to getAuth:', e);
    return getAuth(app);
  }
})();

// persistentLocalCache / persistentSingleTabManager use IndexedDB — a web-only
// browser API unavailable in React Native. Using them here throws at runtime.
// getFirestore(app) is correct for RN: the JS SDK still provides an in-memory
// cache; persistent cross-session caching is not available via the JS SDK on RN.
export const db = getFirestore(app);

export const storage = getStorage(app);

export const functions = getFunctions(app);

export default app;
