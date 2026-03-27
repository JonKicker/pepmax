/**
 * SeasonBanner — horizontal banner showing current season info.
 *
 * Shows: season name/number, time remaining (red pulse if < 24h), progress stats,
 * claim reward button (if completed + unclaimed), or reward tier badge (if claimed).
 *
 * useReducedMotion() disables urgency pulse when system setting is on.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../GlassCard';
import { GradientButton } from '../GradientButton';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { SeasonDoc, UserSeasonProgress, SeasonRewardTier } from '../../types/pvp';

// ─── Reward tier display config ───────────────────────────────────────────────

const REWARD_CONFIG: Record<SeasonRewardTier, { label: string; icon: string; color: string }> = {
  legendary:    { label: 'Legendary',    icon: 'flame',          color: '#FF6B6B' },
  epic:         { label: 'Epic',         icon: 'diamond',        color: '#B9F2FF' },
  rare:         { label: 'Rare',         icon: 'shield',         color: '#FFD700' },
  participation: { label: 'Participation', icon: 'ribbon-outline', color: '#C0C0C0' },
};

// ─── Urgency threshold ────────────────────────────────────────────────────────

const URGENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  season: SeasonDoc;
  progress: UserSeasonProgress | null;
  timeRemaining: string;
  onClaimReward?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SeasonBanner({ season, progress, timeRemaining, onClaimReward }: Props) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const isCompleted = season.status === 'completed';
  const rewardClaimed = !!progress?.claimedAt;
  const claimedTier = progress?.rewardTier;
  const showClaimButton = isCompleted && !rewardClaimed && !!onClaimReward;
  const showClaimedBadge = isCompleted && rewardClaimed && claimedTier;

  // Urgency pulse: red opacity throb when < 24h remaining
  const urgentOpacity = useSharedValue(1);
  const isUrgent = !isCompleted && (season.endDate - Date.now()) < URGENT_THRESHOLD_MS;

  useEffect(() => {
    if (isUrgent && !reducedMotion) {
      urgentOpacity.value = withRepeat(
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(urgentOpacity);
      urgentOpacity.value = withTiming(1, { duration: 200 });
    }
    return () => {
      cancelAnimation(urgentOpacity);
    };
  }, [isUrgent, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgentStyle = useAnimatedStyle(() => ({
    opacity: urgentOpacity.value,
  }));

  return (
    <GlassCard style={styles.banner} padding={12}>
      <View style={styles.row}>
        {/* Left: season name + progress */}
        <View style={styles.left}>
          <Text style={[styles.seasonName, { color: colors.textPrimary }]} numberOfLines={1}>
            {season.name}
          </Text>
          {progress && (
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              RP: {progress.totalRP} · Peak: {progress.peakRP} · {progress.peakTier.charAt(0).toUpperCase() + progress.peakTier.slice(1)}
            </Text>
          )}
        </View>

        {/* Right: time remaining or status */}
        <View style={styles.right}>
          {!isCompleted ? (
            <Animated.View style={[styles.timeContainer, urgentStyle]}>
              <Ionicons
                name="time-outline"
                size={13}
                color={isUrgent ? '#FF3C3C' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.timeText,
                  { color: isUrgent ? '#FF3C3C' : colors.textSecondary },
                ]}
              >
                {timeRemaining}
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                Season Ended
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Claim reward button */}
      {showClaimButton && (
        <GradientButton
          label="Claim Season Reward"
          onPress={onClaimReward!}
          icon="gift-outline"
          pulse
          style={styles.claimButton}
        />
      )}

      {/* Claimed reward badge */}
      {showClaimedBadge && claimedTier && (
        <View style={styles.claimedRow}>
          <Ionicons
            name={REWARD_CONFIG[claimedTier].icon as any}
            size={14}
            color={REWARD_CONFIG[claimedTier].color}
          />
          <Text style={[styles.claimedText, { color: REWARD_CONFIG[claimedTier].color }]}>
            {REWARD_CONFIG[claimedTier].label} Reward Claimed
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
  seasonName: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  claimButton: {
    marginTop: 10,
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  claimedText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
