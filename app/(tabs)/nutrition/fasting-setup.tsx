import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getFastingConfig, saveFastingConfig } from '../../../src/services/fastingService';
import { scheduleFastingReminders, cancelFastingReminders } from '../../../src/services/notificationService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { FastingProtocol } from '../../../src/types/fasting';

// ─── Protocol presets ────────────────────────────────────────────────────────

type ProtocolPreset = {
  protocol: FastingProtocol;
  label: string;
  windowStart: string;
  windowEnd: string;
  description: string;
};

const PROTOCOL_PRESETS: ProtocolPreset[] = [
  {
    protocol: '16:8',
    label: '16:8',
    windowStart: '12:00',
    windowEnd: '20:00',
    description: '8h eating window, noon – 8 PM',
  },
  {
    protocol: '18:6',
    label: '18:6',
    windowStart: '13:00',
    windowEnd: '19:00',
    description: '6h eating window, 1 PM – 7 PM',
  },
  {
    protocol: '20:4',
    label: '20:4',
    windowStart: '14:00',
    windowEnd: '18:00',
    description: '4h eating window, 2 PM – 6 PM',
  },
  {
    protocol: 'custom',
    label: 'Custom',
    windowStart: '12:00',
    windowEnd: '20:00',
    description: 'Set your own eating window',
  },
];

// ─── Time picker helpers ─────────────────────────────────────────────────────

function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${h} ${period}`;
}

function hhmmToComponents(hhmm: string): { hour: number; minute: number } {
  const parts = hhmm.split(':');
  return {
    hour: parseInt(parts[0] ?? '12', 10),
    minute: parseInt(parts[1] ?? '0', 10),
  };
}

function componentsToHHmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplayTime(hhmm: string): string {
  const { hour, minute } = hhmmToComponents(hhmm);
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

// ─── Simple hour picker ──────────────────────────────────────────────────────

function HourPicker({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const { hour, minute } = hhmmToComponents(value);

  const incrementHour = () => {
    onChange(componentsToHHmm((hour + 1) % 24, minute));
  };
  const decrementHour = () => {
    onChange(componentsToHHmm((hour + 23) % 24, minute));
  };
  const incrementMinute = () => {
    const newMinute = minute === 0 ? 30 : 0;
    const newHour = minute === 30 ? (hour + 1) % 24 : hour;
    onChange(componentsToHHmm(newHour, newMinute));
  };
  const decrementMinute = () => {
    const newMinute = minute === 0 ? 30 : 0;
    const newHour = minute === 0 ? (hour + 23) % 24 : hour;
    onChange(componentsToHHmm(newHour, newMinute));
  };

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  const minuteDisplay = String(minute).padStart(2, '0');

  return (
    <View style={pickerStyles.container}>
      <Text style={[pickerStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={pickerStyles.row}>
        {/* Hour */}
        <View style={pickerStyles.unitGroup}>
          <TouchableOpacity onPress={incrementHour} style={pickerStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-up" size={20} color={Colors.nutrition} />
          </TouchableOpacity>
          <Text style={[pickerStyles.timeText, { color: colors.textPrimary }]}>{displayHour}</Text>
          <TouchableOpacity onPress={decrementHour} style={pickerStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={20} color={Colors.nutrition} />
          </TouchableOpacity>
        </View>

        <Text style={[pickerStyles.colon, { color: colors.textPrimary }]}>:</Text>

        {/* Minute */}
        <View style={pickerStyles.unitGroup}>
          <TouchableOpacity onPress={incrementMinute} style={pickerStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-up" size={20} color={Colors.nutrition} />
          </TouchableOpacity>
          <Text style={[pickerStyles.timeText, { color: colors.textPrimary }]}>{minuteDisplay}</Text>
          <TouchableOpacity onPress={decrementMinute} style={pickerStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={20} color={Colors.nutrition} />
          </TouchableOpacity>
        </View>

        {/* AM/PM */}
        <TouchableOpacity
          onPress={() => onChange(componentsToHHmm((hour + 12) % 24, minute))}
          style={[pickerStyles.periodBtn, { borderColor: colors.border }]}
        >
          <Text style={[pickerStyles.periodText, { color: Colors.nutrition }]}>{period}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitGroup: {
    alignItems: 'center',
    width: 44,
  },
  arrowBtn: {
    padding: 2,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    minWidth: 40,
    textAlign: 'center',
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    marginLeft: 4,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function FastingSetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol>('16:8');
  const [windowStart, setWindowStart] = useState('12:00');
  const [windowEnd, setWindowEnd] = useState('20:00');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Load existing config on mount
  useEffect(() => {
    (async () => {
      if (!currentUser?.uid) return;
      const result = await getFastingConfig();
      if (result.data) {
        setSelectedProtocol(result.data.protocol);
        setWindowStart(result.data.eatingWindowStart);
        setWindowEnd(result.data.eatingWindowEnd);
        setRemindersEnabled(result.data.remindersEnabled);
      }
      setLoadingConfig(false);
    })();
  }, [currentUser?.uid]);

  const handleSelectProtocol = (preset: ProtocolPreset) => {
    setSelectedProtocol(preset.protocol);
    if (preset.protocol !== 'custom') {
      setWindowStart(preset.windowStart);
      setWindowEnd(preset.windowEnd);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setSaving(true);

    const result = await saveFastingConfig({
      protocol: selectedProtocol,
      eatingWindowStart: windowStart,
      eatingWindowEnd: windowEnd,
      remindersEnabled,
    });

    if (result.error) {
      setSaving(false);
      Alert.alert('Error', 'Could not save your fasting schedule. Please try again.');
      return;
    }

    // Schedule or cancel reminders
    if (remindersEnabled) {
      await scheduleFastingReminders(windowStart, windowEnd);
    } else {
      await cancelFastingReminders();
    }

    analytics.track(AnalyticsEvent.FASTING_CONFIGURED, {
      protocol: selectedProtocol,
      remindersEnabled: remindersEnabled ? 1 : 0,
    });

    setSaving(false);
    router.back();
  };

  if (loadingConfig) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Protocol picker */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FASTING PROTOCOL</Text>
      <View style={styles.protocolRow}>
        {PROTOCOL_PRESETS.map((preset) => {
          const isActive = selectedProtocol === preset.protocol;
          return (
            <TouchableOpacity
              key={preset.protocol}
              onPress={() => handleSelectProtocol(preset)}
              style={[
                styles.protocolBtn,
                {
                  backgroundColor: isActive ? Colors.nutrition : colors.surface,
                  borderColor: isActive ? Colors.nutrition : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.protocolBtnLabel,
                  { color: isActive ? '#ffffff' : colors.textPrimary },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedProtocol !== 'custom' && (
        <Text style={[styles.presetDescription, { color: colors.textSecondary }]}>
          {PROTOCOL_PRESETS.find((p) => p.protocol === selectedProtocol)?.description}
        </Text>
      )}

      {/* Time pickers */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <HourPicker
          label="Eating window opens"
          value={windowStart}
          onChange={setWindowStart}
          colors={colors}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <HourPicker
          label="Eating window closes"
          value={windowEnd}
          onChange={setWindowEnd}
          colors={colors}
        />
      </View>

      {/* Window summary */}
      <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={18} color={Colors.nutrition} />
        <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
          {formatDisplayTime(windowStart)} — {formatDisplayTime(windowEnd)}
        </Text>
      </View>

      {/* Reminder toggle */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REMINDERS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.reminderRow}>
          <View style={styles.reminderTextGroup}>
            <Text style={[styles.reminderTitle, { color: colors.textPrimary }]}>Window reminders</Text>
            <Text style={[styles.reminderSubtitle, { color: colors.textSecondary }]}>
              30 min before window opens and closes
            </Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
            trackColor={{ false: colors.border, true: Colors.nutrition + '88' }}
            thumbColor={remindersEnabled ? Colors.nutrition : colors.textSecondary}
          />
        </View>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: Colors.nutrition, opacity: saving ? 0.7 : 1 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.7}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save Schedule</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  protocolRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  protocolBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  protocolBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  presetDescription: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
