/**
 * ReviewModal — bottom-sheet for writing a template review.
 * 1–5 star rating, optional text (200 char), optional outcome.
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
import StarRating from './StarRating';
import { addReview } from '../../services/communityTemplateService';
import type { OutcomeNotes } from '../../types/communityTemplate';

const OUTCOME_OPTIONS: { key: OutcomeNotes; label: string }[] = [
  { key: 'yes', label: 'Yes, it worked' },
  { key: 'partially', label: 'Partially' },
  { key: 'no', label: 'Not for me' },
];

type Props = {
  visible: boolean;
  templateId: string;
  onClose: () => void;
  onReviewed?: () => void;
};

export default function ReviewModal({ visible, templateId, onClose, onReviewed }: Props) {
  const { colors } = useTheme();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<OutcomeNotes | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setRating(0);
    setText('');
    setOutcome(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const canSubmit = rating > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await addReview(
      templateId,
      rating as 1 | 2 | 3 | 4 | 5,
      text.trim() || undefined,
      outcome ?? undefined
    );
    setLoading(false);
    if (result.error) {
      Alert.alert('Review Failed', result.error.message || 'Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onReviewed?.();
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

            <Text style={[styles.title, { color: colors.textPrimary }]}>Rate This Template</Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              <StarRating
                rating={rating}
                size={36}
                interactive
                onRatingChange={(r) => { setRating(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              />
            </View>

            {/* Text */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              REVIEW (optional, 200 chars max)
            </Text>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, 200))}
              placeholder="Share your experience with this protocol…"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              maxLength={200}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>{text.length}/200</Text>

            {/* Outcome */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              DID IT WORK FOR YOU? (optional)
            </Text>
            <View style={styles.outcomeRow}>
              {OUTCOME_OPTIONS.map((opt) => {
                const active = outcome === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.outcomeChip, {
                      backgroundColor: active ? Colors.accent : colors.background,
                      borderColor: active ? Colors.accent : colors.border,
                    }]}
                    onPress={() => setOutcome(active ? null : opt.key)}
                  >
                    <Text style={[styles.outcomeChipText, { color: active ? 'white' : colors.textSecondary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.submitBtn, { backgroundColor: canSubmit ? Colors.accent : colors.border }]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Review</Text>
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
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  starsRow: { alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
    minHeight: 70,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  outcomeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  outcomeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  outcomeChipText: { fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { borderWidth: 1 },
  submitBtn: {},
  btnText: { fontSize: 15, fontWeight: '600' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
