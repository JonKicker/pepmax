/**
 * LogWeightModal — modal for logging body weight with unit conversion.
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { logWeight, getTodaysWeight } from '../../services/bodyWeightService';
import { toLocalDateKey } from '../../utils/nutrition';
import type { Theme } from '../../constants/theme';
import type { BodyWeightEntry } from '../../types/bodyTracking';
import { Colors } from '../../constants/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
  colors: Theme['colors'];
  units: 'imperial' | 'metric';
  updateProfile: (partial: { weightKg: number }) => void;
};

export function LogWeightModal({ visible, onDismiss, onSaved, colors, units, updateProfile }: Props) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingEntry, setExistingEntry] = useState<BodyWeightEntry | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const dateKey = toLocalDateKey();
      getTodaysWeight(dateKey).then((result) => {
        if (!result.error && result.data) {
          setExistingEntry(result.data);
          const displayWeight = units === 'imperial'
            ? (result.data.weight * 2.20462).toFixed(1)
            : result.data.weight.toFixed(1);
          setValue(displayWeight);
          setNotes(result.data.note ?? '');
        } else {
          setExistingEntry(null);
          setValue('');
          setNotes('');
        }
      });
    }
  }, [visible, units]);

  const handleSave = async () => {
    setInputError(null);
    const num = parseFloat(value);

    // Convert to kg for bounds check regardless of display unit
    const numKg = units === 'imperial' ? num / 2.20462 : num;
    const MIN_KG = 20;
    const MAX_KG = 450;

    if (isNaN(num) || num <= 0) {
      setInputError('Enter a valid weight.');
      return;
    }
    if (numKg < MIN_KG || numKg > MAX_KG) {
      const minDisplay = units === 'imperial' ? `${(MIN_KG * 2.20462).toFixed(0)} lbs` : `${MIN_KG} kg`;
      const maxDisplay = units === 'imperial' ? `${(MAX_KG * 2.20462).toFixed(0)} lbs` : `${MAX_KG} kg`;
      setInputError(`Weight must be between ${minDisplay} and ${maxDisplay}.`);
      return;
    }

    setSaving(true);
    const weightKg = numKg;
    const dateKey = toLocalDateKey();

    try {
      // logWeight uses setDocument (date as doc ID), so it upserts
      await logWeight({
        weight: weightKg,
        displayUnit: units === 'imperial' ? 'lbs' : 'kg',
        date: dateKey,
        ...(notes ? { note: notes } : {}),
      });

      // Sync profile weight
      updateProfile({ weightKg });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onDismiss();
    } catch (e) {
      console.error('[LogWeightModal] save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {existingEntry ? 'Update Weight' : 'Log Weight'}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={value}
              onChangeText={(v) => { setValue(v); setInputError(null); }}
              keyboardType="decimal-pad"
              placeholder={units === 'imperial' ? 'lbs' : 'kg'}
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>
              {units === 'imperial' ? 'lbs' : 'kg'}
            </Text>
          </View>

          {inputError ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{inputError}</Text>
          ) : null}

          <TextInput
            style={[styles.notesInput, { color: colors.textPrimary, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.accent, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving || !value}
              activeOpacity={0.7}
            >
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 40,
  },
  notesInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 50,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  errorText: { fontSize: 13, marginBottom: 8, textAlign: 'center' },
});
