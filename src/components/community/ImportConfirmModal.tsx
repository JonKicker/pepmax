/**
 * ImportConfirmModal — confirmation step before importing a template.
 * Allows renaming and choosing a custom start date (for peptide cycles).
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
  Alert,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { importTemplate } from '../../services/communityTemplateService';
import type { CommunityTemplate } from '../../types/communityTemplate';

type Props = {
  visible: boolean;
  template: CommunityTemplate;
  onClose: () => void;
  /** Called with the local copy's Firestore doc ID after successful import. */
  onImported?: (localCopyRef: string) => void;
};

function categoryColor(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return Colors.peptide;
    case 'workout': return Colors.gym;
    case 'nutrition_plan': return Colors.nutrition;
  }
}

function categoryDestination(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return 'a new active cycle in your Peptides tab';
    case 'workout': return 'a new workout template in your Training tab';
    case 'nutrition_plan': return 'a new recipe in your Nutrition tab';
  }
}

export default function ImportConfirmModal({ visible, template, onClose, onImported }: Props) {
  const { colors } = useTheme();
  const [customTitle, setCustomTitle] = useState(template.title);
  const [loading, setLoading] = useState(false);

  const color = categoryColor(template.category);

  const handleImport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const titleOverride = customTitle.trim() !== template.title ? customTitle.trim() : undefined;
    const result = await importTemplate(template, titleOverride);
    setLoading(false);
    if (result.error) {
      Alert.alert('Import Failed', result.error.message || 'Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onImported?.(result.data);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>Import Template</Text>

          <View style={[styles.descCard, { backgroundColor: color + '0F', borderColor: color + '30' }]}>
            <Text style={[styles.descText, { color: colors.textPrimary }]}>
              This will create{' '}
              <Text style={{ fontWeight: '700' }}>{categoryDestination(template.category)}</Text>.
              You can customise it after importing.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>NAME</Text>
          <TextInput
            value={customTitle}
            onChangeText={setCustomTitle}
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            maxLength={60}
            placeholder="Custom name (optional)"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={[styles.disclaimerRow, { backgroundColor: Colors.warning + '12', borderColor: Colors.warning + '30' }]}>
            <Text style={[styles.disclaimerText, { color: Colors.warning }]}>
              Community protocols are not medical advice. Always consult a healthcare provider before starting.
            </Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: color }]}
              onPress={handleImport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.importBtnText}>Import</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  descCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  descText: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  disclaimerRow: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  disclaimerText: { fontSize: 12, lineHeight: 17 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { borderWidth: 1 },
  btnText: { fontSize: 15, fontWeight: '600' },
  importBtnText: { fontSize: 15, fontWeight: '700', color: 'white' },
});
