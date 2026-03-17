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
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from '../services/firebase/auth';
import { db } from '../services/firebase/index';
import type { UserProfile } from '../types/profile';

type AuthState = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
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
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'profile', 'data'));
      // Discard result if a different user is now active
      if (currentUidRef.current !== uid) return;
      setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch {
      if (currentUidRef.current === uid) setUserProfile(null);
    } finally {
      if (currentUidRef.current === uid) setProfileLoading(false);
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isLoading,
        profileLoading,
        isAuthenticated: currentUser !== null,
        refreshProfile,
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
