/**
 * Auth service — all Firebase Authentication helpers.
 *
 * Error pattern: every function returns ServiceResult<T>.
 * Callers check result.error before using result.data — no try/catch at call sites.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  User,
  NextOrObserver,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth } from './index';
import type { ServiceResult } from '../../types/service';

export async function signUp(
  email: string,
  password: string
): Promise<ServiceResult<User>> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    return { data: user, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<ServiceResult<User>> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return { data: user, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function signOut(): Promise<ServiceResult<void>> {
  try {
    await firebaseSignOut(auth);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function resetPassword(email: string): Promise<ServiceResult<void>> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { data: undefined, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function — callers MUST call it on cleanup.
 *
 * Usage in useEffect:
 *   const unsubscribe = onAuthStateChanged(setUser);
 *   return () => unsubscribe();
 */
export function onAuthStateChanged(callback: NextOrObserver<User>): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Google Sign-In — credential step only.
 * The OAuth prompt (useAuthRequest) must be handled in the calling component
 * using expo-auth-session/providers/google. Pass the resulting id_token here.
 */
export async function signInWithGoogleCredential(
  idToken: string
): Promise<ServiceResult<User>> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const { user } = await signInWithCredential(auth, credential);
    return { data: user, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Apple Sign-In — uses native expo-apple-authentication.
 * Only available on iOS. Check Platform.OS before calling.
 */
export async function signInWithApple(): Promise<ServiceResult<User>> {
  try {
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!appleCredential.identityToken) {
      return { data: null, error: new Error('Apple sign-in returned no identity token') };
    }

    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: appleCredential.identityToken,
    });

    const { user } = await signInWithCredential(auth, oauthCredential);
    return { data: user, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
