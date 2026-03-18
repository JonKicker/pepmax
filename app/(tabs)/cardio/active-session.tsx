import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import { useCardioSession } from '../../../src/hooks/useCardioSession';
import { useAudioCues } from '../../../src/hooks/useAudioCues';
import {
  formatDuration,
  formatDistance,
  formatPace,
} from '../../../src/utils/cardio';
import type { Split } from '../../../src/types/cardio';

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  colors,
  large,
}: {
  label: string;
  value: string;
  colors: any;
  large?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, large && styles.statValueLarge, { color: colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Split row ────────────────────────────────────────────────────────────────

function SplitRow({ split, unit, colors }: { split: Split; unit: 'mi' | 'km'; colors: any }) {
  return (
    <View style={[styles.splitRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.splitNum, { color: colors.textSecondary }]}>{split.splitNumber}</Text>
      <Text style={[styles.splitCell, { color: colors.textPrimary }]}>
        {formatDistance(split.distance, unit)}
      </Text>
      <Text style={[styles.splitCell, { color: colors.textPrimary }]}>
        {formatDuration(split.time)}
      </Text>
      <Text style={[styles.splitCell, { color: Colors.cardio }]}>
        {formatPace(split.pace, unit)}
      </Text>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ActiveSessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { userProfile } = useAuth();
  const { settings } = useCardioSettings();

  const weightKg = userProfile?.weightKg ?? 75;
  const distanceUnit = settings.distanceUnit;

  const {
    session,
    status,
    elapsedActive,
    distance,
    currentPace,
    averagePace,
    calories,
    splits,
    elevationGain,
    newSplit,
    start,
    pause,
    resume,
    stop,
    abandon,
  } = useCardioSession(sessionId, weightKg, settings, distanceUnit);

  // Option A: call start() only after session loads (Ray's required fix)
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (session && !hasStartedRef.current) {
      hasStartedRef.current = true;
      start();
    }
  }, [session]);

  // Audio cues
  useAudioCues(distance, elapsedActive, currentPace, distanceUnit);

  const [stopModalVisible, setStopModalVisible] = useState(false);
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopModalVisible(false);
    setStopping(true);
    await stop();
    setStopping(false);
    router.replace({
      pathname: '/(tabs)/cardio/session-summary',
      params: { sessionId },
    });
  };

  const handleAbandon = () => {
    Alert.alert(
      'Abandon Session',
      'This session will not be saved. Are you sure?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandon();
            router.replace('/(tabs)/cardio');
          },
        },
      ]
    );
  };

  // Loading state before session doc arrives
  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.cardio} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Starting session…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSwim = session.activityType === 'swim';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* New split banner */}
      {newSplit && (
        <View style={[styles.splitBanner, { backgroundColor: Colors.cardio }]}>
          <Text style={styles.splitBannerText}>
            Split {newSplit.splitNumber} — {formatPace(newSplit.pace, distanceUnit)}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Primary stat */}
        <View style={[styles.primaryStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.primaryValue, { color: colors.textPrimary }]}>
            {formatDuration(elapsedActive)}
          </Text>
          <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>Elapsed Time</Text>
        </View>

        {/* Secondary stats grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isSwim ? (
            <>
              <StatTile label="Laps" value={String(session.lapCount ?? 0)} colors={colors} />
              <StatTile label="Distance" value={formatDistance(distance, distanceUnit)} colors={colors} />
            </>
          ) : (
            <>
              <StatTile label="Distance" value={formatDistance(distance, distanceUnit)} colors={colors} />
              <StatTile label="Pace" value={formatPace(currentPace, distanceUnit)} colors={colors} />
              <StatTile label="Avg Pace" value={formatPace(averagePace, distanceUnit)} colors={colors} />
              <StatTile label="Elev. Gain" value={`${Math.round(elevationGain)} m`} colors={colors} />
            </>
          )}
          <StatTile label="Calories" value={`${calories} kcal`} colors={colors} />
        </View>

        {/* Splits table */}
        {splits.length > 0 && (
          <View style={[styles.splitsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.splitsTitle, { color: colors.textPrimary }]}>Splits</Text>
            <View style={[styles.splitHeaderRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.splitNum, { color: colors.textSecondary }]}>#</Text>
              <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Dist</Text>
              <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Time</Text>
              <Text style={[styles.splitCell, { color: colors.textSecondary }]}>Pace</Text>
            </View>
            {splits.map((s) => (
              <SplitRow key={s.splitNumber} split={s} unit={distanceUnit} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={[styles.controls, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandon}>
          <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {status === 'active' ? (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: Colors.cardio }]}
            onPress={pause}
          >
            <Ionicons name="pause" size={28} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: Colors.cardio }]}
            onPress={resume}
          >
            <Ionicons name="play" size={28} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.stopBtn, { borderColor: Colors.error }]}
          onPress={() => setStopModalVisible(true)}
          disabled={stopping}
        >
          {stopping ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <Ionicons name="stop" size={22} color={Colors.error} />
          )}
        </TouchableOpacity>
      </View>

      {/* Stop confirmation modal */}
      <Modal visible={stopModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>End Session?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Your session will be saved and you'll see your summary.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setStopModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Keep Going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.error }]}
                onPress={handleStop}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>End & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15 },
  content: { padding: 16, paddingBottom: 120, gap: 14 },

  splitBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  splitBannerText: { color: 'white', fontWeight: '700', fontSize: 15 },

  primaryStat: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 28,
  },
  primaryValue: { fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  primaryLabel: { fontSize: 14, marginTop: 4 },

  statsGrid: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statTile: { width: '50%', alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statValueLarge: { fontSize: 28 },
  statLabel: { fontSize: 12, marginTop: 3 },

  splitsCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  splitsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  splitHeaderRow: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  splitRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  splitNum: { width: 28, fontSize: 13, fontWeight: '600' },
  splitCell: { flex: 1, fontSize: 13 },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  mainBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abandonBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnText: { fontWeight: '700', fontSize: 15 },
});
