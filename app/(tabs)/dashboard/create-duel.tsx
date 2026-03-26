/**
 * create-duel — multi-step duel creation wizard.
 *
 * Step 1: Select friend from friends list
 * Step 2: Pick metric (4 radio buttons with icons)
 * Step 3: Pick duration (1 week / 2 weeks toggle)
 * Step 4: Review summary + "Send Challenge" button
 *
 * On success: navigates to duel-detail with the new duel ID.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../../../src/hooks/useFriends';
import { createDuel } from '../../../src/services/duelService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { FriendDoc } from '../../../src/types/social';
import type { DuelMetric } from '../../../src/types/challenges';

// ─── Constants ────────────────────────────────────────────────────────────────

const SURFACE = '#1E1E2E';
const SURFACE2 = '#252535';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A0A0B8';
const BORDER = '#2E2E42';
const ACCENT = '#6C5CE7';
const GREEN = '#00B894';
const BG = '#12121F';

const METRICS: { value: DuelMetric; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'volume_lifted', label: 'Volume Lifted', icon: 'barbell-outline', description: 'Total kg lifted in workouts' },
  { value: 'distance_run', label: 'Distance Run', icon: 'walk-outline', description: 'Total km covered in cardio' },
  { value: 'days_on_plan', label: 'Days On Plan', icon: 'calendar-outline', description: 'Days with meals logged' },
  { value: 'xp_earned', label: 'XP Earned', icon: 'star-outline', description: 'Total XP earned from any activity' },
];

// ─── Step header component ────────────────────────────────────────────────────

function StepHeader({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepHeader}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i + 1 === current ? styles.stepDotActive : i + 1 < current ? styles.stepDotDone : null]}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateDuelScreen() {
  const router = useRouter();
  const { friends, loading: friendsLoading } = useFriends();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFriend, setSelectedFriend] = useState<FriendDoc | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<DuelMetric | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: select friend ──────────────────────────────────────────────────

  function renderStep1() {
    if (friendsLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator color={ACCENT} />
        </View>
      );
    }

    if (friends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={TEXT_SECONDARY} />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Add friends to challenge them to a duel</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={friends}
        keyExtractor={(f) => f.friendUid}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const selected = selectedFriend?.friendUid === item.friendUid;
          return (
            <TouchableOpacity
              style={[styles.friendRow, selected && styles.friendRowSelected]}
              onPress={() => setSelectedFriend(item)}
              activeOpacity={0.7}
            >
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>
                  {item.friendUsername.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.friendUsername}>{item.friendUsername}</Text>
              {selected && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  // ── Step 2: pick metric ────────────────────────────────────────────────────

  function renderStep2() {
    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.sectionTitle}>Choose a metric to compete on:</Text>
        {METRICS.map((m) => {
          const selected = selectedMetric === m.value;
          return (
            <TouchableOpacity
              key={m.value}
              style={[styles.metricRow, selected && styles.metricRowSelected]}
              onPress={() => setSelectedMetric(m.value)}
              activeOpacity={0.7}
            >
              <View style={[styles.metricIcon, selected && styles.metricIconSelected]}>
                <Ionicons name={m.icon} size={22} color={selected ? '#FFF' : TEXT_SECONDARY} />
              </View>
              <View style={styles.metricText}>
                <Text style={[styles.metricLabel, selected && styles.metricLabelSelected]}>
                  {m.label}
                </Text>
                <Text style={styles.metricDescription}>{m.description}</Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={20} color={ACCENT} style={styles.metricCheck} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // ── Step 3: pick duration ──────────────────────────────────────────────────

  function renderStep3() {
    return (
      <View style={styles.durationSection}>
        <Text style={styles.sectionTitle}>How long should the duel last?</Text>
        <View style={styles.durationToggle}>
          {([1, 2] as const).map((weeks) => (
            <TouchableOpacity
              key={weeks}
              style={[styles.durationOption, selectedDuration === weeks && styles.durationOptionSelected]}
              onPress={() => setSelectedDuration(weeks)}
              activeOpacity={0.7}
            >
              <Text style={[styles.durationLabel, selectedDuration === weeks && styles.durationLabelSelected]}>
                {weeks} {weeks === 1 ? 'Week' : 'Weeks'}
              </Text>
              <Text style={[styles.durationSub, selectedDuration === weeks && styles.durationSubSelected]}>
                {weeks === 1 ? '7 days' : '14 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── Step 4: review summary ─────────────────────────────────────────────────

  function renderStep4() {
    const metricInfo = METRICS.find((m) => m.value === selectedMetric);
    return (
      <ScrollView contentContainerStyle={styles.reviewContent}>
        <Text style={styles.sectionTitle}>Review your challenge:</Text>
        <View style={styles.summaryCard}>
          <SummaryRow
            icon="person-outline"
            label="Opponent"
            value={selectedFriend?.friendUsername ?? ''}
          />
          <SummaryRow
            icon={metricInfo?.icon ?? 'star-outline'}
            label="Metric"
            value={metricInfo?.label ?? ''}
          />
          <SummaryRow
            icon="time-outline"
            label="Duration"
            value={`${selectedDuration} ${selectedDuration === 1 ? 'week' : 'weeks'}`}
          />
        </View>
        <Text style={styles.reviewNote}>
          Once sent, {selectedFriend?.friendUsername} will need to accept the challenge before it begins.
        </Text>
      </ScrollView>
    );
  }

  function SummaryRow({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.summaryRow}>
        <View style={styles.summaryIcon}>
          <Ionicons name={icon} size={16} color={ACCENT} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    );
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 1) return selectedFriend !== null;
    if (step === 2) return selectedMetric !== null;
    if (step === 3) return true;
    return true;
  }

  function handleNext() {
    if (step < 4) {
      setStep((s) => (s + 1) as typeof step);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => (s - 1) as typeof step);
    } else {
      router.back();
    }
  }

  async function handleSend() {
    if (!selectedFriend || !selectedMetric) return;
    setSubmitting(true);
    try {
      const result = await createDuel(selectedFriend.friendUid, selectedMetric, selectedDuration);
      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }
      analytics.track(AnalyticsEvent.DUEL_CREATED, {
        metric: selectedMetric,
        durationWeeks: selectedDuration,
      });
      router.replace({
        pathname: '/(tabs)/dashboard/duel-detail',
        params: { duelId: result.data },
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const stepTitles = ['Select Opponent', 'Choose Metric', 'Set Duration', 'Review'];

  return (
    <SafeAreaView style={styles.screen}>
      {/* Title */}
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{stepTitles[step - 1]}</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepHeader current={step} total={4} />

      {/* Content */}
      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        {step < 4 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canAdvance() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canAdvance()}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, submitting && styles.nextButtonDisabled]}
            onPress={handleSend}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="flash-outline" size={18} color="#FFF" />
                <Text style={styles.sendButtonText}>Send Challenge</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BORDER,
  },
  stepDotActive: {
    backgroundColor: ACCENT,
    width: 20,
    borderRadius: 4,
  },
  stepDotDone: {
    backgroundColor: GREEN,
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // Friend rows
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  friendRowSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '18',
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '700',
  },
  friendUsername: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  // Metric rows
  sectionTitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  metricRowSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '18',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconSelected: {
    backgroundColor: ACCENT,
  },
  metricText: {
    flex: 1,
  },
  metricLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricLabelSelected: {
    color: ACCENT,
  },
  metricDescription: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  metricCheck: {
    marginLeft: 4,
  },
  // Duration toggle
  durationSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  durationToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  durationOption: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BORDER,
  },
  durationOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '18',
  },
  durationLabel: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  durationLabelSelected: {
    color: ACCENT,
  },
  durationSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  durationSubSelected: {
    color: ACCENT,
  },
  // Review
  reviewContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    flex: 1,
  },
  summaryValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewNote: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  // Bottom bar
  bottomBar: {
    padding: 16,
    paddingBottom: 24,
  },
  nextButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sendButton: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
