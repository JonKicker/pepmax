import React, { useState, useRef } from 'react';
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
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { logFood } from '../../../src/services/nutritionService';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { DEFAULT_MEAL_SLOTS, getSlotLabel } from '../../../src/types/nutrition';
import type { MealSlotConfig } from '../../../src/types/nutrition';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, opacity]);
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color="white" />
      <Text style={styles.toastText}>Food logged! ✓</Text>
    </Animated.View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  maxLength,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  numeric?: boolean;
  maxLength?: number;
  colors: Theme['colors'];
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        returnKeyType="done"
        maxLength={maxLength ?? (numeric ? 10 : 80)}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualEntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userProfile } = useAuth();
  const activeSlots: MealSlotConfig[] = userProfile?.mealSlots ?? DEFAULT_MEAL_SLOTS;

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const [mealSlot, setMealSlot] = useState<string>(activeSlots[0]?.id ?? 'breakfast');
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // ─── Validate a required numeric field (Ray's pattern: isNaN || !isFinite || <= 0)
  function parseNumeric(raw: string, fieldName: string): number | null {
    const n = parseFloat(raw);
    if (!raw.trim() || isNaN(n) || !isFinite(n) || n <= 0) {
      Alert.alert('Invalid value', `${fieldName} must be a number greater than 0.`);
      return null;
    }
    return n;
  }

  // ─── Validate a non-negative numeric field (protein/carbs/fat can be 0)
  function parseNonNegative(raw: string, fieldName: string): number | null {
    const n = parseFloat(raw);
    if (!raw.trim() || isNaN(n) || !isFinite(n) || n < 0) {
      Alert.alert('Invalid value', `${fieldName} must be a number 0 or greater.`);
      return null;
    }
    return n;
  }

  const handleLog = async () => {
    // Food name: trim + non-empty
    const name = foodName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a food name.');
      return;
    }

    const cal = parseNumeric(calories, 'Calories');
    if (cal === null) return;

    const prot = parseNonNegative(protein, 'Protein');
    if (prot === null) return;

    const carb = parseNonNegative(carbs, 'Carbs');
    if (carb === null) return;

    const f = parseNonNegative(fat, 'Fat');
    if (f === null) return;

    const sizeG = parseNumeric(servingSize, 'Serving size');
    if (sizeG === null) return;

    const unit = servingUnit.trim();
    if (!unit) {
      Alert.alert('Serving unit required', 'Please enter a serving unit (e.g. g, cup, piece).');
      return;
    }

    setSaving(true);
    const result = await logFood({
      date: toLocalDateKey(),
      mealSlot,
      foodName: name,
      calories: cal,
      protein: prot,
      carbs: carb,
      fat: f,
      servingSize: sizeG,
      servingUnit: unit,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', 'Failed to log food. Please try again.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      router.back();
      router.back();
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Field label="FOOD NAME *" value={foodName} onChange={setFoodName} placeholder="e.g. Chicken Breast" maxLength={100} colors={colors} />
          <Field label="CALORIES (kcal) *" value={calories} onChange={setCalories} placeholder="200" numeric colors={colors} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="PROTEIN (g) *" value={protein} onChange={setProtein} placeholder="30" numeric colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="CARBS (g) *" value={carbs} onChange={setCarbs} placeholder="0" numeric colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="FAT (g) *" value={fat} onChange={setFat} placeholder="5" numeric colors={colors} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Field label="SERVING SIZE *" value={servingSize} onChange={setServingSize} placeholder="100" numeric colors={colors} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="UNIT *" value={servingUnit} onChange={setServingUnit} placeholder="g" maxLength={16} colors={colors} />
            </View>
          </View>

          {/* Meal slot */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>MEAL *</Text>
          <TouchableOpacity
            style={[styles.slotBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSlotPicker((v) => !v)}
          >
            <Text style={[styles.slotBtnText, { color: colors.textPrimary }]}>{getSlotLabel(mealSlot, activeSlots)}</Text>
            <Ionicons name={showSlotPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showSlotPicker && (
            <View style={[styles.slotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {activeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.slotItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setMealSlot(slot.id); setShowSlotPicker(false); }}
                >
                  <Text style={[styles.slotItemText, { color: slot.id === mealSlot ? Colors.nutrition : colors.textPrimary }]}>
                    {slot.label}
                  </Text>
                  {slot.id === mealSlot && <Ionicons name="checkmark" size={16} color={Colors.nutrition} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: Colors.nutrition }]}
            onPress={handleLog}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.logBtnText}>Log Food</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={toastVisible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  row: { flexDirection: 'row', gap: 10 },
  fieldWrap: { marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 18 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },

  slotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 4 },
  slotBtnText: { fontSize: 15, fontWeight: '600' },
  slotDropdown: { borderWidth: 1, borderRadius: 10, marginBottom: 4, overflow: 'hidden' },
  slotItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  slotItemText: { fontSize: 15 },

  logBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  logBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  toast: { position: 'absolute', bottom: 48, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
