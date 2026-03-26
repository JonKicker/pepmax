/**
 * Choose Username screen — lets users claim a unique handle.
 *
 * Flow:
 * 1. User types a username (live format validation as they type)
 * 2. "Check availability" does a Firestore read (with debounce)
 * 3. "Confirm" runs claimUsername transaction
 * 4. On success: refreshProfile + navigate back to profile settings
 *
 * Shows existing username + 30-day cooldown remaining when the user
 * already has a username.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  validateUsername,
  checkUsernameAvailability,
  claimUsername,
  releaseUsername,
} from '../../../src/services/usernameService';
import { upsertPublicProfile } from '../../../src/services/publicProfileService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { getTierForXP } from '../../../src/utils/rankTier';
import * as Haptics from 'expo-haptics';

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChooseUsernameScreen() {
  const { colors } = useTheme();
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const router = useRouter();

  const [input, setInput] = useState('');
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [isValidFormat, setIsValidFormat] = useState(false);

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<
    'available' | 'taken' | 'unchecked'
  >('unchecked');

  const [claiming, setClaiming] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cooldown calculation ────────────────────────────────────────────────────
  const lastChanged = userProfile?.lastUsernameChangeAt;
  const cooldownMs = 30 * 24 * 60 * 60 * 1000;
  const daysLeft = lastChanged
    ? Math.max(
        0,
        Math.ceil(
          (cooldownMs - (Date.now() - lastChanged.toMillis())) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;
  const onCooldown = daysLeft > 0 && !!userProfile?.username;

  // ── Live format validation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!input) {
      setValidationMsg(null);
      setIsValidFormat(false);
      setAvailabilityResult('unchecked');
      return;
    }

    const result = validateUsername(input);
    if (!result.valid) {
      setValidationMsg(result.reason);
      setIsValidFormat(false);
      setAvailabilityResult('unchecked');
    } else {
      setValidationMsg(null);
      setIsValidFormat(true);
    }
  }, [input]);

  // ── Debounced availability check ───────────────────────────────────────────
  const checkAvailability = useCallback(() => {
    if (!isValidFormat || !input) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCheckingAvailability(true);
      setAvailabilityResult('unchecked');
      const result = await checkUsernameAvailability(input);
      setCheckingAvailability(false);
      if (result.error) {
        setAvailabilityResult('unchecked');
        return;
      }
      setAvailabilityResult(result.data ? 'available' : 'taken');
    }, 600);
  }, [input, isValidFormat]);

  // ── Claim handler ──────────────────────────────────────────────────────────
  async function handleClaim() {
    if (availabilityResult !== 'available' || claiming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setClaiming(true);

    try {
      const claimResult = await claimUsername(input);
      if (claimResult.error) {
        Alert.alert('Could not claim username', claimResult.error.message);
        return;
      }

      // Create / update public profile.
      // If this fails after a successful claimUsername transaction, the user
      // has a claimed username with no public profile — surface the error and
      // attempt cleanup (release the username) to avoid a silent desync.
      const uid = currentUser?.uid;
      if (uid && userProfile) {
        const tier = getTierForXP(userProfile.gamification?.totalXP ?? 0).tier;
        const upsertResult = await upsertPublicProfile({
          uid,
          username: input.trim().toLowerCase(),
          displayHandle: input.trim().toLowerCase(),
          totalXP: userProfile.gamification?.totalXP ?? 0,
          level: userProfile.gamification?.level ?? 1,
          tier,
          featuredStat: userProfile.featuredStat ?? 'totalXP',
          topAchievementIds: userProfile.topAchievementIds ?? [],
          leaderboardOptOut: userProfile.leaderboardOptOut ?? false,
        });

        if (upsertResult.error) {
          // claimUsername succeeded but public profile creation failed.
          // Attempt to release the username so the user isn't stuck in a
          // partial state. Best-effort — we surface the original error
          // regardless of whether cleanup succeeds.
          releaseUsername().catch(() => {});
          Alert.alert(
            'Username not saved',
            'Your username was reserved but your public profile could not be created. Please try again.',
          );
          return;
        }
      }

      // username is public data (visible on leaderboards) — not PII.
      // Intentionally included in the analytics event for funnel tracking.
      analytics.track(AnalyticsEvent.USERNAME_CLAIMED, { username: input.trim().toLowerCase() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshProfile();
      router.back();
    } finally {
      setClaiming(false);
    }
  }

  // ── Release handler ────────────────────────────────────────────────────────
  function handleRelease() {
    Alert.alert(
      'Release Username',
      `Release @${userProfile?.username}? You will not be able to choose a new username for 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setReleasing(true);
            try {
              const result = await releaseUsername();
              if (result.error) {
                Alert.alert('Error', result.error.message);
                return;
              }
              analytics.track(AnalyticsEvent.USERNAME_RELEASED);
              await refreshProfile();
            } finally {
              setReleasing(false);
            }
          },
        },
      ],
    );
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const canClaim =
    isValidFormat && availabilityResult === 'available' && !onCooldown;

  function renderAvailabilityBadge() {
    if (checkingAvailability) {
      return <ActivityIndicator size="small" color={colors.textSecondary} />;
    }
    if (availabilityResult === 'available') {
      return (
        <View style={styles.availRow}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
          <Text style={[styles.availText, { color: Colors.light.success }]}>Available</Text>
        </View>
      );
    }
    if (availabilityResult === 'taken') {
      return (
        <View style={styles.availRow}>
          <Ionicons name="close-circle" size={16} color={Colors.error} />
          <Text style={[styles.availText, { color: Colors.error }]}>Already taken</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Choose Your Username
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your username is your public identity on leaderboards. You can change it
        once every 30 days.
      </Text>

      {/* ── Current username card ─────────────────────────────────────── */}
      {userProfile?.username && (
        <View style={[styles.currentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.currentRow}>
            <Ionicons name="at-outline" size={18} color={Colors.accent} />
            <Text style={[styles.currentUsername, { color: colors.textPrimary }]}>
              {userProfile.username}
            </Text>
            <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
              current
            </Text>
          </View>
          {onCooldown && (
            <Text style={[styles.cooldownText, { color: colors.textSecondary }]}>
              {daysLeft} day{daysLeft === 1 ? '' : 's'} until you can change it
            </Text>
          )}
          {!onCooldown && (
            <TouchableOpacity
              style={[styles.releaseBtn, { borderColor: Colors.error }]}
              onPress={handleRelease}
              disabled={releasing}
              activeOpacity={0.7}
            >
              {releasing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Text style={[styles.releaseBtnText, { color: Colors.error }]}>
                  Release username
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Username input ────────────────────────────────────────────── */}
      {(!userProfile?.username || !onCooldown) && (
        <>
          <View
            style={[
              styles.inputWrapper,
              {
                borderColor:
                  availabilityResult === 'available'
                    ? Colors.light.success
                    : availabilityResult === 'taken'
                    ? Colors.error
                    : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.atSymbol, { color: colors.textSecondary }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                setAvailabilityResult('unchecked');
              }}
              placeholder="your_handle"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            <View style={styles.badgeSlot}>{renderAvailabilityBadge()}</View>
          </View>

          {/* Validation message */}
          {validationMsg && (
            <Text style={[styles.errorText, { color: Colors.error }]}>
              {validationMsg}
            </Text>
          )}

          {/* Check availability button */}
          {isValidFormat && availabilityResult === 'unchecked' && !checkingAvailability && (
            <TouchableOpacity
              style={[styles.checkBtn, { borderColor: Colors.accent }]}
              onPress={checkAvailability}
              activeOpacity={0.7}
            >
              <Text style={[styles.checkBtnText, { color: Colors.accent }]}>
                Check availability
              </Text>
            </TouchableOpacity>
          )}

          {/* Rules hint */}
          <Text style={[styles.rulesHint, { color: colors.textSecondary }]}>
            3–20 characters · letters, numbers, underscores · no leading/trailing underscores
          </Text>

          {/* Claim button */}
          <TouchableOpacity
            style={[
              styles.claimBtn,
              {
                backgroundColor: canClaim ? Colors.accent : colors.border,
              },
            ]}
            onPress={handleClaim}
            disabled={!canClaim || claiming}
            activeOpacity={0.7}
          >
            {claiming ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text
                style={[
                  styles.claimBtnText,
                  { color: canClaim ? '#FFF' : colors.textSecondary },
                ]}
              >
                Claim @{input || 'username'}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 24,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  currentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentUsername: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  currentLabel: {
    fontSize: 12,
  },
  cooldownText: {
    fontSize: 13,
  },
  releaseBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  releaseBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  atSymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  badgeSlot: {
    minWidth: 90,
    alignItems: 'flex-end',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    marginTop: -6,
  },
  checkBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rulesHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  claimBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
