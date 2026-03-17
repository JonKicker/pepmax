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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { logFood, addFavorite, removeFavorite, getFavorites } from '../../../src/services/nutritionService';
import { toLocalDateKey, recalculateMacros } from '../../../src/utils/nutrition';
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '../../../src/types/nutrition';
import type { FoodNavPayload, MealSlot } from '../../../src/types/nutrition';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, opacity]);
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color="white" />
      <Text style={styles.toastText}>Food logged! ✓</Text>
    </Animated.View>
  );
}

// ─── Nutrient Row ─────────────────────────────────────────────────────────────

function NutrientRow({
  label,
  value,
  unit,
  bold,
  color,
  colors,
}: {
  label: string;
  value: number | null;
  unit: string;
  bold?: boolean;
  color?: string;
  colors: Theme['colors'];
}) {
  return (
    <View style={[styles.nutrientRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.nutrientLabel, bold && styles.nutrientBold, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.nutrientValue, bold && styles.nutrientBold, { color: color ?? colors.textPrimary }]}>
        {value === null ? '—' : `${Math.round(value * 10) / 10} ${unit}`}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FoodDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { foodData: rawFoodData, mealSlot: paramSlot } = useLocalSearchParams<{
    foodData: string;
    mealSlot?: MealSlot;
  }>();

  // Parse the stripped nav payload
  const food: FoodNavPayload | null = (() => {
    try { return JSON.parse(rawFoodData ?? ''); } catch { return null; }
  })();

  const [mealSlot, setMealSlot] = useState<MealSlot>(
    (MEAL_SLOTS.includes(paramSlot as MealSlot) ? paramSlot : 'breakfast') as MealSlot
  );
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // Serving size — default to the product's serving size in grams
  const baseServingSizeG = food?.servingSizeG ?? 100;
  const [servingInput, setServingInput] = useState(String(baseServingSizeG));
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'g');

  // Computed macros (recalculated on serving change using pure utility)
  const baseMacros = {
    calories: food?.calories100g ?? 0,
    protein: food?.protein100g ?? 0,
    carbs: food?.carbs100g ?? 0,
    fat: food?.fat100g ?? 0,
  };
  const servingG = parseFloat(servingInput);
  const validServing = isFinite(servingG) && servingG > 0;
  const scaled = validServing
    ? recalculateMacros(baseMacros, 100, servingG)
    : baseMacros;

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // Check if already favorited on mount
  useEffect(() => {
    if (!food) return;
    getFavorites().then((r) => {
      if (!r.data) return;
      const match = r.data.find(
        (f) => f.foodName.toLowerCase() === food.name.toLowerCase()
      );
      if (match) { setIsFavorite(true); setFavoriteId(match.id); }
    });
  }, []);

  if (!food) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Invalid food data.</Text>
      </View>
    );
  }

  const toggleFavorite = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFavorite && favoriteId) {
      const result = await removeFavorite(favoriteId);
      if (!result.error) { setIsFavorite(false); setFavoriteId(null); }
    } else {
      const result = await addFavorite({
        foodName: food.name,
        brand: food.brand || undefined,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        servingSize: validServing ? servingG : baseServingSizeG,
        servingUnit,
      });
      if (!result.error && result.data) { setIsFavorite(true); setFavoriteId(result.data); }
    }
  };

  const handleLog = async () => {
    if (!validServing) {
      Alert.alert('Invalid serving', 'Please enter a valid serving size greater than 0.');
      return;
    }
    if (!servingUnit.trim()) {
      Alert.alert('Serving unit required', 'Please enter a serving unit (e.g. g, ml, serving).');
      return;
    }

    setSaving(true);
    const result = await logFood({
      date: toLocalDateKey(),
      mealSlot,
      foodName: food.name,
      brand: food.brand || undefined,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      servingSize: servingG,
      servingUnit: servingUnit.trim(),
      barcode: food.barcode || undefined,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', 'Failed to log food. Please try again.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If starred, also save/update favorite with current serving
    if (isFavorite && favoriteId) {
      await addFavorite({
        foodName: food.name,
        brand: food.brand || undefined,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        servingSize: servingG,
        servingUnit: servingUnit.trim(),
      });
    }

    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      router.back();
      router.back(); // back through add-food to dashboard
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.foodName, { color: colors.textPrimary }]} numberOfLines={2}>
                {food.name}
              </Text>
              {!!food.brand && (
                <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>{food.brand}</Text>
              )}
            </View>
            <TouchableOpacity onPress={toggleFavorite} style={styles.starBtn}>
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={26}
                color={isFavorite ? Colors.warning : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Serving size */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SERVING SIZE</Text>
          <View style={styles.servingRow}>
            <TextInput
              style={[
                styles.servingInput,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
              ]}
              value={servingInput}
              onChangeText={setServingInput}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={8}
            />
            <TextInput
              style={[
                styles.servingUnitInput,
                { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
              ]}
              value={servingUnit}
              onChangeText={setServingUnit}
              placeholder="g"
              placeholderTextColor={colors.textSecondary}
              maxLength={16}
              returnKeyType="done"
            />
          </View>
          {!validServing && servingInput.length > 0 && (
            <Text style={[styles.inputError, { color: Colors.error }]}>
              Enter a valid amount greater than 0
            </Text>
          )}

          {/* Nutrition facts */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NUTRITION FACTS</Text>
          <View style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <NutrientRow label="Calories" value={scaled.calories} unit="kcal" bold color={Colors.nutrition} colors={colors} />
            <NutrientRow label="Protein" value={scaled.protein} unit="g" colors={colors} />
            <NutrientRow label="Carbohydrates" value={scaled.carbs} unit="g" colors={colors} />
            <NutrientRow label="Fat" value={scaled.fat} unit="g" colors={colors} />
            {food.fiber100g !== null && (
              <NutrientRow label="Fiber" value={recalculateMacros({ calories: 0, protein: 0, carbs: food.fiber100g, fat: 0 }, 100, validServing ? servingG : baseServingSizeG).carbs} unit="g" colors={colors} />
            )}
            {food.sugar100g !== null && (
              <NutrientRow label="Sugars" value={recalculateMacros({ calories: 0, protein: 0, carbs: food.sugar100g, fat: 0 }, 100, validServing ? servingG : baseServingSizeG).carbs} unit="g" colors={colors} />
            )}
            {food.sodium100g !== null && (
              <NutrientRow label="Sodium" value={recalculateMacros({ calories: 0, protein: 0, carbs: 0, fat: food.sodium100g * 1000 }, 100, validServing ? servingG : baseServingSizeG).fat} unit="mg" colors={colors} />
            )}
          </View>

          {/* Meal slot */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEAL</Text>
          <TouchableOpacity
            style={[styles.slotBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSlotPicker((v) => !v)}
          >
            <Text style={[styles.slotBtnText, { color: colors.textPrimary }]}>{MEAL_SLOT_LABELS[mealSlot]}</Text>
            <Ionicons name={showSlotPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {showSlotPicker && (
            <View style={[styles.slotDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {MEAL_SLOTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.slotItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setMealSlot(s); setShowSlotPicker(false); }}
                >
                  <Text style={[styles.slotItemText, { color: s === mealSlot ? Colors.nutrition : colors.textPrimary }]}>
                    {MEAL_SLOT_LABELS[s]}
                  </Text>
                  {s === mealSlot && <Ionicons name="checkmark" size={16} color={Colors.nutrition} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Log button */}
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: Colors.nutrition }]}
            onPress={handleLog}
            disabled={saving}
            activeOpacity={0.85}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 60 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  foodName: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  foodBrand: { fontSize: 14, marginTop: 4 },
  starBtn: { padding: 4 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },

  servingRow: { flexDirection: 'row', gap: 10 },
  servingInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700' },
  servingUnitInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  inputError: { fontSize: 12, marginTop: 4 },

  nutritionCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  nutrientLabel: { fontSize: 14 },
  nutrientValue: { fontSize: 14 },
  nutrientBold: { fontWeight: '700', fontSize: 16 },

  slotBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  slotBtnText: { fontSize: 15, fontWeight: '600' },
  slotDropdown: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  slotItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  slotItemText: { fontSize: 15 },

  logBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  logBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  toast: { position: 'absolute', bottom: 48, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
