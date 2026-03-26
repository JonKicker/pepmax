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
  WATCH_DOSE_LOGGED: 'watch_dose_logged',
  REMINDER_SET: 'reminder_set',
  SIDE_EFFECT_REPORTED: 'side_effect_reported',
  SITE_MAP_OPENED: 'site_map_opened',
  SITE_SELECTED_FROM_MAP: 'site_selected_from_map',

  // Peptide fasting windows (distinct from the IF fasting feature below)
  PEPTIDE_FASTING_REMINDER_SET: 'peptide_fasting_reminder_set',
  PEPTIDE_FASTING_WARNING_SHOWN: 'peptide_fasting_warning_shown',

  // Nutrition
  FOOD_LOGGED: 'food_logged',
  FOOD_SEARCH_PERFORMED: 'food_search_performed',
  FAVORITE_FOOD_SAVED: 'favorite_food_saved',

  // Intermittent Fasting
  FASTING_CONFIGURED: 'fasting_configured',
  FASTING_TIMER_VIEWED: 'fasting_timer_viewed',
  FASTING_BREAK_FAST: 'fasting_break_fast',
  FASTING_WINDOW_COMPLETED: 'fasting_window_completed',

  // Adaptive calorie coaching
  ADAPTIVE_COACHING_ENABLED: 'adaptive_coaching_enabled',
  ADAPTIVE_COACHING_DISABLED: 'adaptive_coaching_disabled',
  ADAPTIVE_CHECKIN_SHOWN: 'adaptive_checkin_shown',
  ADAPTIVE_CHECKIN_ACCEPTED: 'adaptive_checkin_accepted',
  ADAPTIVE_CHECKIN_DISMISSED: 'adaptive_checkin_dismissed',

  // Gym
  WORKOUT_STARTED: 'workout_started',
  WORKOUT_COMPLETED: 'workout_completed',
  PR_ACHIEVED: 'pr_achieved',
  TEMPLATE_CREATED: 'template_created',

  // Cardio
  CARDIO_SESSION_STARTED: 'cardio_session_started',
  CARDIO_SESSION_COMPLETED: 'cardio_session_completed',
  BEACON_ACTIVATED: 'beacon_activated',
  BEACON_DEACTIVATED: 'beacon_deactivated',
  BEACON_CONTACT_ADDED: 'beacon_contact_added',
  BEACON_CONTACT_REMOVED: 'beacon_contact_removed',

  // Body tracking
  WEIGHT_LOGGED: 'weight_logged',
  PROGRESS_PHOTO_TAKEN: 'progress_photo_taken',
  PHOTO_COMPARISON_VIEWED: 'photo_comparison_viewed',
  PHOTO_SHARED: 'photo_shared',

  // Subscription
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_RESTORED: 'subscription_restored',

  // Recovery
  RECOVERY_SCORE_COMPUTED: 'recovery_score_computed',
  RECOVERY_CHECK_IN_COMPLETED: 'recovery_check_in_completed',
  RECOVERY_CHECK_IN_SKIPPED: 'recovery_check_in_skipped',
  RECOVERY_DETAIL_VIEWED: 'recovery_detail_viewed',
  RECOVERY_REMINDER_CONFIGURED: 'recovery_reminder_configured',

  // Community templates
  COMMUNITY_LIBRARY_OPENED: 'community_library_opened',
  TEMPLATE_PUBLISHED: 'template_published',
  TEMPLATE_IMPORTED: 'template_imported',
  TEMPLATE_REVIEWED: 'template_reviewed',
  TEMPLATE_REPORTED: 'template_reported',

  // Gamification
  XP_AWARDED: 'xp_awarded',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  XP_HUB_VIEWED: 'xp_hub_viewed',
  TROPHY_CASE_VIEWED: 'trophy_case_viewed',

  // Daily Quests
  QUEST_COMPLETED: 'quest_completed',
  QUEST_BONUS_CLAIMED: 'quest_bonus_claimed',
  QUESTS_GENERATED: 'quests_generated',

  // Social / Username
  USERNAME_CLAIMED: 'username_claimed',
  USERNAME_RELEASED: 'username_released',
  LEADERBOARD_OPT_OUT_TOGGLED: 'leaderboard_opt_out_toggled',
  FEATURED_STAT_CHANGED: 'featured_stat_changed',

  // Social / Friends
  FRIEND_REQUEST_SENT: 'friend_request_sent',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
  FRIEND_REQUEST_DECLINED: 'friend_request_declined',
  FRIEND_REMOVED: 'friend_removed',
  FRIEND_SEARCH_PERFORMED: 'friend_search_performed',
  FRIEND_PROFILE_VIEWED: 'friend_profile_viewed',
  FRIENDS_LIST_VIEWED: 'friends_list_viewed',

  // Social / Leaderboards
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  LEADERBOARD_CATEGORY_CHANGED: 'leaderboard_category_changed',
  LEADERBOARD_SCOPE_CHANGED: 'leaderboard_scope_changed',

  // Social / Crews
  CREW_CREATED: 'crew_created',
  CREW_JOINED: 'crew_joined',
  CREW_LEFT: 'crew_left',
  CREW_MEMBER_REMOVED: 'crew_member_removed',
  CREW_INVITE_SHARED: 'crew_invite_shared',
  CREWS_LIST_VIEWED: 'crews_list_viewed',
  CREW_DETAIL_VIEWED: 'crew_detail_viewed',

  // Social / Hub + Integration (Phase 5)
  SOCIAL_HUB_VIEWED: 'social_hub_viewed',
  CREW_LEADERBOARD_VIEWED: 'crew_leaderboard_viewed',
  CREW_INVITE_DEEP_LINK_OPENED: 'crew_invite_deep_link_opened',

  // Compare
  COMPARE_PRIVACY_SAVED: 'compare_privacy_saved',
  COMPARE_USER_BLOCKED: 'compare_user_blocked',
  COMPARE_USER_UNBLOCKED: 'compare_user_unblocked',
  COMPARE_VIEWED: 'compare_viewed',
  COMPARE_FETCH_FAILED: 'compare_fetch_failed',
  COMPARE_SHARE_TAPPED: 'compare_share_tapped',
  COMPARE_INITIATED: 'compare_initiated',
  COMPARE_CARD_SHARED: 'compare_card_shared',
  COMPARE_CARD_CUSTOMIZED: 'compare_card_customized',

  // Body Hub
  BODY_HUB_VIEWED: 'body_hub_viewed',
  BODY_HUB_LAYER_SWITCHED: 'body_hub_layer_switched',
  BODY_HUB_VIEW_TOGGLED: 'body_hub_view_toggled',
  BODY_HUB_REGION_TAPPED: 'body_hub_region_tapped',
  BODY_HUB_SHEET_OPENED: 'body_hub_sheet_opened',
  BODY_HUB_FAB_PRESSED: 'body_hub_fab_pressed',

  // Challenges
  CHALLENGE_HUB_VIEWED: 'challenge_hub_viewed',
  CHALLENGE_JOINED: 'challenge_joined',
  CHALLENGE_LEFT: 'challenge_left',
  CHALLENGE_COMPLETED: 'challenge_completed',
  CHALLENGE_DETAIL_VIEWED: 'challenge_detail_viewed',

  // Duels
  DUEL_CREATED: 'duel_created',
  DUEL_ACCEPTED: 'duel_accepted',
  DUEL_DECLINED: 'duel_declined',
  DUEL_COMPLETED: 'duel_completed',
  DUEL_DETAIL_VIEWED: 'duel_detail_viewed',

  // Sharing
  CARD_SHARED: 'card_shared',
  CARD_CAPTURE_FAILED: 'card_capture_failed',

  // Route Segment Competition
  SEGMENT_CREATED: 'segment_created',
  SEGMENT_DELETED: 'segment_deleted',
  SEGMENT_MATCHED: 'segment_matched',
  SEGMENT_PR: 'segment_pr',
  SEGMENT_LEADERBOARD_VIEWED: 'segment_leaderboard_viewed',
  SEGMENTS_LIST_VIEWED: 'segments_list_viewed',
  LIVE_SEGMENT_ENTERED: 'live_segment_entered',
  LIVE_SEGMENT_COMPLETED: 'live_segment_completed',

  // Profile
  PROFILE_PICTURE_UPLOADED: 'profile_picture_uploaded',
  PROFILE_PICTURE_REMOVED: 'profile_picture_removed',
  BIO_UPDATED: 'bio_updated',
  DOSE_REMINDER_TIME_SET: 'dose_reminder_time_set',
  WORKOUT_REMINDER_TIME_SET: 'workout_reminder_time_set',
  REMINDER_OPTIMIZED_TOGGLED: 'reminder_optimized_toggled',

  // General
  APP_OPENED: 'app_opened',
  SCREEN_VIEWED: 'screen_viewed',
  TAB_SWITCHED: 'tab_switched',

  // Progress Charts
  NUTRITION_PROGRESS_VIEWED: 'nutrition_progress_viewed',
  PEPTIDE_PROGRESS_VIEWED: 'peptide_progress_viewed',
  CONSISTENCY_TREND_VIEWED: 'consistency_trend_viewed',
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
