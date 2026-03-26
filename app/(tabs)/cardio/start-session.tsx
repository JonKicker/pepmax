import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { createCardioSession } from '../../../src/services/cardioService';
import { requestLocationPermission } from '../../../src/utils/locationPermission';
import { Timestamp } from 'firebase/firestore';
import { useSafetyContacts } from '../../../src/hooks/useSafetyContacts';
import BeaconToggle from '../../../src/components/cardio/BeaconToggle';
import type { ActivityType, GoalType, PoolLength, SessionGoal } from '../../../src/types/cardio';

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{text}</Text>;
}

function OptionRow({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, { borderColor: selected ? Colors.cardio : colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.radio, { borderColor: selected ? Colors.cardio : colors.border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: Colors.cardio }]} />}
      </View>
      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Toggle({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle} activeOpacity={0.7}>
      <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[styles.toggleTrack, { backgroundColor: value ? Colors.cardio : colors.border }]}>
        <View style={[styles.toggleThumb, { left: value ? 20 : 2 }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  cycle: 'Cycle',
  walk: 'Walk',
  swim: 'Swim',
};

const GOAL_OPTIONS: { type: GoalType; label: string }[] = [
  { type: 'none', label: 'No goal' },
  { type: 'distance', label: 'Distance' },
  { type: 'time', label: 'Time' },
  { type: 'pace', label: 'Pace' },
];

const POOL_LENGTHS: { value: PoolLength; label: string }[] = [
  { value: '25m', label: '25 m' },
  { value: '50m', label: '50 m' },
  { value: '25yd', label: '25 yd' },
  { value: '50yd', label: '50 yd' },
  { value: 'custom', label: 'Custom' },
];

export default function StartSessionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { activityType } = useLocalSearchParams<{ activityType: ActivityType }>();

  const [goalType, setGoalType] = useState<GoalType>('none');
  const [goalValue, setGoalValue] = useState('');
  const [indoorMode, setIndoorMode] = useState(false);
  const [poolLength, setPoolLength] = useState<PoolLength>('25m');
  const [customPoolLength, setCustomPoolLength] = useState('');
  const [starting, setStarting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [beaconOn, setBeaconOn] = useState(false);

  const { contacts } = useSafetyContacts();

  const isSwim = activityType === 'swim';
  const showIndoor = activityType === 'run' || activityType === 'cycle';
  const showBeacon = !isSwim && !indoorMode && contacts.length > 0;

  const buildGoal = (): SessionGoal | null => {
    if (goalType === 'none') return null;
    const raw = parseFloat(goalValue);
    if (isNaN(raw) || raw <= 0) return null;
    // Distance: user inputs miles/km — store as meters; Time: user inputs minutes — store as seconds; Pace: min/km — store as sec/km
    let value = raw;
    if (goalType === 'distance') value = raw * 1000; // rough — unit conversion handled at display layer
    if (goalType === 'time') value = raw * 60;
    if (goalType === 'pace') value = raw * 60;
    return { type: goalType, value };
  };

  const handleStart = async () => {
    setPermissionError(null);
    setPermissionNeedsSettings(false);
    setCreateError(null);

    // Request location permission for outdoor sessions
    if (!indoorMode && activityType !== 'swim') {
      const permResult = await requestLocationPermission();
      if (permResult === 'denied') {
        setPermissionError('Location access is required for GPS tracking. Please allow location access and try again.');
        return;
      }
      if (permResult === 'settings') {
        setPermissionError('Location access was denied. Please enable it in your device settings.');
        setPermissionNeedsSettings(true);
        return;
      }
    }

    setStarting(true);

    const poolLengthCustomM =
      poolLength === 'custom' ? parseFloat(customPoolLength) || null : null;

    const result = await createCardioSession({
      activityType,
      startedAt: Timestamp.now(),
      endedAt: null,
      status: 'active',
      route: [],
      distance: 0,
      duration: 0,
      totalPausedTime: 0,
      averagePace: 0,
      splits: [],
      calories: 0,
      elevationGain: 0,
      elevationLoss: 0,
      goals: buildGoal(),
      indoorMode: isSwim ? true : indoorMode,
      notes: '',
      lapCount: isSwim ? 0 : null,
      poolLength: isSwim ? poolLength : null,
      poolLengthCustomM: isSwim ? poolLengthCustomM : null,
    });

    setStarting(false);

    if (result.error) {
      setCreateError('Failed to start session. Please check your connection and try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: '/(tabs)/cardio/active-session',
      params: {
        sessionId: result.data,
        beaconOn: beaconOn ? '1' : '0',
        // Pass contact phones so active-session doesn't need a second Firestore fetch.
        // JSON-serialized array of { id, name, phone } objects.
        beaconContacts: beaconOn ? JSON.stringify(contacts) : '',
      },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.activityTitle, { color: colors.textPrimary }]}>
        {ACTIVITY_LABELS[activityType] ?? 'Session'}
      </Text>

      {/* Permission error banner */}
      {permissionError && (
        <View style={[styles.errorBanner, { backgroundColor: Colors.error + '1A', borderColor: Colors.error }]}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={[styles.errorBannerText, { color: Colors.error }]}>{permissionError}</Text>
          {permissionNeedsSettings && (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={[styles.openSettingsLink, { color: Colors.error }]}>Open Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Session create error banner */}
      {createError && (
        <View style={[styles.errorBanner, { backgroundColor: Colors.error + '1A', borderColor: Colors.error }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.error} />
          <Text style={[styles.errorBannerText, { color: Colors.error }]}>{createError}</Text>
        </View>
      )}

      {/* Goal */}
      <SectionLabel text="GOAL" colors={colors} />
      {GOAL_OPTIONS.map((opt) => (
        <OptionRow
          key={opt.type}
          label={opt.label}
          selected={goalType === opt.type}
          onPress={() => { setGoalType(opt.type); setGoalValue(''); }}
          colors={colors}
        />
      ))}
      {goalType !== 'none' && (
        <TextInput
          style={[styles.goalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder={
            goalType === 'distance' ? 'Distance (km or mi)' :
            goalType === 'time' ? 'Duration (minutes)' :
            'Target pace (min/km or min/mi)'
          }
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          value={goalValue}
          onChangeText={setGoalValue}
        />
      )}

      {/* Indoor toggle (run and cycle only) */}
      {showIndoor && (
        <>
          <SectionLabel text="MODE" colors={colors} />
          <Toggle
            label="Indoor mode (no GPS)"
            value={indoorMode}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIndoorMode((v) => !v);
              setPermissionError(null);
              setPermissionNeedsSettings(false);
            }}
            colors={colors}
          />
        </>
      )}

      {/* Pool length (swim only) */}
      {isSwim && (
        <>
          <SectionLabel text="POOL LENGTH" colors={colors} />
          {POOL_LENGTHS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={poolLength === opt.value}
              onPress={() => setPoolLength(opt.value)}
              colors={colors}
            />
          ))}
          {poolLength === 'custom' && (
            <TextInput
              style={[styles.goalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Pool length (meters)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={customPoolLength}
              onChangeText={setCustomPoolLength}
            />
          )}
        </>
      )}

      {/* Safety Beacon toggle — outdoor sessions only */}
      {showBeacon && (
        <>
          <SectionLabel text="SAFETY" colors={colors} />
          <BeaconToggle
            value={beaconOn}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setBeaconOn((v) => !v);
            }}
            contactCount={contacts.length}
            colors={colors}
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: Colors.cardio }, starting && styles.startBtnDisabled]}
        onPress={handleStart}
        disabled={starting}
        activeOpacity={0.7}
      >
        {starting ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="play" size={18} color="white" />
            <Text style={styles.startBtnText}>Start Session</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  activityTitle: { fontSize: 28, fontWeight: '800', marginBottom: 24 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: 15 },

  goalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 8,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLabel: { fontSize: 15 },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  errorBannerText: { fontSize: 13, flex: 1, lineHeight: 18 },
  openSettingsLink: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', marginTop: 6 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
});
