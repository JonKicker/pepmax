/**
 * AuthContext — authentication state + user profile for the entire app.
 *
 * Design notes (for Ray):
 * - onAuthStateChanged unsubscribe is returned from useEffect — no listener leaks.
 * - Profile fetch uses currentUidRef to guard against race conditions when users
 *   sign out and sign in quickly. Only the latest UID's result is applied.
 * - Profile is fetched directly via Firestore SDK (not the service helper) to avoid
 *   dependency on auth.currentUser timing — we use the uid from the callback instead.
 * - isLoading covers auth state resolution; profileLoading covers the subsequent fetch.
 *   The guard in _layout.tsx waits for BOTH before redirecting.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, FirestoreError } from 'firebase/firestore';
import { onAuthStateChanged } from '../services/firebase/auth';
import { db } from '../services/firebase/index';
import { invalidateCache } from '../services/dashboardService';
import type { UserProfile } from '../types/profile';

type AuthState = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Tracks the latest UID to cancel stale profile fetches (race condition guard)
  const currentUidRef = useRef<string | null>(null);

  async function fetchProfile(uid: string) {
    setProfileLoading(true);
    // Orphaned getDoc calls from Promise.race are safe: when the timeout rejects first,
    // the getDoc promise floats with no consumer and its result is silently dropped.
    // currentUidRef guards the uid-change case; no additional stale flag is needed.

    function attempt() {
      let timerId: ReturnType<typeof setTimeout>;
      return Promise.race([
        getDoc(doc(db, 'users', uid, 'profile', 'data')).finally(() =>
          clearTimeout(timerId),
        ),
        new Promise<never>((_, reject) => {
          timerId = setTimeout(
            () => reject(new Error('fetchProfile timed out after 10s')),
            10_000,
          );
        }),
      ]);
    }

    try {
      let snap: Awaited<ReturnType<typeof getDoc>>;
      try {
        snap = await attempt();
      } catch (firstErr) {
        // Silent single retry for transient Firestore connectivity issues.
        // Cold-start auth token propagation can briefly leave the SDK in an offline state.
        const isTransient =
          (firstErr instanceof FirestoreError &&
            (firstErr.code === 'unavailable' ||
              firstErr.code === 'deadline-exceeded')) ||
          (firstErr instanceof Error &&
            firstErr.message === 'fetchProfile timed out after 10s');

        if (!isTransient) throw firstErr;

        await new Promise<void>((res) => setTimeout(res, 2_000));
        if (currentUidRef.current !== uid) return;

        snap = await attempt();
      }

      if (currentUidRef.current !== uid) return;
      setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch (e) {
      if (__DEV__) console.error('[AuthContext] fetchProfile failed for uid:', uid, e);
      // Intentionally conditional — don't wipe a newly signed-in user's profile
      // if a stale fetch (from the previous user) errors out after a quick sign-out/sign-in.
      if (currentUidRef.current === uid) setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    // Subscribe — unsubscribe returned for cleanup (Ray verified)
    const unsubscribe = onAuthStateChanged((user) => {
      currentUidRef.current = user?.uid ?? null;
      setCurrentUser(user);
      setIsLoading(false);

      if (user) {
        fetchProfile(user.uid);
      } else {
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async (): Promise<void> => {
    if (!currentUser) return; // null guard — token may have expired or concurrent sign-out
    await fetchProfile(currentUser.uid);
  };

  // Optimistically merge partial data into userProfile without a Firestore round-trip.
  // Use this after a confirmed write to unblock AuthGuard immediately.
  // Guarded by currentUidRef — discards the merge if no user is active (e.g. called during sign-out).
  const updateProfile = (partial: Partial<UserProfile>) => {
    if (currentUidRef.current === null) return;
    setUserProfile((prev) => (prev ? { ...prev, ...partial } as UserProfile : null));
    invalidateCache();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        profileLoading,
        isAuthenticated: currentUser !== null,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
