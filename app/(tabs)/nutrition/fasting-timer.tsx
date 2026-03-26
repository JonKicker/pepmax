import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useFastingTimer } from '../../../src/hooks/useFastingTimer';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { GlassBackground } from '../../../src/components/GlassBackground';

// ─── Circular progress ring ───────────────────────────────────────────────────

const RING_SIZE = 240;
const RING_THICKNESS = 16;
const RADIUS = (RING_SIZE - RING_THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({
  progress,
  isFasting,
  children,
}: {
  progress: number;
  isFasting: boolean;
  children: React.ReactNode;
}) {
  const strokeColor = isFasting ? Colors.nutrition : Colors.nutrition;
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={ringStyles.svg}>
        {/* Track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={RING_THICKNESS}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={strokeColor}
          strokeWidth={RING_THICKNESS}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={ringStyles.center}>{children}</View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: 'center',
    marginVertical: 24,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});

// ─── Time formatter ──────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function formatElapsed(totalMs: number, remainingMs: number): string {
  const elapsedMs = totalMs - remainingMs;
  const totalHours = Math.round(totalMs / 3600000);
  const elapsedH = Math.floor(elapsedMs / 3600000);
  const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
  return `${elapsedH}h ${String(elapsedM).padStart(2, '0')}m of ${totalHours}h complete`;
}

function formatDisplayTime(hhmm: string): string {
  if (!hhmm) return '';
  const parts = hhmm.split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const minute = parts[1] ?? '00';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${h}:${minute} ${period}`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function FastingTimerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { timerData, config, loading, weeklyCompletionCount, hasBrokenToday, breakFast, markFastComplete, refreshConfig } = useFastingTimer();

  useEffect(() => {
    analytics.track(AnalyticsEvent.FASTING_TIMER_VIEWED);
  }, []);

  const handleBreakFast = () => {
    Alert.alert(
      'Break Fast?',
      'This will end your fasting window early. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Break Fast',
          style: 'destructive',
          onPress: async () => {
            analytics.track(AnalyticsEvent.FASTING_BREAK_FAST, {
              protocol: config?.protocol ?? 'unknown',
            });
            await breakFast();
            await refreshConfig();
          },
        },
      ],
    );
  };

  const handleMarkComplete = async () => {
    // Deduplication, XP award, and onActionCompleted are all handled inside
    // markFastComplete (useFastingTimer) — no direct service calls needed here.
    await markFastComplete();
    analytics.track(AnalyticsEvent.FASTING_WINDOW_COMPLETED, {
      protocol: config?.protocol ?? 'unknown',
    });
    await refreshConfig();
  };

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.nutrition} size="large" />
        </View>
      </GlassBackground>
    );
  }

  // Unconfigured state
  if (!timerData || timerData.state === 'unconfigured') {
    return (
      <GlassBackground>
        <View style={styles.centered}>
          <Ionicons name="timer-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.unconfiguredTitle, { color: colors.textPrimary }]}>
            No fasting schedule set
          </Text>
          <Text style={[styles.unconfiguredSubtitle, { color: colors.textSecondary }]}>
            Set up your intermittent fasting protocol to start tracking your windows.
          </Text>
          <TouchableOpacity
            style={[styles.setupBtn, { backgroundColor: Colors.nutrition }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/nutrition/fasting-setup'); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Set up fasting schedule"
          >
            <Text style={styles.setupBtnText}>Set Up Fasting Schedule</Text>
          </TouchableOpacity>
        </View>
      </GlassBackground>
    );
  }

  const isFasting = timerData.state === 'fasting';
  const isEating = timerData.state === 'eating';

  return (
    <GlassBackground>
    <ScrollView
      contentContainerStyle={styles.scroll}
    >
      {/* Gear icon → setup */}
      <View style={styles.headerRow}>
        <Text style={[styles.protocolBadge, { color: Colors.nutrition, borderColor: Colors.nutrition + '44', backgroundColor: Colors.nutrition + '11' }]}>
          {timerData.protocolLabel}
        </Text>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/nutrition/fasting-setup'); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Fasting settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* State label */}
      <Text style={[styles.stateLabel, { color: isFasting ? Colors.nutrition : Colors.nutrition }]}>
        {isFasting ? 'Fasting' : 'Eating Window'}
      </Text>

      {/* Progress ring */}
      <ProgressRing progress={timerData.progress} isFasting={isFasting}>
        {isFasting ? (
          <>
            <Text style={[styles.ringMain, { color: colors.textPrimary }]}>
              {formatElapsed(timerData.totalDurationMs, timerData.timeRemainingMs)}
            </Text>
            <Text style={[styles.ringSub, { color: colors.textSecondary }]}>
              {formatDuration(timerData.timeRemainingMs)} remaining
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.ringMain, { color: colors.textPrimary }]}>
              Eating window
            </Text>
            <Text style={[styles.ringSub, { color: colors.textSecondary }]}>
              {formatDuration(timerData.timeRemainingMs)} remaining
            </Text>
          </>
        )}
      </ProgressRing>

      {/* Window times */}
      <View style={[styles.windowRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.windowItem}>
          <Ionicons name="enter-outline" size={18} color={Colors.nutrition} />
          <Text style={[styles.windowLabel, { color: colors.textSecondary }]}>Window opens</Text>
          <Text style={[styles.windowTime, { color: colors.textPrimary }]}>
            {formatDisplayTime(timerData.windowStart)}
          </Text>
        </View>
        <View style={[styles.windowDivider, { backgroundColor: colors.border }]} />
        <View style={styles.windowItem}>
          <Ionicons name="exit-outline" size={18} color={Colors.nutrition} />
          <Text style={[styles.windowLabel, { color: colors.textSecondary }]}>Window closes</Text>
          <Text style={[styles.windowTime, { color: colors.textPrimary }]}>
            {formatDisplayTime(timerData.windowEnd)}
          </Text>
        </View>
      </View>

      {/* Weekly streak */}
      <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="flame-outline" size={20} color={Colors.nutrition} />
        <Text style={[styles.streakText, { color: colors.textPrimary }]}>
          <Text style={{ fontWeight: '700', color: Colors.nutrition }}>{weeklyCompletionCount}</Text>
          {' '}of last 7 days within window
        </Text>
      </View>

      {/* Action buttons */}
      {isFasting && !hasBrokenToday && (
        <TouchableOpacity
          style={[styles.breakBtn, { borderColor: Colors.error, backgroundColor: Colors.error + '11' }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); handleBreakFast(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Break fast early"
        >
          <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
          <Text style={[styles.breakBtnText, { color: Colors.error }]}>Break Fast</Text>
        </TouchableOpacity>
      )}

      {isFasting && hasBrokenToday && (
        <View style={[styles.brokenBadge, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '44' }]}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={[styles.brokenBadgeText, { color: Colors.error }]}>Fast broken today</Text>
        </View>
      )}

      {isEating && (
        <TouchableOpacity
          style={[styles.completeBtn, { backgroundColor: Colors.nutrition }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleMarkComplete(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Mark fasting complete"
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.completeBtnText}>Mark Fasting Complete</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  protocolBadge: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stateLabel: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 0,
  },
  ringMain: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  ringSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  windowRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  windowItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  windowDivider: {
    width: 1,
  },
  windowLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  windowTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  streakText: {
    fontSize: 15,
  },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginBottom: 12,
  },
  breakBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  brokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 12,
  },
  brokenBadgeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  unconfiguredTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  unconfiguredSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  setupBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  setupBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
