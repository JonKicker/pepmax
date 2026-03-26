import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { addPeptide, updatePeptide, getPeptideById, parseUnit, parseFrequency, parseRoute, mapGroupToCategory } from '../../../src/services/peptideService';
import {
  UNITS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  PEPTIDE_CATEGORIES,
  ROUTES,
} from '../../../src/types/peptide';
import type { Peptide, Unit, Frequency, PeptideCategory, Route } from '../../../src/types/peptide';
import { searchCompounds } from '../../../src/data/compoundDatabase';
import type { Compound } from '../../../src/data/compoundDatabase';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PeptideFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Core fields
  const [name, setName] = useState('');
  const [defaultDose, setDefaultDose] = useState('');
  const [unit, setUnit] = useState<Unit>('mcg');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Autocomplete
  const [suggestions, setSuggestions] = useState<Compound[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Extended metadata (all optional)
  const [category, setCategory] = useState<PeptideCategory | undefined>();
  const [halfLifeHours, setHalfLifeHours] = useState('');
  const [route, setRoute] = useState<Route | undefined>();
  const [concentrationMgMl, setConcentrationMgMl] = useState('');
  const [storageTemp, setStorageTemp] = useState('');

  // Load existing peptide when editing
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      const result = await getPeptideById(id!);
      if (result.data) {
        const p = result.data;
        setName(p.name);
        setDefaultDose(String(p.defaultDose));
        setUnit(p.unit);
        setFrequency(p.frequency);
        setCustomDays(p.customDays ?? []);
        setNotes(p.notes ?? '');
        setCategory(p.category);
        setHalfLifeHours(p.halfLifeHours != null ? String(p.halfLifeHours) : '');
        setRoute(p.route);
        setConcentrationMgMl(p.concentrationMgMl != null ? String(p.concentrationMgMl) : '');
        setStorageTemp(p.storageTemp ?? '');
      }
      setLoading(false);
    })();
  }, [id, isEditing]);

  const toggleDay = (day: string) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (!isEditing && text.trim().length >= 2) {
      const matches = searchCompounds(text).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (compound: Compound) => {
    setName(compound.name);
    if (compound.commonDoses.length > 0) setDefaultDose(String(compound.commonDoses[0]));
    setUnit(parseUnit(compound.unit));
    setFrequency(parseFrequency(compound.dosingFrequency));
    const r = parseRoute(compound.route);
    if (r) setRoute(r);
    setCategory(mapGroupToCategory(compound.group));
    setHalfLifeHours(String(compound.halfLifeHours));
    setStorageTemp(compound.storage);
    setNotes(compound.notesForUsers);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a peptide name.');
      return;
    }
    const dose = parseFloat(defaultDose);
    if (!defaultDose || isNaN(dose) || !isFinite(dose) || dose <= 0) {
      Alert.alert('Dose required', 'Please enter a valid default dose amount.');
      return;
    }
    if (frequency === 'custom' && customDays.length === 0) {
      Alert.alert('Select days', 'Choose at least one day for custom frequency.');
      return;
    }

    const parsedHalfLife = halfLifeHours.trim() ? parseFloat(halfLifeHours) : undefined;
    const parsedConc = concentrationMgMl.trim() ? parseFloat(concentrationMgMl) : undefined;

    setSaving(true);
    const payload = {
      name: name.trim(),
      defaultDose: dose,
      unit,
      frequency,
      customDays: frequency === 'custom' ? customDays : [],
      notes: notes.trim(),
      ...(category ? { category } : {}),
      ...(parsedHalfLife != null && !isNaN(parsedHalfLife) ? { halfLifeHours: parsedHalfLife } : {}),
      ...(route ? { route } : {}),
      ...(parsedConc != null && !isNaN(parsedConc) ? { concentrationMgMl: parsedConc } : {}),
      ...(storageTemp.trim() ? { storageTemp: storageTemp.trim() } : {}),
    };

    const result = isEditing
      ? await updatePeptide(id!, payload)
      : await addPeptide(payload);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    if (!isEditing) {
      analytics.track(AnalyticsEvent.PEPTIDE_ADDED, { peptide_name: name.trim() });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.peptide} size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? 'Edit Peptide' : 'Add Peptide' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>PEPTIDE NAME *</Text>
          <View style={{ zIndex: 10 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={name}
              onChangeText={handleNameChange}
              placeholder='e.g. BPC-157, TB-500, Semaglutide'
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              returnKeyType="next"
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && (
              <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {suggestions.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectSuggestion(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.suggestionName, { color: colors.textPrimary }]}>{c.name}</Text>
                    {!!c.aliases && !c.aliases.startsWith('N/A') && (
                      <Text style={[styles.suggestionAliases, { color: colors.textSecondary }]} numberOfLines={1}>
                        {c.aliases}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Default dose + unit */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>DEFAULT DOSE *</Text>
          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                styles.doseInput,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
              ]}
              value={defaultDose}
              onChangeText={setDefaultDose}
              placeholder="250"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <View style={styles.segmentRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: unit === u ? Colors.peptide : colors.surface,
                      borderColor: unit === u ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.segmentText, { color: unit === u ? 'white' : colors.textSecondary }]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>FREQUENCY</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.freqBtn,
                  {
                    backgroundColor: frequency === f ? Colors.peptide : colors.surface,
                    borderColor: frequency === f ? Colors.peptide : colors.border,
                  },
                ]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.freqBtnText, { color: frequency === f ? 'white' : colors.textPrimary }]}>
                  {FREQUENCY_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom day picker */}
          {frequency === 'custom' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT DAYS</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayBtn,
                      {
                        backgroundColor: customDays.includes(day) ? Colors.peptide : colors.surface,
                        borderColor: customDays.includes(day) ? Colors.peptide : colors.border,
                      },
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayBtnText, { color: customDays.includes(day) ? 'white' : colors.textPrimary }]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>NOTES (optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Reconstituted 5mg vial in 2.5mL BAC water"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* ─── Extended metadata (optional) ─────────────────────────────── */}
          <Text style={[styles.sectionDivider, { color: colors.textSecondary, borderColor: colors.border }]}>
            ADDITIONAL DETAILS (optional)
          </Text>

          {/* Category */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
          <View style={styles.freqGrid}>
            {PEPTIDE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.freqBtn,
                  {
                    backgroundColor: category === cat ? Colors.peptide : colors.surface,
                    borderColor: category === cat ? Colors.peptide : colors.border,
                  },
                ]}
                onPress={() => setCategory((prev) => (prev === cat ? undefined : cat))}
              >
                <Text style={[styles.freqBtnText, { color: category === cat ? 'white' : colors.textPrimary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Half-life */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>HALF-LIFE (hours)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={halfLifeHours}
            onChangeText={setHalfLifeHours}
            placeholder="e.g. 168"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />

          {/* Route */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>ROUTE</Text>
          <View style={styles.freqGrid}>
            {ROUTES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.freqBtn,
                  {
                    backgroundColor: route === r ? Colors.peptide : colors.surface,
                    borderColor: route === r ? Colors.peptide : colors.border,
                  },
                ]}
                onPress={() => setRoute((prev) => (prev === r ? undefined : r))}
              >
                <Text style={[styles.freqBtnText, { color: route === r ? 'white' : colors.textPrimary }]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Concentration */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>CONCENTRATION (mg/mL)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={concentrationMgMl}
            onChangeText={setConcentrationMgMl}
            placeholder="e.g. 2"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />

          {/* Storage temp */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>STORAGE TEMP</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={storageTemp}
            onChangeText={setStorageTemp}
            placeholder="e.g. Refrigerate 2–8°C"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
          />

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: Colors.peptide }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Peptide'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 60 },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 22, marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseInput: { flex: 1 },
  notesInput: { height: 100, paddingTop: 12 },

  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  segmentText: { fontSize: 14, fontWeight: '600' },

  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  freqBtnText: { fontSize: 14, fontWeight: '500' },

  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  dayBtnText: { fontSize: 13, fontWeight: '600' },

  sectionDivider: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 32,
    marginBottom: 0,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  saveBtn: { marginTop: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Autocomplete
  suggestionsBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionName: { fontSize: 14, fontWeight: '600' },
  suggestionAliases: { fontSize: 11, marginTop: 1 },
});
