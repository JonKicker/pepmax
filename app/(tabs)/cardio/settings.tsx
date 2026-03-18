import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useCardioSettings } from '../../../src/hooks/useCardioSettings';
import type { AudioCueFrequency, AudioCueContent, DistanceUnit } from '../../../src/types/cardio';

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
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.toggleTrack, { backgroundColor: value ? Colors.cardio : '#ccc' }]}>
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
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.8}
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

  const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.cardio} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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

      <Text style={[styles.footer, { color: colors.textSecondary }]}>
        Settings are saved automatically.
      </Text>
    </ScrollView>
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
});
