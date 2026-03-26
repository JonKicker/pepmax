/**
 * PublishTemplateModal — bottom-sheet for sharing a protocol as a community template.
 *
 * Receives pre-stripped protocol data from the caller. Shows a preview, then
 * collects title, description, tags, and disclaimer acceptance before publishing.
 */
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { publishTemplate } from '../../services/communityTemplateService';
import type { ProtocolData, TemplateCategory } from '../../types/communityTemplate';

type Props = {
  visible: boolean;
  onClose: () => void;
  protocolData: ProtocolData;
  category: TemplateCategory;
  /** Pre-filled title suggestion from compound/program name. */
  suggestedTitle?: string;
  onPublished?: (templateId: string) => void;
};

const MAX_DESCRIPTION = 300;
const MAX_TITLE = 60;

export default function PublishTemplateModal({
  visible,
  onClose,
  protocolData,
  category,
  suggestedTitle = '',
  onPublished,
}: Props) {
  const { colors } = useTheme();

  const [title, setTitle] = useState(suggestedTitle);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setTitle(suggestedTitle);
    setDescription('');
    setTagsInput('');
    setDisclaimerChecked(false);
  }, [suggestedTitle]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const parsedTags = tagsInput
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const canPublish =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    disclaimerChecked &&
    !loading;

  const handlePublish = async () => {
    if (!canPublish) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = await publishTemplate({
      category,
      title: title.trim(),
      description: description.trim(),
      tags: parsedTags,
      protocolData,
    });
    setLoading(false);
    if (result.error) {
      Alert.alert('Publish Failed', result.error.message || 'Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onPublished?.(result.data);
    onClose();
  };

  const categoryLabel =
    category === 'peptide_cycle' ? 'Peptide Cycle' :
    category === 'workout' ? 'Workout Program' :
    'Nutrition Plan';

  const categoryColor =
    category === 'peptide_cycle' ? Colors.peptide :
    category === 'workout' ? Colors.gym :
    Colors.nutrition;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.titleRow}>
              <Ionicons name="share-social-outline" size={20} color={categoryColor} />
              <Text style={[styles.titleText, { color: colors.textPrimary }]}>
                Share as Template
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Category badge */}
              <View style={styles.badgeRow}>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '1A' }]}>
                  <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                    {categoryLabel}
                  </Text>
                </View>
                <Text style={[styles.previewNote, { color: colors.textSecondary }]}>
                  Personal data has been stripped
                </Text>
              </View>

              {/* Title */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>TITLE *</Text>
              <TextInput
                value={title}
                onChangeText={(v) => setTitle(v.slice(0, MAX_TITLE))}
                placeholder="e.g. BPC-157 + TB-500 Healing Stack"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                maxLength={MAX_TITLE}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {title.length}/{MAX_TITLE}
              </Text>

              {/* Description */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION *</Text>
              <TextInput
                value={description}
                onChangeText={(v) => setDescription(v.slice(0, MAX_DESCRIPTION))}
                placeholder="What is this protocol for? What results did you see?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                maxLength={MAX_DESCRIPTION}
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {description.length}/{MAX_DESCRIPTION}
              </Text>

              {/* Tags */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>TAGS (comma-separated)</Text>
              <TextInput
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. healing, injury, bpc157"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                autoCapitalize="none"
              />
              {parsedTags.length > 0 && (
                <View style={styles.tagPillsRow}>
                  {parsedTags.map((tag) => (
                    <View key={tag} style={[styles.tagPill, { backgroundColor: categoryColor + '1A' }]}>
                      <Text style={[styles.tagPillText, { color: categoryColor }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Disclaimer */}
              <TouchableOpacity
                style={styles.disclaimerRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDisclaimerChecked((v) => !v);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, {
                  borderColor: disclaimerChecked ? categoryColor : colors.border,
                  backgroundColor: disclaimerChecked ? categoryColor : 'transparent',
                }]}>
                  {disclaimerChecked && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                  I understand this will be shared anonymously and is not medical advice.
                  I am responsible for the accuracy and safety of this information.
                </Text>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.publishBtn, {
                    backgroundColor: canPublish ? categoryColor : colors.border,
                  }]}
                  onPress={handlePublish}
                  disabled={!canPublish}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.publishBtnText}>Publish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  titleText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewNote: {
    fontSize: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginBottom: 14,
  },
  tagPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 14,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  publishBtn: {},
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});
