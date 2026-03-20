/**
 * RecoveryCheckInModal — structured daily check-in per Body Model spec §5.
 * Captures sleep, soreness, stress, readiness, and optional notes.
 * Scrollable to prevent input clipping on small screens.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveRecovery } from '../../services/recoveryService';
import { multiplierColor } from '../../utils/recovery';
import { calculateRecoveryMultiplier } from '../../utils/recoveryCalc';
import { toLocalDateKey } from '../../utils/nutrition';
import { useHealthKit } from '../../hooks/useHealthKit';
import type { Theme } from '../../constants/theme';
import { Colors } from '../../constants/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
  colors: Theme['colors'];
};

const QUALITY_LABELS = ['Terrible', 'Poor', 'Fair', 'Good', 'Great'];
const SORENESS_LABELS = ['None', 'Mild', 'Moderate', 'Severe', 'V. Severe'];
const STRESS_LABELS = ['None', 'Low', 'Moderate', 'High', 'Very High'];
const READINESS_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

function RatingRow({
  labels,
  value,
  onChange,
  colors,
}: {
  labels: string[];
  value: number;
  onChange: (v: number) => void;
  colors: Theme['colors'];
}) {
  return (
    <View style={styles.buttonRow}>
      {labels.map((label, i) => {
        const val = i + 1;
        const selected = value === val;
        return (
          <TouchableOpacity
            key={val}
            style={[
              styles.ratingBtn,
              { borderColor: selected ? Colors.accent : colors.border },
              selected && { backgroundColor: Colors.accent },
            ]}
            onPress={() => onChange(val)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.ratingText, { color: selected ? '#fff' : colors.textSecondary }]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function RecoveryCheckInModal({ visible, onDismiss, onSaved, colors }: Props) {
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [soreness, setSoreness] = useState(1);
  const [stress, setStress] = useState(1);
  const [readiness, setReadiness] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [hkBadge, setHkBadge] = useState(false);
  const hkRestingHRRef = useRef<number | undefined>(undefined);
  const hkHrvRef = useRef<number | undefined>(undefined);

  const { isEnabled: hkEnabled, syncRecoveryData } = useHealthKit();

  // Reset all state each time the modal opens; auto-fill from HealthKit if enabled
  useEffect(() => {
    if (visible) {
      setSleepQuality(3);
      setSleepHours(7);
      setSoreness(1);
      setStress(1);
      setReadiness(3);
      setNotes('');
      setSkipCount(0);
      setHkBadge(false);
      hkRestingHRRef.current = undefined;
      hkHrvRef.current = undefined;

      if (hkEnabled) {
        const date = toLocalDateKey();
        syncRecoveryData(date)
          .then((data) => {
            if (data.sleep) {
              setSleepHours(Math.min(12, Math.max(0, data.sleep.totalHours)));
              setSleepQuality(Math.min(5, Math.max(1, data.sleep.quality)));
              setHkBadge(true);
            }
            if (data.restingHR != null) hkRestingHRRef.current = data.restingHR;
            if (data.hrv != null) hkHrvRef.current = data.hrv;
          })
          .catch((e) => console.error('[RecoveryCheckInModal] HealthKit sync error:', e));
      }
    }
  }, [visible, hkEnabled, syncRecoveryData]);

  // Live preview of recovery multiplier
  const liveMultiplier = calculateRecoveryMultiplier(
    sleepHours,
    sleepQuality,
    soreness,
    stress,
    readiness,
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveRecovery({
        sleepQuality,
        sleepHours,
        soreness,
        stress,
        readiness,
        notes,
        restingHR: hkRestingHRRef.current,
        hrv: hkHrvRef.current,
      });
      if (result.error) {
        console.error('[RecoveryCheckInModal] save error:', result.error);
        Alert.alert('Could not save', 'Please try again.');
      } else {
        onSaved();
        onDismiss();
      }
    } catch (e) {
      console.error('[RecoveryCheckInModal] unexpected error:', e);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (skipCount === 0) {
      setSkipCount(1);
      return;
    }
    const dateKey = toLocalDateKey();
    try {
      await AsyncStorage.setItem(`recovery_dismissed_${dateKey}`, '1');
    } catch (e) {
      console.error('[RecoveryCheckInModal] AsyncStorage error:', e);
    } finally {
      setSkipCount(0);
      onDismiss();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Morning Check-In</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {hkBadge && (
              <View style={styles.hkBadge}>
                <Text style={styles.hkBadgeText}>Apple Health</Text>
              </View>
            )}

            {/* Sleep Quality */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Sleep Quality
            </Text>
            <RatingRow
              labels={QUALITY_LABELS}
              value={sleepQuality}
              onChange={setSleepQuality}
              colors={colors}
            />

            {/* Sleep Hours */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Sleep Hours
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepBtn, { borderColor: colors.border }]}
                onPress={() =>
                  setSleepHours((h) => Math.max(0, parseFloat((h - 0.5).toFixed(1))))
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                {`${sleepHours}h`}
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { borderColor: colors.border }]}
                onPress={() =>
                  setSleepHours((h) => Math.min(12, parseFloat((h + 0.5).toFixed(1))))
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Muscle Soreness */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Muscle Soreness
            </Text>
            <RatingRow
              labels={SORENESS_LABELS}
              value={soreness}
              onChange={setSoreness}
              colors={colors}
            />

            {/* Stress Level */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Stress Level
            </Text>
            <RatingRow
              labels={STRESS_LABELS}
              value={stress}
              onChange={setStress}
              colors={colors}
            />

            {/* Readiness (1–5) */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Readiness
            </Text>
            <RatingRow
              labels={READINESS_LABELS}
              value={readiness}
              onChange={setReadiness}
              colors={colors}
            />

            {/* Notes (optional) */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  backgroundColor: colors.background,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling today?"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              returnKeyType="done"
            />

            {/* Live recovery multiplier preview */}
            <View style={styles.scorePreview}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Recovery Multiplier
              </Text>
              <Text style={[styles.scoreValue, { color: multiplierColor(liveMultiplier) }]}>
                {`${liveMultiplier}×`}
              </Text>
            </View>

            {skipCount === 1 && (
              <Text style={[styles.nagText, { color: colors.textSecondary }]}>
                Helps optimize your training
              </Text>
            )}

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
                  styles.saveBtn,
                  { backgroundColor: Colors.accent, opacity: saving ? 0.6 : 1 },
                ]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 0,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  hkBadge: {
    alignSelf: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  hkBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007aff',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 26,
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  scorePreview: {
    alignItems: 'center',
    marginVertical: 14,
  },
  scoreLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  nagText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
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
  skipText: { fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  hkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  hkBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
