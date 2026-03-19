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
import Slider from '@react-native-community/slider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors, Theme } from '../../../src/constants/theme';
import { logFood, addFavorite, removeFavorite, getFavorites } from '../../../src/services/nutritionService';
import { toLocalDateKey, recalculateMacros, recalculateMicronutrients, getRDAPercent, getTrafficLight } from '../../../src/utils/nutrition';
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '../../../src/types/nutrition';
import { MICRONUTRIENT_LABELS, MICRONUTRIENT_UNITS } from '../../../src/constants/nutrition';
import type { FoodNavPayload, MealSlot, Micronutrients } from '../../../src/types/nutrition';

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

// ─── Micronutrient Row ────────────────────────────────────────────────────────

function MicronutrientRow({
  nutrientKey,
  value,
  colors,
}: {
  nutrientKey: string;
  value: number | null;
  colors: Theme['colors'];
}) {
  const label = MICRONUTRIENT_LABELS[nutrientKey] ?? nutrientKey;
  const unit = MICRONUTRIENT_UNITS[nutrientKey] ?? '';

  if (value === null) {
    return (
      <View style={[styles.nutrientRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.nutrientLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.nutrientValue, { color: colors.textSecondary, opacity: 0.5 }]}>—</Text>
      </View>
    );
  }

  const rdaPct = getRDAPercent(nutrientKey, value);
  const tier = rdaPct != null ? getTrafficLight(rdaPct) : 'dim';
  const badgeColor =
    tier === 'green' ? Colors.nutrition :
    tier === 'yellow' ? Colors.warning :
    colors.textSecondary;

  return (
    <View style={[styles.nutrientRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.nutrientLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.microRight}>
        <Text style={[styles.nutrientValue, { color: colors.textPrimary }]}>
          {Math.round(value * 10) / 10} {unit}
        </Text>
        {rdaPct != null && (
          <View style={[styles.rdaBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor + '55' }]}>
            <Text style={[styles.rdaText, { color: badgeColor }]}>
              {Math.round(rdaPct)}% DV
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'usda' | 'off' | undefined }) {
  if (source === 'usda') {
    return (
      <View style={[styles.sourceBadge, { backgroundColor: Colors.nutrition + '22', borderColor: Colors.nutrition + '55' }]}>
        <Ionicons name="checkmark-circle" size={11} color={Colors.nutrition} />
        <Text style={[styles.sourceBadgeText, { color: Colors.nutrition }]}>USDA Verified</Text>
      </View>
    );
  }
  if (source === 'off') {
    return (
      <View style={[styles.sourceBadge, { backgroundColor: '#88888822', borderColor: '#88888855' }]}>
        <Text style={[styles.sourceBadgeText, { color: '#888' }]}>Community</Text>
      </View>
    );
  }
  return null;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FoodDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { foodData: rawFoodData, mealSlot: paramSlot, fromScan, mode } = useLocalSearchParams<{
    foodData: string;
    mealSlot?: MealSlot;
    fromScan?: string;
    mode?: string;
  }>();

  const isIngredientMode = mode === 'ingredient';

  // Parse the stripped nav payload
  const food: FoodNavPayload | null = (() => {
    try { return JSON.parse(rawFoodData ?? ''); } catch { return null; }
  })();

  const [mealSlot, setMealSlot] = useState<MealSlot>(
    (MEAL_SLOTS.includes(paramSlot as MealSlot) ? paramSlot : 'breakfast') as MealSlot
  );
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [microExpanded, setMicroExpanded] = useState(false);

  // Serving size — default to the product's serving size in grams (clamped 10-500)
  const baseServingSizeG = food?.servingSizeG ?? 100;
  const defaultServing = Math.min(500, Math.max(10, baseServingSizeG));
  const [sliderValue, setSliderValue] = useState(defaultServing);
  const [servingInput, setServingInput] = useState(String(defaultServing));
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'g');

  // Keep slider and text input in sync
  const handleSliderChange = (val: number) => {
    const rounded = Math.round(val / 5) * 5;
    setSliderValue(rounded);
    setServingInput(String(rounded));
  };

  const handleInputChange = (text: string) => {
    setServingInput(text);
    const parsed = parseFloat(text);
    if (isFinite(parsed) && parsed >= 10 && parsed <= 500) {
      setSliderValue(parsed);
    }
  };

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

  // Scaled micronutrients
  const scaledMicro: Micronutrients | null =
    food?.micronutrients100g && validServing
      ? recalculateMicronutrients(food.micronutrients100g, 100, servingG)
      : food?.micronutrients100g ?? null;

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
      if (!result.error && result.data) {
        setIsFavorite(true);
        setFavoriteId(result.data);
        analytics.track(AnalyticsEvent.FAVORITE_FOOD_SAVED);
      }
    }
  };

  const handleAddIngredient = () => {
    if (!validServing) {
      Alert.alert('Invalid serving', 'Please enter a valid serving size greater than 0.');
      return;
    }
    const ingredient = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      foodName: food!.name,
      brand: food!.brand || undefined,
      amountG: servingG,
      unit: servingUnit.trim() || 'g',
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      calories100g: food!.calories100g,
      protein100g: food!.protein100g,
      carbs100g: food!.carbs100g,
      fat100g: food!.fat100g,
    };
    router.navigate({
      pathname: '/(tabs)/nutrition/create-recipe',
      params: { newIngredient: JSON.stringify(ingredient) },
    });
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
      micronutrients: scaledMicro ?? undefined,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', 'Failed to log food. Please try again.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.track(AnalyticsEvent.FOOD_LOGGED, {
      meal_slot: mealSlot,
      method: food.source ?? 'search',
      calories: Math.round(scaled.calories),
    });

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
      if (fromScan === 'true') {
        router.navigate('/(tabs)/nutrition');
      } else {
        router.back();
        router.back(); // back through add-food to dashboard
      }
    }, 1200);
  };

  const hasMicronutrients =
    food.micronutrients100g != null &&
    Object.values(food.micronutrients100g).some((v) => v !== null);

  const microKeys = Object.keys(MICRONUTRIENT_LABELS);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.foodName, { color: colors.textPrimary }]} numberOfLines={2}>
                {food.name}
              </Text>
              {!!food.brand && (
                <Text style={[styles.foodBrand, { color: colors.textSecondary }]}>{food.brand}</Text>
              )}
              <SourceBadge source={food.foodSource} />
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

          {/* Slider */}
          <View style={[styles.sliderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={10}
              maximumValue={500}
              step={5}
              value={sliderValue}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={Colors.nutrition}
              maximumTrackTintColor={colors.border}
              thumbTintColor={Colors.nutrition}
            />
            <View style={styles.servingRow}>
              <TextInput
                style={[
                  styles.servingInput,
                  { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={servingInput}
                onChangeText={handleInputChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={8}
              />
              <TextInput
                style={[
                  styles.servingUnitInput,
                  { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
                ]}
                value={servingUnit}
                onChangeText={setServingUnit}
                placeholder="g"
                placeholderTextColor={colors.textSecondary}
                maxLength={16}
                returnKeyType="done"
              />
            </View>

            {/* Quick presets */}
            <View style={styles.presetsRow}>
              {[100, 150, 200].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.presetBtn,
                    { borderColor: sliderValue === g ? Colors.nutrition : colors.border },
                    sliderValue === g && { backgroundColor: Colors.nutrition + '15' },
                  ]}
                  onPress={() => handleSliderChange(g)}
                >
                  <Text style={[styles.presetText, { color: sliderValue === g ? Colors.nutrition : colors.textSecondary }]}>
                    {g}g
                  </Text>
                </TouchableOpacity>
              ))}
              {/* USDA descriptive portions */}
              {food.portions?.map((portion, i) => (
                <TouchableOpacity
                  key={`${portion.description}-${i}`}
                  style={[
                    styles.presetBtn,
                    styles.presetBtnWide,
                    { borderColor: sliderValue === portion.gramWeight ? Colors.nutrition : colors.border },
                    sliderValue === portion.gramWeight && { backgroundColor: Colors.nutrition + '15' },
                  ]}
                  onPress={() => handleSliderChange(portion.gramWeight)}
                >
                  <Text style={[styles.presetText, { color: sliderValue === portion.gramWeight ? Colors.nutrition : colors.textSecondary }]} numberOfLines={1}>
                    {portion.description} ({portion.gramWeight}g)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

          {/* Micronutrients collapsible */}
          {hasMicronutrients && (
            <>
              <TouchableOpacity
                style={[styles.microHeader, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setMicroExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>
                  MICRONUTRIENTS
                </Text>
                <Ionicons
                  name={microExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {microExpanded && scaledMicro && (
                <View style={[styles.nutritionCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                  {microKeys.map((key) => (
                    <MicronutrientRow
                      key={key}
                      nutrientKey={key}
                      value={(scaledMicro as Record<string, number | null>)[key] ?? null}
                      colors={colors}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Meal slot — hidden in ingredient mode */}
          {!isIngredientMode && (
            <>
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
            </>
          )}

          {/* Primary action button */}
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: Colors.nutrition }]}
            onPress={isIngredientMode ? handleAddIngredient : handleLog}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.logBtnText}>{isIngredientMode ? 'Add Ingredient' : 'Log Food'}</Text>
            )}
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
  foodBrand: { fontSize: 14, marginTop: 2 },
  starBtn: { padding: 4 },

  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 2,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '600' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },

  sliderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  servingRow: { flexDirection: 'row', gap: 10 },
  servingInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700' },
  servingUnitInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  inputError: { fontSize: 12, marginTop: 4 },

  presetsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetBtnWide: { maxWidth: '100%' },
  presetText: { fontSize: 12, fontWeight: '600' },

  nutritionCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  nutrientLabel: { fontSize: 14 },
  nutrientValue: { fontSize: 14 },
  nutrientBold: { fontWeight: '700', fontSize: 16 },

  microHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  microRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rdaBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  rdaText: { fontSize: 11, fontWeight: '700' },

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
