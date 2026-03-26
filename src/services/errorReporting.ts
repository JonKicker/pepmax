/**
 * Error reporting service — Sentry wrapper.
 *
 * Centralizes all Sentry calls. Disabled in development (enabled: !__DEV__).
 * tracesSampleRate: 0.2 = 20% of transactions, keeps quota manageable.
 *
 * Usage:
 *   import { initSentry, captureException, setUser } from './errorReporting';
 *   initSentry(); // call once at app startup
 *   captureException(error); // in catch blocks
 */
import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/**
 * Initialize Sentry. Call once at module top-level in app/_layout.tsx.
 */
export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    release: Application.nativeApplicationVersion ?? undefined,
  });
}

/**
 * Report an exception to Sentry with optional context.
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (__DEV__) {
    console.error('[ErrorReporting]', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Set the current user for Sentry error attribution.
 * Only the opaque uid is sent — no PII (no email, no name).
 * Pass null to clear (on sign-out).
 */
export function setUser(user: { id: string } | null): void {
  if (!user) { Sentry.setUser(null); return; }
  Sentry.setUser({ id: user.id });
}

/**
 * Add a breadcrumb to the current Sentry scope.
 * Breadcrumbs appear in Sentry error reports as a trail of events.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (__DEV__) return;
  Sentry.addBreadcrumb({ category, message, data, level: 'info' });
}

/**
 * Wrap a component with Sentry's error boundary and performance tracing.
 * Use on the root layout component.
 */
export const sentryWrap = Sentry.wrap;
