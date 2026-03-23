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
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useThemeContext } from '../src/contexts/ThemeContext';
import { PremiumProvider, usePremium } from '../src/contexts/PremiumContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { initSentry, sentryWrap, setUser as sentrySetUser } from '../src/services/errorReporting';
import { analytics, AnalyticsEvent } from '../src/services/analytics';
import { loadHKEnabled } from '../src/utils/hkEnabled';

// Initialize Sentry once at module load — before any component renders.
initSentry();

function AuthGuard() {
  const { currentUser, userProfile, isLoading, profileLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Track previous uid to detect login/logout transitions (undefined = first render)
  const prevUidRef = useRef<string | null | undefined>(undefined);

  // Identify / reset analytics and error reporting when auth state changes
  useEffect(() => {
    const uid = currentUser?.uid ?? null;
    if (prevUidRef.current === undefined) {
      prevUidRef.current = uid;
      if (uid) {
        analytics.identify(uid);
        sentrySetUser({ id: uid });
      }
      return;
    }
    if (uid === prevUidRef.current) return;
    prevUidRef.current = uid;

    if (uid) {
      analytics.identify(uid);
      sentrySetUser({ id: uid });
    } else {
      analytics.reset();
      sentrySetUser(null);
    }
  }, [currentUser]);

  // Set user properties once profile is loaded
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    analytics.setUserProperties({
      experience_level: userProfile.experienceLevel ?? '',
      unit_preference: userProfile.units ?? 'imperial',
      join_date: userProfile.quizCompletedAt
        ? userProfile.quizCompletedAt.toDate().toISOString().slice(0, 10)
        : '',
      modules_active: userProfile.goals ?? [],
    });
  }, [currentUser, userProfile]);

  // Track screen navigation via segment changes
  useEffect(() => {
    if (!navigationState?.key) return;
    const screenName = segments[segments.length - 1] ?? 'root';
    analytics.track(AnalyticsEvent.SCREEN_VIEWED, { screen_name: screenName });
  }, [segments, navigationState?.key]);

  useEffect(() => {
    if (!navigationState?.key) return; // Navigation container not mounted yet — router.replace would be dropped
    if (isLoading || profileLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';

    if (__DEV__) console.log('[AuthGuard]', {
      authenticated: currentUser !== null,
      onboardingComplete: userProfile?.onboardingComplete ?? false,
      segment: segments[0] ?? '/',
    });

    if (!currentUser) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (!userProfile?.onboardingComplete) {
      // Signed in but onboarding not complete
      if (!inOnboarding) router.replace('/(onboarding)/quiz');
    } else {
      // Fully onboarded — land on dashboard (tabs have no root index, only named sub-routes)
      if (!inTabs) router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, userProfile, isLoading, profileLoading, segments, navigationState?.key]);

  // Deep-link from push notifications (e.g. morning recovery check-in reminder)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'morning-check-in' && currentUser) {
        router.push('/(tabs)/dashboard/morning-check-in');
      }
    });
    return () => sub.remove();
  }, [router, currentUser]);

  return null;
}

function ThemedStatusBar() {
  const { theme } = useThemeContext();
  return <StatusBar style={theme.dark ? 'light' : 'dark'} />;
}

// Syncs subscription plan_type to Mixpanel user properties.
// Lives inside PremiumProvider so it has access to the plan value.
function PremiumSync() {
  const { plan } = usePremium();
  useEffect(() => {
    analytics.setUserProperties({ plan_type: plan ?? 'free' });
  }, [plan]);
  return null;
}

function RootLayout() {
  useEffect(() => {
    analytics.track(AnalyticsEvent.APP_OPENED);
    // Load cached HK opt-in flag so service-layer write-backs respect the user's
    // preference before the Firestore profile finishes loading.
    loadHKEnabled().catch(() => {});
  }, []);

  return (
    <ThemeProvider>
    <AuthProvider>
      <AuthGuard />
      <ThemedStatusBar />
      <ErrorBoundary>
        <PremiumProvider>
          <PremiumSync />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="go-pro" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </PremiumProvider>
      </ErrorBoundary>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default sentryWrap(RootLayout);
