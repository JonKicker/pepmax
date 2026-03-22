import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getPeptides, addDose } from '../../../src/services/peptideService';
import {
  INJECTION_SITES,
  INJECTION_SITE_LABELS,
  MOOD_EMOJIS,
  UNITS,
} from '../../../src/types/peptide';
import type { Peptide, Unit, InjectionSite } from '../../../src/types/peptide';
import {
  scheduleDoseReminder,
  FREQUENCY_TO_HOURS,
} from '../../../src/services/notificationService';
import { decrementInventoryOnDose } from '../../../src/services/inventoryService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(d);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function isToday(d: Date): boolean {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible, inventoryLine }: { visible: boolean; inventoryLine?: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={20} color="white" />
      <View>
        <Text style={styles.toastText}>Dose logged! ✓</Text>
        {inventoryLine ? (
          <Text style={styles.toastSubText}>{inventoryLine}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function LogDoseScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [inventoryToast, setInventoryToast] = useState<string | null>(null);

  // Form state
  const [selectedPeptide, setSelectedPeptide] = useState<Peptide | null>(null);
  const [showPeptidePicker, setShowPeptidePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<Unit>('mcg');
  const [site, setSite] = useState<InjectionSite | null>(null);
  const [siteOther, setSiteOther] = useState('');
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [mood, setMood] = useState<number>(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      const result = await getPeptides();
      if (result.data && result.data.length > 0) {
        setPeptides(result.data);
        const first = result.data[0];
        setSelectedPeptide(first);
        setAmount(String(first.defaultDose));
        setUnit(first.unit);
      } else if (result.data) {
        setPeptides(result.data);
      }
      setLoading(false);
    })();
  }, []);

  const selectPeptide = (p: Peptide) => {
    setSelectedPeptide(p);
    setAmount(String(p.defaultDose));
    setUnit(p.unit);
    setShowPeptidePicker(false);
  };

  const adjustDate = (days: number) => {
    const next = new Date(timestamp);
    next.setDate(next.getDate() + days);
    if (next > new Date()) return; // block future dates
    setTimestamp(next);
  };

  const handleSave = async () => {
    if (!selectedPeptide) {
      Alert.alert('Select a peptide', 'Please choose which peptide you administered.');
      return;
    }
    const doseAmount = parseFloat(amount);
    if (!amount || isNaN(doseAmount) || !isFinite(doseAmount) || doseAmount <= 0) {
      Alert.alert('Invalid dose', 'Please enter a valid dose amount.');
      return;
    }
    if (!site) {
      Alert.alert('Select injection site', 'Please choose where you administered the dose.');
      return;
    }
    if (site === 'other' && !siteOther.trim()) {
      Alert.alert('Describe site', 'Please describe the injection site.');
      return;
    }

    setSaving(true);
    const result = await addDose({
      peptideId: selectedPeptide.id,
      peptideName: selectedPeptide.name,
      amount: doseAmount,
      unit,
      site,
      siteOther: site === 'other' ? siteOther.trim() : undefined,
      timestamp: Timestamp.fromDate(timestamp),
      mood,
      notes: notes.trim(),
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    analytics.track(AnalyticsEvent.DOSE_LOGGED, {
      peptide_name: selectedPeptide.name,
      method: 'full_form',
    });

    // Schedule next-dose reminder — fire-and-forget, never blocks the save flow
    const intervalHours = FREQUENCY_TO_HOURS[selectedPeptide.frequency];
    if (intervalHours !== undefined) {
      scheduleDoseReminder(selectedPeptide.id, selectedPeptide.name, intervalHours).catch(
        () => {},
      );
      analytics.track(AnalyticsEvent.REMINDER_SET, {});
    }

    // Fire-and-forget inventory decrement
    decrementInventoryOnDose(selectedPeptide.id, doseAmount, unit)
      .then((result) => {
        if (result?.compoundResult) {
          setInventoryToast(
            `${result.compoundResult.itemName} — ${result.compoundResult.remaining} ${unit} remaining`,
          );
        }
      })
      .catch(() => {});

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      router.back();
    }, 1400);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.peptide} size="large" />
      </View>
    );
  }

  if (peptides.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="eyedrop-outline" size={52} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Add a peptide to your library first.
        </Text>
        <TouchableOpacity
          style={[styles.goLibraryBtn, { backgroundColor: Colors.peptide }]}
          onPress={() => router.back()}
        >
          <Text style={styles.goLibraryBtnText}>Go to Library</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Peptide selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>PEPTIDE</Text>
          <TouchableOpacity
            style={[styles.selectorBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPeptidePicker((v) => !v)}
          >
            <Text style={[styles.selectorBtnText, { color: selectedPeptide ? colors.textPrimary : colors.textSecondary }]}>
              {selectedPeptide?.name ?? 'Select peptide…'}
            </Text>
            <Ionicons name={showPeptidePicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {showPeptidePicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {peptides.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    selectedPeptide?.id === p.id && { backgroundColor: Colors.peptide + '1A' },
                  ]}
                  onPress={() => selectPeptide(p)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{p.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>
                    {p.defaultDose} {p.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dose amount + unit */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>DOSE AMOUNT</Text>
          <View style={styles.row}>
            <TextInput
              style={[
                styles.input,
                styles.doseInput,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
              ]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.unitRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitBtn,
                    {
                      backgroundColor: unit === u ? Colors.peptide : colors.surface,
                      borderColor: unit === u ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitBtnText, { color: unit === u ? 'white' : colors.textSecondary }]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Injection site grid */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>INJECTION SITE</Text>
          <View style={styles.siteGrid}>
            {INJECTION_SITES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.siteBtn,
                  {
                    backgroundColor: site === s ? Colors.peptide : colors.surface,
                    borderColor: site === s ? Colors.peptide : colors.border,
                  },
                ]}
                onPress={() => setSite(s)}
              >
                <Text style={[styles.siteBtnText, { color: site === s ? 'white' : colors.textPrimary }]}>
                  {INJECTION_SITE_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {site === 'other' && (
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border, marginTop: 8 },
              ]}
              value={siteOther}
              onChangeText={setSiteOther}
              placeholder="Describe injection site"
              placeholderTextColor={colors.textSecondary}
            />
          )}

          {/* Date — arrow navigation (time stays current) */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>DATE & TIME</Text>
          <View style={[styles.dateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => adjustDate(-1)}>
              <Ionicons name="chevron-back" size={22} color={Colors.peptide} />
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
                {formatDateLabel(timestamp)}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {formatTime(timestamp)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dateArrow, isToday(timestamp) && styles.arrowDisabled]}
              onPress={() => adjustDate(1)}
              disabled={isToday(timestamp)}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={isToday(timestamp) ? colors.border : Colors.peptide}
              />
            </TouchableOpacity>
          </View>

          {/* Mood */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>MOOD</Text>
          <View style={[styles.moodRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[1, 2, 3, 4, 5].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.moodBtn, mood === m && { backgroundColor: Colors.peptide + '20', borderRadius: 12 }]}
                onPress={() => setMood(m)}
              >
                <Text style={[styles.moodEmoji, mood === m && styles.moodEmojiActive]}>
                  {MOOD_EMOJIS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
            placeholder="e.g. Fasted, felt good, slight redness at site…"
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
              <Text style={styles.saveBtnText}>Save Dose</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toastVisible} inventoryLine={inventoryToast} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24, lineHeight: 22 },
  goLibraryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  goLibraryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  scroll: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 22, marginBottom: 8 },

  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectorBtnText: { fontSize: 16 },

  pickerDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { fontSize: 15, fontWeight: '500' },
  pickerItemSub: { fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  doseInput: { flex: 1 },
  notesInput: { height: 90, paddingTop: 12 },

  unitRow: { flexDirection: 'row', gap: 6 },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  unitBtnText: { fontSize: 14, fontWeight: '600' },

  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  siteBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  siteBtnText: { fontSize: 13, fontWeight: '500' },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dateArrow: { padding: 16 },
  arrowDisabled: { opacity: 0.3 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 16, fontWeight: '600' },
  timeLabel: { fontSize: 13, marginTop: 2 },

  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  moodBtn: { padding: 8 },
  moodEmoji: { fontSize: 28, opacity: 0.45 },
  moodEmojiActive: { opacity: 1, transform: [{ scale: 1.15 }] },

  saveBtn: { marginTop: 30, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },
  toastSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
});
