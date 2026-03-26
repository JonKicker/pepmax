import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import { useHeartRateMonitor } from '../../../src/hooks/useHeartRateMonitor';
import { useAuth } from '../../../src/contexts/AuthContext';
import { estimateMaxHR } from '../../../src/utils/cardio';
import type { AudioCueFrequency, AudioCueContent, DistanceUnit } from '../../../src/types/cardio';
import SafetyContactsManager from '../../../src/components/cardio/SafetyContactsManager';
import { GlassBackground } from '../../../src/components/GlassBackground';

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );
}

function SettingRow({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const { colors: themeColors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onToggle(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Toggle ${value ? 'off' : 'on'}`}
    >
      <View style={[styles.toggleTrack, { backgroundColor: value ? Colors.cardio : themeColors.border }]}>
        <View style={[styles.toggleThumb, { left: value ? 20 : 2 }]} />
      </View>
    </TouchableOpacity>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  multi,
  colors,
}: {
  options: { value: T; label: string }[];
  selected: T | T[];
  onSelect: (value: T) => void;
  multi?: boolean;
  colors: any;
}) {
  const isSelected = (v: T) =>
    multi ? (selected as T[]).includes(v) : selected === v;

  return (
    <View style={styles.chipGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.chip,
            {
              backgroundColor: isSelected(opt.value) ? Colors.cardio : colors.surface,
              borderColor: isSelected(opt.value) ? Colors.cardio : colors.border,
            },
          ]}
          onPress={() => { Haptics.selectionAsync(); onSelect(opt.value); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Select ${opt.label}`}
        >
          <Text
            style={[
              styles.chipText,
              { color: isSelected(opt.value) ? 'white' : colors.textPrimary },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: AudioCueFrequency; label: string }[] = [
  { value: '0.5mi', label: '0.5 mi' },
  { value: '1mi', label: '1 mi' },
  { value: '5min', label: '5 min' },
  { value: '10min', label: '10 min' },
];

const CUE_CONTENT_OPTIONS: { value: AudioCueContent; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'pace', label: 'Pace' },
  { value: 'time', label: 'Time' },
];

const UNIT_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'mi', label: 'Miles' },
  { value: 'km', label: 'Kilometers' },
];

export default function CardioSettingsScreen() {
  const { colors } = useTheme();
  const { settings, updateSettings, loading } = useCardioSettings();
  const { userProfile } = useAuth();
  const hrMonitor = useHeartRateMonitor(settings.hrMonitorId);

  // Max HR text field — seed from settings or estimate from age
  const estimatedMax = userProfile?.age ? estimateMaxHR(userProfile.age) : 180;
  const [maxHRStr, setMaxHRStr] = useState(
    settings.maxHeartRate != null ? String(settings.maxHeartRate) : String(estimatedMax)
  );
  const [maxHRError, setMaxHRError] = useState('');

  // Sync field once AsyncStorage finishes loading (initial useState value is stale
  // because useCardioSettings resolves asynchronously after first render)
  React.useEffect(() => {
    if (!loading && settings.maxHeartRate != null) {
      setMaxHRStr(String(settings.maxHeartRate));
    }
  }, [loading, settings.maxHeartRate]);

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const handleMaxHRBlur = () => {
    const n = Number(maxHRStr);
    if (!Number.isInteger(n) || n < 100 || n > 220) {
      setMaxHRError('Must be between 100 and 220');
      setMaxHRStr(String(settings.maxHeartRate ?? estimatedMax));
    } else {
      setMaxHRError('');
      updateSettings({ maxHeartRate: n });
    }
  };

  const handleBLEConnect = () => {
    haptic();
    hrMonitor.startScan();
  };

  const handleBLEDisconnect = () => {
    haptic();
    hrMonitor.disconnect();
    updateSettings({ hrMonitorId: undefined, hrMonitorName: undefined });
  };

  // When scan succeeds and device connects, save to settings
  React.useEffect(() => {
    if (hrMonitor.connected && hrMonitor.connectedDeviceId) {
      updateSettings({
        hrMonitorId: hrMonitor.connectedDeviceId,
        hrMonitorName: hrMonitor.deviceName ?? 'HR Monitor',
      });
    }
  }, [hrMonitor.connected, hrMonitor.connectedDeviceId]);

  const toggleCueContent = (value: AudioCueContent) => {
    haptic();
    const current = settings.audioCueContent;
    const next = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value];
    // Keep at least one cue selected
    if (next.length === 0) return;
    updateSettings({ audioCueContent: next });
  };

  if (loading) {
    return (
      <GlassBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.cardio} />
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Audio cues */}
      <SectionHeader title="AUDIO CUES" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow label="Audio Cues" colors={colors}>
          <Toggle
            value={settings.audioCuesEnabled}
            onToggle={() => {
              haptic();
              updateSettings({ audioCuesEnabled: !settings.audioCuesEnabled });
            }}
          />
        </SettingRow>

        {settings.audioCuesEnabled && (
          <>
            <View style={styles.subSection}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Frequency</Text>
              <ChipGroup
                options={FREQ_OPTIONS}
                selected={settings.audioCueFrequency}
                onSelect={(v) => { haptic(); updateSettings({ audioCueFrequency: v }); }}
                colors={colors}
              />
            </View>

            <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Announce</Text>
              <ChipGroup
                options={CUE_CONTENT_OPTIONS}
                selected={settings.audioCueContent}
                onSelect={toggleCueContent}
                multi
                colors={colors}
              />
            </View>
          </>
        )}
      </View>

      {/* Units */}
      <SectionHeader title="UNITS" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.subSection}>
          <ChipGroup
            options={UNIT_OPTIONS}
            selected={settings.distanceUnit}
            onSelect={(v) => { haptic(); updateSettings({ distanceUnit: v }); }}
            colors={colors}
          />
        </View>
      </View>

      {/* Auto-pause */}
      <SectionHeader title="AUTO-PAUSE" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow label="Auto-pause runs" colors={colors}>
          <Toggle
            value={settings.autoPauseRun}
            onToggle={() => { haptic(); updateSettings({ autoPauseRun: !settings.autoPauseRun }); }}
          />
        </SettingRow>
        <SettingRow label="Auto-pause cycling" colors={colors}>
          <Toggle
            value={settings.autoPauseCycle}
            onToggle={() => { haptic(); updateSettings({ autoPauseCycle: !settings.autoPauseCycle }); }}
          />
        </SettingRow>
      </View>

      {/* Heart Rate */}
      <SectionHeader title="HEART RATE" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Max HR input */}
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Max Heart Rate</Text>
            {estimatedMax > 0 && (
              <Text style={[styles.settingSubLabel, { color: colors.textSecondary }]}>
                Estimated: {estimatedMax} bpm (age-based)
              </Text>
            )}
            {maxHRError ? (
              <Text style={[styles.settingSubLabel, { color: Colors.error }]}>{maxHRError}</Text>
            ) : null}
          </View>
          <View style={styles.maxHRInputWrap}>
            <TextInput
              style={[styles.maxHRInput, { color: colors.textPrimary, borderColor: maxHRError ? Colors.error : colors.border, backgroundColor: colors.background }]}
              value={maxHRStr}
              onChangeText={(t) => { setMaxHRStr(t); setMaxHRError(''); }}
              onBlur={handleMaxHRBlur}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.maxHRUnit, { color: colors.textSecondary }]}>bpm</Text>
          </View>
        </View>

        {/* BLE connect section */}
        {!hrMonitor.isAvailable ? (
          <View style={[styles.subSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
              HR Monitor pairing requires a custom dev build. Manual entry is available after each session.
            </Text>
          </View>
        ) : hrMonitor.connected ? (
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Connected</Text>
              <Text style={[styles.settingSubLabel, { color: colors.textSecondary }]}>{hrMonitor.deviceName}</Text>
            </View>
            <TouchableOpacity
              onPress={handleBLEDisconnect}
              accessibilityRole="button"
              accessibilityLabel="Forget heart rate monitor"
            >
              <Text style={[styles.chipText, { color: Colors.error }]}>Forget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              {hrMonitor.scanning ? 'Scanning…' : settings.hrMonitorName ?? 'No device paired'}
            </Text>
            <TouchableOpacity
              style={[styles.scanBtn, { backgroundColor: Colors.cardio }]}
              onPress={handleBLEConnect}
              disabled={hrMonitor.scanning}
              accessibilityRole="button"
              accessibilityLabel="Scan for heart rate monitor"
            >
              <Text style={styles.scanBtnText}>
                {hrMonitor.scanning ? 'Scanning…' : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Live Segments */}
      <SectionHeader title="SEGMENTS" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SettingRow label="Live Segment Detection" colors={colors}>
          <Toggle
            value={settings.liveSegmentsEnabled ?? true}
            onToggle={() => {
              haptic();
              updateSettings({ liveSegmentsEnabled: !(settings.liveSegmentsEnabled ?? true) });
            }}
          />
        </SettingRow>
        <View style={styles.subSection}>
          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
            Shows a banner when you enter a known segment during an outdoor session and tracks your time against your personal record.
          </Text>
        </View>
      </View>

      <SectionHeader title="SAFETY BEACON" colors={colors} />
      <Text style={[styles.beaconDesc, { color: colors.textSecondary }]}>
        Contacts receive a text with a live tracking link when you enable Beacon before a workout.
      </Text>
      <SafetyContactsManager colors={colors} />

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Settings are saved automatically.
      </Text>
    </ScrollView>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
  },

  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: { fontSize: 15 },

  toggleTrack: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },

  subSection: { padding: 14 },
  subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10 },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  footer: { fontSize: 12, textAlign: 'center', marginTop: 24 },
  beaconDesc: { fontSize: 13, marginBottom: 10, lineHeight: 18 },

  settingSubLabel: { fontSize: 11, marginTop: 2 },
  maxHRInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maxHRInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    textAlign: 'center',
  },
  maxHRUnit: { fontSize: 13 },
  scanBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  scanBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
});
