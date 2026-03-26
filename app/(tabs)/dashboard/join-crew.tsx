/**
 * Join Crew screen.
 *
 * Route params:
 *   inviteCode? — pre-filled from deep link (pepmax://crew/join/{code})
 *
 * Behaviour:
 * - If inviteCode param present: auto-lookups crew, shows preview card.
 * - If no code: shows TextInput for manual entry + "Look Up" button.
 * - "Join" button calls joinCrew from crewService.
 * - Success → replace to crew-detail with crewId param.
 * - Error handling: invalid code, full crew, already a member.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../src/services/firebase/index';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { joinCrew, getCrewById } from '../../../src/services/crewService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { CrewDoc, CrewInviteCodeDoc } from '../../../src/types/social';

// ─── Crew preview card ────────────────────────────────────────────────────────

function CrewPreviewCard({
  crew,
  colors,
}: {
  crew: CrewDoc;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.previewEmoji}>{crew.avatarEmoji}</Text>
      <View style={styles.previewInfo}>
        <Text style={[styles.previewName, { color: colors.textPrimary }]}>{crew.name}</Text>
        <Text style={[styles.previewMembers, { color: colors.textSecondary }]}>
          {crew.memberUids.length} / 10 members
        </Text>
      </View>
      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function JoinCrewScreen() {
  const { inviteCode: paramCode } = useLocalSearchParams<{ inviteCode?: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const [codeInput, setCodeInput] = useState(paramCode ?? '');
  const [previewCrew, setPreviewCrew] = useState<CrewDoc | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [joining, setJoining] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // ── Crew preview lookup ─────────────────────────────────────────────────────

  const lookUpCrew = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setLookupError('Please enter an invite code.');
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setPreviewCrew(null);
    setJoinError(null);

    try {
      // Resolve invite code → crewId
      const codeSnap = await getDoc(doc(db, 'crewInviteCodes', trimmed));
      if (!codeSnap.exists()) {
        setLookupError('Invalid invite code. Please check and try again.');
        return;
      }
      const codeData = codeSnap.data() as CrewInviteCodeDoc;

      // Fetch crew for preview
      const crewResult = await getCrewById(codeData.crewId);
      if (crewResult.error || !crewResult.data) {
        setLookupError('This crew no longer exists.');
        return;
      }
      setPreviewCrew(crewResult.data);
    } catch {
      setLookupError('Failed to look up invite code. Please try again.');
    } finally {
      setLookingUp(false);
    }
  }, []);

  // Auto-lookup when a code comes in from deep link
  useEffect(() => {
    if (paramCode) {
      setCodeInput(paramCode);
      lookUpCrew(paramCode);
    }
  }, [paramCode, lookUpCrew]);

  // ── Join ───────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;

    setJoining(true);
    setJoinError(null);

    const result = await joinCrew(trimmed);

    if (result.error) {
      setJoinError(result.error.message);
      setJoining(false);
      return;
    }

    analytics.track(AnalyticsEvent.CREW_JOINED);

    // Navigate to crew-detail; replace so back button doesn't return here
    router.replace({
      pathname: '/(tabs)/dashboard/crew-detail',
      params: { crewId: result.data! },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Illustration / header ──────────────────────────────────────── */}
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: '#10B98122' }]}>
            <Ionicons name="shield-half-outline" size={40} color="#10B981" />
          </View>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Join a Crew</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Enter an invite code to find and join a crew.
          </Text>
        </View>

        {/* ── Code input ────────────────────────────────────────────────── */}
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.codeInput,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: lookupError ? '#EF4444' : colors.border,
              },
            ]}
            value={codeInput}
            onChangeText={(t) => {
              setCodeInput(t.toUpperCase());
              setLookupError(null);
              setPreviewCrew(null);
              setJoinError(null);
            }}
            placeholder="ABCD1234"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            returnKeyType="search"
            onSubmitEditing={() => lookUpCrew(codeInput)}
          />
          <TouchableOpacity
            style={[styles.lookupBtn, { backgroundColor: Colors.accent }]}
            onPress={() => lookUpCrew(codeInput)}
            disabled={lookingUp || !codeInput.trim()}
            activeOpacity={0.7}
          >
            {lookingUp ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.lookupBtnText}>Look Up</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Lookup error ─────────────────────────────────────────────── */}
        {lookupError && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{lookupError}</Text>
          </View>
        )}

        {/* ── Crew preview ──────────────────────────────────────────────── */}
        {previewCrew && (
          <>
            <Text style={[styles.foundLabel, { color: '#10B981' }]}>Crew found!</Text>
            <CrewPreviewCard crew={previewCrew} colors={colors} />
          </>
        )}

        {/* ── Join error ────────────────────────────────────────────────── */}
        {joinError && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{joinError}</Text>
          </View>
        )}

        {/* ── Join button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.joinBtn,
            {
              backgroundColor: previewCrew ? '#10B981' : colors.surface,
              borderColor: previewCrew ? '#10B981' : colors.border,
              opacity: !previewCrew || joining ? 0.6 : 1,
            },
          ]}
          onPress={handleJoin}
          disabled={!previewCrew || joining}
          activeOpacity={0.7}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.joinBtnText, { color: previewCrew ? '#fff' : colors.textSecondary }]}>
              Join Crew
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  lookupBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 84,
  },
  lookupBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  foundLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  previewEmoji: {
    fontSize: 34,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewMembers: {
    fontSize: 13,
    marginTop: 2,
  },
  joinBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
