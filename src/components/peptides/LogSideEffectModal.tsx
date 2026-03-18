import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { addSideEffect } from '../../services/sideEffectService';
import { getPeptides } from '../../services/peptideService';
import {
  SIDE_EFFECT_OPTIONS,
  SEVERITIES,
} from '../../types/sideEffect';
import type { SideEffectSeverity } from '../../types/sideEffect';
import type { Peptide } from '../../types/peptide';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const SEVERITY_LABELS: Record<SideEffectSeverity, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
};

export default function LogSideEffectModal({ visible, onClose, onSaved }: Props) {
  const { colors } = useTheme();

  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SideEffectSeverity>('mild');
  const [selectedPeptide, setSelectedPeptide] = useState<Peptide | null>(null);
  const [showPeptidePicker, setShowPeptidePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Reset form each open
    setSelectedEmoji(null);
    setSelectedLabel(null);
    setSeverity('mild');
    setSelectedPeptide(null);
    setShowPeptidePicker(false);
    setNotes('');

    getPeptides().then((r) => {
      if (r.data) setPeptides(r.data);
    });
  }, [visible]);

  const handleSave = async () => {
    if (!selectedEmoji || !selectedLabel) {
      Alert.alert('Select symptom', 'Please tap a symptom to log.');
      return;
    }

    setSaving(true);
    const result = await addSideEffect({
      timestamp: Timestamp.fromDate(new Date()),
      emoji: selectedEmoji,
      label: selectedLabel,
      severity,
      notes: notes.trim(),
      peptideId: selectedPeptide?.id,
      peptideName: selectedPeptide?.name,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', 'Could not save. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaved();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Log Side Effect
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Symptom grid */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SYMPTOM</Text>
            <View style={styles.emojiGrid}>
              {SIDE_EFFECT_OPTIONS.map((opt) => {
                const isSelected = selectedEmoji === opt.emoji;
                return (
                  <TouchableOpacity
                    key={opt.emoji}
                    style={[
                      styles.emojiBtn,
                      {
                        backgroundColor: isSelected ? Colors.peptide : colors.background,
                        borderColor: isSelected ? Colors.peptide : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedEmoji(opt.emoji);
                      setSelectedLabel(opt.label);
                    }}
                  >
                    <Text style={styles.emojiChar}>{opt.emoji}</Text>
                    <Text
                      style={[
                        styles.emojiLabel,
                        { color: isSelected ? '#fff' : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SEVERITY</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.severityBtn,
                    {
                      backgroundColor: severity === s ? Colors.peptide : colors.background,
                      borderColor: severity === s ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => setSeverity(s)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      { color: severity === s ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {SEVERITY_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional peptide link */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              LINKED COMPOUND (optional)
            </Text>
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={() => setShowPeptidePicker((v) => !v)}
            >
              <Text
                style={[
                  styles.selectorBtnText,
                  { color: selectedPeptide ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {selectedPeptide?.name ?? 'None'}
              </Text>
              <Ionicons
                name={showPeptidePicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {showPeptidePicker && (
              <View
                style={[
                  styles.pickerDropdown,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedPeptide(null);
                    setShowPeptidePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textSecondary }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {peptides.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.border },
                      selectedPeptide?.id === p.id && {
                        backgroundColor: Colors.peptide + '1A',
                      },
                    ]}
                    onPress={() => {
                      setSelectedPeptide(p);
                      setShowPeptidePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              NOTES (optional)
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details…"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.peptide }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Save Side Effect</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  emojiChar: { fontSize: 24 },
  emojiLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  severityRow: { flexDirection: 'row', gap: 8 },
  severityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  severityBtnText: { fontSize: 13, fontWeight: '600' },

  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtnText: { fontSize: 15 },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { fontSize: 15 },

  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    height: 80,
  },

  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
