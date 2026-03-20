import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
// expo-image-picker is not yet installed; photo picker is stubbed
import { useTheme } from '../../../src/hooks/useTheme';
import { useUnits } from '../../../src/hooks/useUnits';
import { Colors } from '../../../src/constants/theme';
import { logMeasurement, uploadMeasurementPhoto } from '../../../src/services/bodyMeasurementService';
import { CIRCUMFERENCE_FIELDS } from '../../../src/types/bodyMeasurement';
import type { CircumferenceMeasurements } from '../../../src/types/bodyMeasurement';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function LogMeasurementScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isImperial, weightLabel, lengthLabel, convertWeightToKg, convertLengthToCm } = useUnits();

  const [date, setDate] = useState(getTodayStr());
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [circumferences, setCircumferences] = useState<Partial<Record<keyof CircumferenceMeasurements, string>>>({});
  const [circumferencesExpanded, setCircumferencesExpanded] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handlePickPhoto = () => {
    Alert.alert(
      'Photo attachment',
      'Install expo-image-picker to enable photo attachments.',
    );
  };

  const handleSave = async () => {
    const hasWeight = weightInput.trim().length > 0;
    const hasBodyFat = bodyFatInput.trim().length > 0;
    const hasCircumference = Object.values(circumferences).some((v) => v && v.trim().length > 0);
    const hasPhoto = photoUri != null;
    const hasNotes = notes.trim().length > 0;

    if (!hasWeight && !hasBodyFat && !hasCircumference && !hasPhoto && !hasNotes) {
      Alert.alert('Nothing to save', 'Fill in at least one field before saving.');
      return;
    }

    // Validate numeric fields before writing to Firestore
    if (hasWeight) {
      const w = parseFloat(weightInput);
      const maxWeight = isImperial ? 1100 : 500;
      if (isNaN(w) || w <= 0 || w > maxWeight) {
        Alert.alert('Invalid weight', `Enter a weight between 1 and ${maxWeight} ${isImperial ? 'lbs' : 'kg'}.`);
        return;
      }
    }
    if (hasBodyFat) {
      const bf = parseFloat(bodyFatInput);
      if (isNaN(bf) || bf < 1 || bf > 60) {
        Alert.alert('Invalid body fat', 'Body fat % must be between 1 and 60.');
        return;
      }
    }
    for (const field of CIRCUMFERENCE_FIELDS) {
      const raw = circumferences[field.key];
      if (raw && raw.trim().length > 0) {
        const val = parseFloat(raw);
        const maxCirc = isImperial ? 120 : 300;
        if (isNaN(val) || val <= 0 || val > maxCirc) {
          Alert.alert('Invalid measurement', `${field.label} must be between 1 and ${maxCirc} ${isImperial ? 'in' : 'cm'}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      let photoUrl: string | undefined;
      let photoThumbUrl: string | undefined;

      if (photoUri) {
        const photoResult = await uploadMeasurementPhoto(date, photoUri, (p) =>
          setUploadProgress(p),
        );
        if (photoResult.error) {
          Alert.alert('Photo upload failed', photoResult.error.message);
          setSaving(false);
          setUploadProgress(null);
          return;
        }
        photoUrl = photoResult.data!.photoUrl;
        photoThumbUrl = photoResult.data!.photoThumbUrl;
        setUploadProgress(null);
      }

      const measurements: CircumferenceMeasurements = {};
      for (const field of CIRCUMFERENCE_FIELDS) {
        const raw = circumferences[field.key];
        if (raw && raw.trim().length > 0) {
          const val = parseFloat(raw);
          if (!isNaN(val)) {
            measurements[field.key] = convertLengthToCm(val);
          }
        }
      }

      const weightKg = hasWeight ? convertWeightToKg(parseFloat(weightInput)) : undefined;
      const bodyFat = hasBodyFat ? parseFloat(bodyFatInput) : undefined;

      const result = await logMeasurement({
        date,
        weight: weightKg,
        weightUnit: isImperial ? 'lbs' : 'kg',
        bodyFatPercent: bodyFat,
        measurements,
        measurementUnit: isImperial ? 'in' : 'cm',
        photoUrl,
        photoThumbUrl,
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        Alert.alert('Save failed', result.error.message);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }];
  const labelStyle = [styles.label, { color: colors.textSecondary }];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Date navigation */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setDate(offsetDate(date, -1))} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: colors.textPrimary }]}>{date}</Text>
        <TouchableOpacity
          onPress={() => setDate(offsetDate(date, 1))}
          style={styles.dateArrow}
          disabled={date >= getTodayStr()}
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={date >= getTodayStr() ? colors.border : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Weight */}
      <Text style={labelStyle}>Weight ({weightLabel})</Text>
      <TextInput
        style={inputStyle}
        value={weightInput}
        onChangeText={setWeightInput}
        placeholder={`e.g. ${isImperial ? '185' : '84'}`}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />

      {/* Body fat */}
      <Text style={labelStyle}>Body Fat %</Text>
      <TextInput
        style={inputStyle}
        value={bodyFatInput}
        onChangeText={setBodyFatInput}
        placeholder="e.g. 18.5"
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />

      {/* Circumference measurements */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setCircumferencesExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Circumference Measurements ({lengthLabel})
        </Text>
        <Ionicons
          name={circumferencesExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {circumferencesExpanded && (
        <View style={styles.circumferenceGrid}>
          {CIRCUMFERENCE_FIELDS.map((field) => (
            <View key={field.key} style={styles.circumferenceItem}>
              <Text style={labelStyle}>{field.label}</Text>
              <TextInput
                style={inputStyle}
                value={circumferences[field.key] ?? ''}
                onChangeText={(v) =>
                  setCircumferences((prev) => ({ ...prev, [field.key]: v }))
                }
                placeholder="—"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </View>
      )}

      {/* Photo */}
      <Text style={labelStyle}>Progress Photo</Text>
      {photoUri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          <TouchableOpacity
            style={[styles.removePhoto, { backgroundColor: Colors.error }]}
            onPress={() => setPhotoUri(null)}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.photoPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handlePickPhoto}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.photoPickerText, { color: colors.textSecondary }]}>Add Photo</Text>
        </TouchableOpacity>
      )}

      {/* Notes */}
      <Text style={labelStyle}>Notes</Text>
      <TextInput
        style={[inputStyle, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes..."
        placeholderTextColor={colors.textSecondary}
        multiline
        maxLength={500}
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Upload progress */}
      {uploadProgress != null && (
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Uploading photo… {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      )}

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: Colors.gym }, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveBtnText}>Save Measurement</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dateArrow: { padding: 4 },
  dateText: { fontSize: 17, fontWeight: '700', minWidth: 110, textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  circumferenceGrid: { gap: 4 },
  circumferenceItem: {},

  photoPreviewWrap: { position: 'relative', alignSelf: 'flex-start', marginTop: 4 },
  photoPreview: { width: 120, height: 120, borderRadius: 10 },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 18,
    gap: 8,
    marginTop: 4,
  },
  photoPickerText: { fontSize: 15, fontWeight: '600' },

  notesInput: { minHeight: 80 },

  progressRow: { marginTop: 12 },
  progressText: { fontSize: 13, textAlign: 'center' },

  saveBtn: {
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
