/**
 * EventBanner — time-limited seasonal event banner.
 *
 * Shows event name, description, countdown, challenge count, bonus XP,
 * exclusive badge preview, and CTA to join or view progress.
 *
 * Urgency pulse (< 24h remaining): Reanimated opacity animation,
 * gated by useReducedMotion.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatTimeRemaining } from '../../utils/pvpLeagueUtils';
import { isUrgent } from '../../utils/pvpEventUtils';
import type { SeasonalEvent } from '../../types/pvpEvents';

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  event: SeasonalEvent;
  userJoined: boolean;
  onJoin: () => void;
  onViewDetails: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EventBanner({ event, userJoined, onJoin, onViewDetails }: Props) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const now = Date.now();
  const urgent = isUrgent(event.endDate, now);
  const timeRemaining = formatTimeRemaining(event.endDate, now);

  // Urgency pulse animation
  const urgencyOpacity = useSharedValue(1);

  useEffect(() => {
    if (urgent && !reducedMotion) {
      urgencyOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      urgencyOpacity.value = 1;
    }
  }, [urgent, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgencyStyle = useAnimatedStyle(() => ({
    opacity: urgencyOpacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: event.themeColor,
        },
      ]}
      accessibilityLabel={`Seasonal event: ${event.name}`}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.eventName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {event.name}
          </Text>
          <Text
            style={[styles.eventDescription, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        </View>

        {/* Bonus XP badge */}
        {event.bonusXPMultiplier > 1 && (
          <View style={[styles.xpBadge, { backgroundColor: event.themeColor + '33' }]}>
            <Text style={[styles.xpBadgeText, { color: event.themeColor }]}>
              {event.bonusXPMultiplier}x XP
            </Text>
          </View>
        )}
      </View>

      {/* Countdown + challenge count row */}
      <View style={styles.metaRow}>
        {/* Countdown timer */}
        <Animated.View style={[styles.countdownPill, urgent && urgencyStyle]}>
          <Ionicons
            name="time-outline"
            size={12}
            color={urgent ? URGENCY_RED : colors.textSecondary}
          />
          <Text
            style={[
              styles.countdownText,
              { color: urgent ? URGENCY_RED : colors.textSecondary },
            ]}
          >
            {timeRemaining}
          </Text>
        </Animated.View>

        {/* Challenge count pill */}
        <View style={[styles.challengePill, { backgroundColor: colors.glass?.heavy ?? 'rgba(255,255,255,0.06)' }]}>
          <Text style={[styles.challengePillText, { color: colors.textSecondary }]}>
            {event.challenges.length} challenge{event.challenges.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Exclusive badge preview */}
      {event.exclusiveBadgeId && (
        <View style={[styles.badgePreview, { borderColor: colors.glass?.border ?? 'rgba(255,255,255,0.1)' }]}>
          <Ionicons name="lock-closed-outline" size={14} color={event.themeColor} />
          <Text style={[styles.badgePreviewText, { color: colors.textSecondary }]}>
            Exclusive badge: <Text style={{ color: event.themeColor }}>{event.exclusiveBadgeId}</Text>
          </Text>
        </View>
      )}

      {/* CTA */}
      {userJoined ? (
        <TouchableOpacity
          style={[styles.viewProgressButton, { borderColor: event.themeColor }]}
          onPress={onViewDetails}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="View your progress in this event"
        >
          <Text style={[styles.viewProgressText, { color: event.themeColor }]}>
            View Progress
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: colors.accent ?? CARD_ACCENT }]}
          onPress={onJoin}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Join the ${event.name} event`}
        >
          <Text style={styles.joinButtonText}>Join Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Urgency red: not in theme (it's a semantic alert color, not a brand color).
// Must stay red regardless of theme to convey danger/urgency — same as
// accessibility-standard "caution" indicators in the rest of the app.
const URGENCY_RED = '#E17055';

// Fallback accent for the join button when theme.accent is not set.
const CARD_ACCENT = '#6C5CE7';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  eventName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  eventDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  xpBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '700',
  },
  challengePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  challengePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgePreviewText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  viewProgressButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewProgressText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
