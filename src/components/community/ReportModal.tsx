/**
 * ReportModal — bottom-sheet for reporting inappropriate/dangerous content.
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { reportTemplate } from '../../services/communityTemplateService';
import type { ReportReason } from '../../types/communityTemplate';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'inappropriate', label: 'Inappropriate' },
  { key: 'dangerous', label: 'Dangerous dosing' },
  { key: 'spam', label: 'Spam' },
  { key: 'other', label: 'Other' },
];

type Props = {
  visible: boolean;
  templateId: string;
  onClose: () => void;
  onReported?: () => void;
};

export default function ReportModal({ visible, templateId, onClose, onReported }: Props) {
  const { colors } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setReason(null); setDetails(''); };
  const handleClose = () => { reset(); onClose(); };

  const canSubmit = reason !== null && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await reportTemplate(
      templateId,
      reason,
      details.trim() || undefined
    );
    setLoading(false);
    if (result.error) {
      Alert.alert('Report Failed', result.error.message || 'Please try again.');
      return;
    }
    Alert.alert('Report Submitted', 'Thank you. Our team will review this content.');
    reset();
    onReported?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text style={[styles.title, { color: colors.textPrimary }]}>Report Content</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Help us keep the community safe by reporting harmful or inaccurate content.
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>REASON</Text>
            <View style={styles.reasonGrid}>
              {REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.reasonChip, {
                      backgroundColor: active ? Colors.error + '18' : colors.background,
                      borderColor: active ? Colors.error : colors.border,
                    }]}
                    onPress={() => setReason(active ? null : r.key)}
                  >
                    <Text style={[styles.reasonChipText, { color: active ? Colors.error : colors.textPrimary }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {reason === 'other' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>DETAILS</Text>
                <TextInput
                  value={details}
                  onChangeText={(v) => setDetails(v.slice(0, 300))}
                  placeholder="Describe the issue…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  maxLength={300}
                />
              </>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.reportBtn, { backgroundColor: canSubmit ? Colors.error : colors.border }]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.reportBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  reasonChipText: { fontSize: 13, fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    minHeight: 70,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { borderWidth: 1 },
  reportBtn: {},
  btnText: { fontSize: 15, fontWeight: '600' },
  reportBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
