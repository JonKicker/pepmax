/**
 * Root layout — mounts AuthProvider and handles all auth-state-based routing.
 *
 * Guard logic (for Ray):
 * - Waits for BOTH isLoading and profileLoading to resolve before redirecting.
 *   This prevents a flash where the app briefly shows the wrong screen.
 * - Uses useSegments() to detect current position — avoids redundant replace() calls
 *   when the user is already on the correct screen.
 * - Three destinations, no ambiguity:
 *     unauthenticated          → /(auth)/welcome
 *     authenticated, no quiz   → /(onboarding)/quiz
 *     authenticated, complete  → /(tabs)
 * - router.replace() is used (not push) so the back button never returns to auth screens.
 */
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

function AuthGuard() {
  const { currentUser, userProfile, isLoading, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until both auth and profile state are resolved
    if (isLoading || profileLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (!currentUser) {
      // Not signed in — send to welcome
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (!userProfile?.quizCompletedAt) {
      // Signed in but quiz not done
      if (!inOnboarding) router.replace('/(onboarding)/quiz');
    } else {
      // Fully onboarded — send to app
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [currentUser, userProfile, isLoading, profileLoading, segments]);

  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <AuthProvider>
      <AuthGuard />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
