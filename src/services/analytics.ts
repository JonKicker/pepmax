/**
 * Analytics service — Mixpanel wrapper.
 *
 * All event tracking goes through this module. Centralizes:
 * - No-op in development (keeps Mixpanel dashboard clean)
 * - PII denylist (strips email, name from event properties)
 * - Type-safe event names via AnalyticsEvent
 *
 * Usage:
 *   import { analytics, AnalyticsEvent } from './analytics';
 *   analytics.track(AnalyticsEvent.WORKOUT_COMPLETED, { duration_minutes: 45 });
 */
import { Mixpanel } from 'mixpanel-react-native';

// ─── Event name constants ─────────────────────────────────────────────────────

export const AnalyticsEvent = {
  // Auth
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',

  // Peptide
  PEPTIDE_ADDED: 'peptide_added',
  DOSE_LOGGED: 'dose_logged',
  REMINDER_SET: 'reminder_set',
  SIDE_EFFECT_REPORTED: 'side_effect_reported',

  // Nutrition
  FOOD_LOGGED: 'food_logged',
  FOOD_SEARCH_PERFORMED: 'food_search_performed',
  FAVORITE_FOOD_SAVED: 'favorite_food_saved',

  // Gym
  WORKOUT_STARTED: 'workout_started',
  WORKOUT_COMPLETED: 'workout_completed',
  PR_ACHIEVED: 'pr_achieved',
  TEMPLATE_CREATED: 'template_created',

  // Cardio
  CARDIO_SESSION_STARTED: 'cardio_session_started',
  CARDIO_SESSION_COMPLETED: 'cardio_session_completed',

  // Body tracking
  WEIGHT_LOGGED: 'weight_logged',
  PROGRESS_PHOTO_TAKEN: 'progress_photo_taken',
  PHOTO_COMPARISON_VIEWED: 'photo_comparison_viewed',
  PHOTO_SHARED: 'photo_shared',

  // Subscription
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_RESTORED: 'subscription_restored',

  // General
  APP_OPENED: 'app_opened',
  SCREEN_VIEWED: 'screen_viewed',
  TAB_SWITCHED: 'tab_switched',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

// ─── PII denylist ──────────────────────────────────────────────────────────────
// These keys are stripped from event properties before sending to Mixpanel.

const PII_KEYS = new Set(['email', 'name', 'firstName', 'lastName', 'phone', 'address']);

function stripPII(props: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!PII_KEYS.has(k.toLowerCase())) {
      safe[k] = v;
    }
  }
  return safe;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '';

let _mixpanel: Mixpanel | null = null;

function getInstance(): Mixpanel | null {
  if (__DEV__) return null; // No-op in dev
  if (!TOKEN) return null;
  if (!_mixpanel) {
    _mixpanel = new Mixpanel(TOKEN, /* trackAutomaticEvents */ false);
    _mixpanel.init();
  }
  return _mixpanel;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const analytics = {
  /**
   * Associate all future events with this user ID.
   * Call on login.
   */
  identify(userId: string): void {
    getInstance()?.identify(userId);
  },

  /**
   * Track an event. Props are stripped of PII before sending.
   */
  track(eventName: AnalyticsEventName, props?: Record<string, string | number | boolean>): void {
    const instance = getInstance();
    if (!instance) return;
    const safeProps = props ? stripPII(props as Record<string, unknown>) : undefined;
    instance.track(eventName, safeProps as Record<string, string | number | boolean> | undefined);
  },

  /**
   * Set persistent user profile properties.
   * Use Mixpanel built-in names ($name, $email) for standard fields.
   */
  setUserProperties(props: Record<string, string | number | boolean | string[]>): void {
    getInstance()?.getPeople().set(props);
  },

  /**
   * Disassociate future events from the current user.
   * Call on sign-out.
   */
  reset(): void {
    getInstance()?.reset();
  },

  /**
   * Start timing an event. Call track() with the same name to record duration.
   */
  timeEvent(eventName: AnalyticsEventName): void {
    getInstance()?.timeEvent(eventName);
  },
};
