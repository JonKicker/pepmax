/**
 * LogWeightModal — bottom-sheet-style modal for logging a body weight entry.
 *
 * Pre-fills with last logged weight, defaults date to today, optional note.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { Units } from '../../types/profile';
import { kgToLbs, lbsToKg } from '../../utils/tdee';
import { toLocalDateKey } from '../../utils/nutrition';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 450;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (weightKg: number, displayUnit: 'kg' | 'lbs', date: string, note?: string) => void;
  lastWeightKg?: number;
  units: Units;
  defaultDate?: string; // YYYY-MM-DD, defaults to today
};

export default function LogWeightModal({ visible, onClose, onSave, lastWeightKg, units, defaultDate }: Props) {
  const { colors } = useTheme();
  const isImperial = units === 'imperial';
  const displayUnit = isImperial ? 'lbs' : 'kg';

  const [weightText, setWeightText] = useState('');
  const [date, setDate] = useState(defaultDate ?? toLocalDateKey());
  const [note, setNote] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (lastWeightKg != null) {
        const displayValue = isImperial ? kgToLbs(lastWeightKg) : lastWeightKg;
        setWeightText(String(Math.round(displayValue * 10) / 10));
      } else {
        setWeightText('');
      }
      setDate(defaultDate ?? toLocalDateKey());
      setNote('');
      setDateError(null);
    }
  }, [visible, lastWeightKg, isImperial, defaultDate]);

  const handleSave = () => {
    const parsed = parseFloat(weightText);
    if (isNaN(parsed) || parsed <= 0) return;

    // Validate date format — guards the Firestore document ID
    if (!DATE_REGEX.test(date)) {
      setDateError('Date must be YYYY-MM-DD');
      return;
    }

    // Sanity-check weight bounds (20–450 kg)
    const kg = isImperial ? lbsToKg(parsed) : parsed;
    if (kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) {
      return; // isValid already prevents this, but belt-and-suspenders
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(kg, displayUnit, date, note.trim() || undefined);
  };

  const isValid = !isNaN(parseFloat(weightText)) && parseFloat(weightText) > 0 && DATE_REGEX.test(date);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, { color: colors.textPrimary }]}>Log Weight</Text>

            {/* Weight input */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.weightInput, { color: colors.textPrimary, borderColor: Colors.body }]}
                value={weightText}
                onChangeText={setWeightText}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{displayUnit}</Text>
            </View>

            {/* Date input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { color: colors.textPrimary, borderColor: dateError ? Colors.error : colors.border },
                ]}
                value={date}
                onChangeText={(v) => { setDate(v); setDateError(null); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
              {dateError && (
                <Text style={[styles.fieldError, { color: Colors.error }]}>{dateError}</Text>
              )}
            </View>

            {/* Note input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary, borderColor: colors.border }]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g., morning weigh-in"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: isValid ? Colors.body : colors.border }]}
              onPress={handleSave}
              disabled={!isValid}
              activeOpacity={0.7}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  weightInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 8,
  },
  unitLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
});
