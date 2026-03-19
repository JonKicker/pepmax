/**
 * RecoveryCheckInModal — morning check-in for sleep quality, hours, and energy.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveRecovery, calculateEffortScore } from '../../services/recoveryService';
import { effortColor } from '../../utils/recovery';
import { toLocalDateKey } from '../../utils/nutrition';
import type { Theme } from '../../constants/theme';
import { Colors } from '../../constants/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
  colors: Theme['colors'];
};

const QUALITY_LABELS = ['Terrible', 'Poor', 'Fair', 'Good', 'Great'];
const ENERGY_LABELS = ['Exhausted', 'Low', 'Normal', 'Good', 'Energized'];

export function RecoveryCheckInModal({ visible, onDismiss, onSaved, colors }: Props) {
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [saving, setSaving] = useState(false);
  const [skipCount, setSkipCount] = useState(0);

  // Fix 1: reset skipCount each time the modal opens
  useEffect(() => {
    if (visible) setSkipCount(0);
  }, [visible]);

  const score = calculateEffortScore(sleepQuality, sleepHours, energyLevel);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRecovery({ sleepQuality, sleepHours, energyLevel });
      onSaved();
      onDismiss();
    } catch (e) {
      console.error('[RecoveryCheckInModal] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (skipCount === 0) {
      setSkipCount(1);
      return;
    }
    // Second skip — dismiss for the day
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
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Morning Check-In</Text>

          {/* Sleep Quality */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Sleep Quality</Text>
          <View style={styles.buttonRow}>
            {QUALITY_LABELS.map((label, i) => {
              const val = i + 1;
              const selected = sleepQuality === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.ratingBtn,
                    { borderColor: selected ? Colors.accent : colors.border },
                    selected && { backgroundColor: Colors.accent },
                  ]}
                  onPress={() => setSleepQuality(val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.ratingText, { color: selected ? '#fff' : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sleep Hours */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Sleep Hours</Text>
          <View style={styles.hoursRow}>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => setSleepHours((h) => Math.max(3, parseFloat((h - 0.5).toFixed(1))))}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.hoursValue, { color: colors.textPrimary }]}>
              {`${sleepHours}h`}
            </Text>
            <TouchableOpacity
              style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => setSleepHours((h) => Math.min(12, parseFloat((h + 0.5).toFixed(1))))}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Energy Level */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Energy Level</Text>
          <View style={styles.buttonRow}>
            {ENERGY_LABELS.map((label, i) => {
              const val = i + 1;
              const selected = energyLevel === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.ratingBtn,
                    { borderColor: selected ? Colors.accent : colors.border },
                    selected && { backgroundColor: Colors.accent },
                  ]}
                  onPress={() => setEnergyLevel(val)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.ratingText, { color: selected ? '#fff' : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live score preview */}
          <View style={styles.scorePreview}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Effort Score</Text>
            <Text style={[styles.scoreValue, { color: effortColor(score) }]}>{score}</Text>
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
              style={[styles.saveBtn, { backgroundColor: Colors.accent, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    paddingBottom: 40,
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
  hoursRow: {
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
  hoursValue: {
    fontSize: 32,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'center',
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
});
