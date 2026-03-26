/**
 * Morning Check-In — quick subjective input screen for recovery scoring.
 * Takes <10 seconds: feeling rating (required) + optional stress + optional notes.
 * Auto-fetches HealthKit sleep data on mount.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../src/hooks/useTheme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Colors } from '../../../src/constants/theme';
import { ScoreGauge } from '../../../src/components/recovery/ScoreGauge';
import { computeAndSaveRecoveryScore } from '../../../src/services/recoveryScoreService';
import { fetchSleepData } from '../../../src/services/healthKitService';
import { isHKEnabled } from '../../../src/utils/hkEnabled';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { RecoveryScoreResult } from '../../../src/types/recoveryScore';

const FEELING_EMOJIS = ['😫', '😕', '😐', '🙂', '😄'];
const FEELING_LABELS = ['Terrible', 'Poor', 'OK', 'Good', 'Great'];
const STRESS_OPTIONS = [
  { label: 'Low', value: 1 },
  { label: 'Medium', value: 2 },
  { label: 'High', value: 3 },
];

export default function MorningCheckInScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [feelingRating, setFeelingRating] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RecoveryScoreResult | null>(null);
  const [hkSleepBadge, setHkSleepBadge] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const submittingRef = useRef(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup nav timer on unmount (Ray blocking item #2 / non-blocking #5)
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // Auto-fetch HealthKit sleep on mount
  useEffect(() => {
    if (isHKEnabled()) {
      fetchSleepData(toLocalDateKey())
        .then((sleep) => {
          if (sleep) setHkSleepBadge(true);
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async () => {
    if (feelingRating == null || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      const res = await computeAndSaveRecoveryScore(
        {
          feelingRating,
          stress: stress ?? undefined,
          notes: notes.trim() || undefined,
        },
        userProfile ?? null,
      );
      if (res.error) {
        Alert.alert('Could not save', 'Please try again.');
        submittingRef.current = false;
      } else if (res.data) {
        setResult(res.data);
        analytics.track(AnalyticsEvent.RECOVERY_CHECK_IN_COMPLETED, {
          score: res.data.score,
          zone: res.data.zone,
          feeling_rating: feelingRating,
        });
        navTimerRef.current = setTimeout(() => router.back(), 1500);
      }
    } catch {
      Alert.alert('Could not save', 'Please try again.');
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (skipCount === 0) {
      setSkipCount(1);
      return;
    }
    try {
      await AsyncStorage.setItem(`recovery_dismissed_${toLocalDateKey()}`, '1');
      analytics.track(AnalyticsEvent.RECOVERY_CHECK_IN_SKIPPED);
    } catch {
      // Non-fatal
    }
    router.back();
  };

  // Show result state
  if (result) {
    return (
      <View style={[styles.resultContainer, { backgroundColor: colors.background }]}>
        <ScoreGauge score={result.score} size={160} strokeWidth={14} colors={colors} />
        <Text style={[styles.resultRec, { color: colors.textSecondary }]}>
          {result.recommendations[0] ?? ''}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.header, { color: colors.textPrimary }]}>
        Good morning — how are you feeling?
      </Text>

      {hkSleepBadge && (
        <View style={styles.hkBadge}>
          <Text style={styles.hkBadgeText}>Apple Health sleep data detected</Text>
        </View>
      )}

      {/* Feeling Rating — 5 emoji buttons */}
      <View style={styles.emojiRow}>
        {FEELING_EMOJIS.map((emoji, i) => {
          const val = i + 1;
          const selected = feelingRating === val;
          return (
            <TouchableOpacity
              key={val}
              style={[
                styles.emojiBtn,
                {
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent + '15' : 'transparent',
                },
              ]}
              onPress={() => setFeelingRating(val)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <Text
                style={[
                  styles.emojiLabel,
                  { color: selected ? Colors.accent : colors.textSecondary },
                ]}
              >
                {FEELING_LABELS[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stress Level — optional pills */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Stress Level (optional)
      </Text>
      <View style={styles.pillRow}>
        {STRESS_OPTIONS.map((opt) => {
          const selected = stress === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.pill,
                {
                  borderColor: selected ? Colors.accent : colors.border,
                  backgroundColor: selected ? Colors.accent + '15' : 'transparent',
                },
              ]}
              onPress={() => setStress(selected ? null : opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: selected ? Colors.accent : colors.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notes — optional */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Notes (optional)
      </Text>
      <TextInput
        style={[
          styles.notesInput,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
          },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything worth noting..."
        placeholderTextColor={colors.textSecondary}
        maxLength={500}
        returnKeyType="done"
      />

      {skipCount === 1 && (
        <Text style={[styles.nagText, { color: colors.textSecondary }]}>
          Checking in helps optimize your training recommendations
        </Text>
      )}

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.border }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: Colors.accent,
              opacity: feelingRating == null || saving ? 0.5 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={feelingRating == null || saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  hkBadge: {
    alignSelf: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  hkBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  emojiBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 56,
  },
  emoji: {
    fontSize: 28,
  },
  emojiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
    marginBottom: 16,
  },
  nagText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  resultRec: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
