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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { saveRecipe, updateRecipe, getRecipe } from '../../../src/services/recipeService';
import { computeRecipeTotals, computePerServing, recalculateMacros } from '../../../src/utils/nutrition';
import type { RecipeIngredient } from '../../../src/types/recipe';

// ─── Ingredient Row ───────────────────────────────────────────────────────────

function IngredientRow({
  ingredient,
  index,
  total,
  onAmountChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  colors,
}: {
  ingredient: RecipeIngredient;
  index: number;
  total: number;
  onAmountChange: (id: string, amount: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (id: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.ingredientRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.ingLeft}>
        <Text style={[styles.ingName, { color: colors.textPrimary }]} numberOfLines={1}>
          {ingredient.foodName}
        </Text>
        {!!ingredient.brand && (
          <Text style={[styles.ingBrand, { color: colors.textSecondary }]} numberOfLines={1}>
            {ingredient.brand}
          </Text>
        )}
        <Text style={[styles.ingMacros, { color: colors.textSecondary }]}>
          {ingredient.calories} kcal · P {ingredient.protein}g · C {ingredient.carbs}g · F {ingredient.fat}g
        </Text>
      </View>
      <View style={styles.ingRight}>
        <View style={styles.ingAmountRow}>
          <TextInput
            style={[styles.ingAmountInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            value={String(ingredient.amountG)}
            onChangeText={(v) => onAmountChange(ingredient.id, v)}
            keyboardType="decimal-pad"
            returnKeyType="done"
            maxLength={6}
          />
          <Text style={[styles.ingUnit, { color: colors.textSecondary }]}>{ingredient.unit}</Text>
        </View>
        <View style={styles.ingActions}>
          <TouchableOpacity
            onPress={() => onMoveUp(index)}
            disabled={index === 0}
            style={[styles.ingActionBtn, { opacity: index === 0 ? 0.3 : 1 }]}
          >
            <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMoveDown(index)}
            disabled={index === total - 1}
            style={[styles.ingActionBtn, { opacity: index === total - 1 ? 0.3 : 1 }]}
          >
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(ingredient.id)} style={styles.ingActionBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateRecipeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { recipeId, newIngredient } = useLocalSearchParams<{
    recipeId?: string;
    newIngredient?: string;
  }>();

  const [name, setName] = useState('');
  const [servings, setServings] = useState('1');
  const [isBatchCook, setIsBatchCook] = useState(false);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track processed ingredient IDs to prevent double-adding from param re-renders
  const processedIngredientIds = useRef<Set<string>>(new Set());

  // Load existing recipe for edit mode
  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    getRecipe(recipeId).then((r) => {
      setLoading(false);
      if (r.data) {
        setName(r.data.name);
        setServings(String(r.data.servings));
        setIsBatchCook(r.data.isBatchCook);
        setIngredients(r.data.ingredients);
      }
    });
  }, [recipeId]);

  // Handle new ingredient passed back from food-detail
  useEffect(() => {
    if (!newIngredient) return;
    try {
      const data = JSON.parse(newIngredient);
      if (!data.id || processedIngredientIds.current.has(data.id)) return;
      // Validate all required numeric fields are finite before accepting
      const numericFields = ['amountG', 'calories', 'protein', 'carbs', 'fat', 'calories100g', 'protein100g', 'carbs100g', 'fat100g'] as const;
      if (numericFields.some((f) => !isFinite(Number(data[f])))) return;
      if (typeof data.foodName !== 'string' || !data.foodName.trim()) return;
      processedIngredientIds.current.add(data.id);
      setIngredients((prev) => [...prev, data as RecipeIngredient]);
    } catch {
      // ignore malformed param
    }
  }, [newIngredient]);

  const numServings = parseFloat(servings);
  const validServings = isFinite(numServings) && numServings > 0;

  const totals = computeRecipeTotals(ingredients);
  const perServing = computePerServing(totals, validServings ? numServings : 1);

  const handleAmountChange = (id: string, amountStr: string) => {
    const amount = parseFloat(amountStr);
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        if (!isFinite(amount) || amount <= 0) return { ...ing, amountG: parseFloat(amountStr) || 0 };
        const scaled = recalculateMacros(
          { calories: ing.calories100g, protein: ing.protein100g, carbs: ing.carbs100g, fat: ing.fat100g },
          100,
          amount
        );
        return {
          ...ing,
          amountG: amount,
          calories: scaled.calories,
          protein: scaled.protein,
          carbs: scaled.carbs,
          fat: scaled.fat,
        };
      })
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setIngredients((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const handleMoveDown = (index: number) => {
    setIngredients((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const handleDelete = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleAddIngredient = () => {
    router.push({
      pathname: '/(tabs)/nutrition/add-food',
      params: { mode: 'ingredient' },
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a recipe name.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('No ingredients', 'Add at least one ingredient.');
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const recipeData = {
      name: name.trim(),
      servings: validServings ? numServings : 1,
      isBatchCook,
      ingredients,
      totalNutrition: totals,
      perServingNutrition: perServing,
    };

    const result = recipeId
      ? await updateRecipe(recipeId, recipeData)
      : await saveRecipe(recipeData);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.nutrition} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: recipeId ? 'Edit Recipe' : 'Create Recipe' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Recipe name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>RECIPE NAME</Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chicken Rice Bowl"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            maxLength={80}
          />

          {/* Servings */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>SERVINGS</Text>
          <View style={styles.servingsRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                const v = Math.max(1, (parseFloat(servings) || 1) - 1);
                setServings(String(v));
              }}
            >
              <Ionicons name="remove" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.servingsInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={servings}
              onChangeText={setServings}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={4}
            />
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                const v = (parseFloat(servings) || 1) + 1;
                setServings(String(v));
              }}
            >
              <Ionicons name="add" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Batch cook */}
          <View style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Batch Cook</Text>
              <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                Enable fraction serving (1/2, 1/3, etc.)
              </Text>
            </View>
            <Switch
              value={isBatchCook}
              onValueChange={setIsBatchCook}
              trackColor={{ true: Colors.nutrition }}
              thumbColor="white"
            />
          </View>

          {/* Ingredients */}
          <View style={styles.ingHeader}>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0, marginTop: 0 }]}>
              INGREDIENTS ({ingredients.length})
            </Text>
          </View>

          {ingredients.map((ing, i) => (
            <IngredientRow
              key={ing.id}
              ingredient={ing}
              index={i}
              total={ingredients.length}
              onAmountChange={handleAmountChange}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDelete={handleDelete}
              colors={colors}
            />
          ))}

          {ingredients.length === 0 && (
            <View style={[styles.emptyIng, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="nutrition-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyIngText, { color: colors.textSecondary }]}>
                No ingredients yet. Tap below to add.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addIngBtn, { borderColor: Colors.nutrition }]}
            onPress={handleAddIngredient}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.nutrition} />
            <Text style={[styles.addIngText, { color: Colors.nutrition }]}>Add Ingredient</Text>
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: Colors.nutrition }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>{recipeId ? 'Save Changes' : 'Save Recipe'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Sticky footer: totals */}
        {ingredients.length > 0 && (
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total:</Text>
              <Text style={[styles.footerValue, { color: colors.textPrimary }]}>
                {totals.calories} kcal · P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
              </Text>
            </View>
            <View style={styles.footerRow}>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Per serving:</Text>
              <Text style={[styles.footerValue, { color: Colors.nutrition }]}>
                {perServing.calories} kcal · P {perServing.protein}g · C {perServing.carbs}g · F {perServing.fat}g
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },

  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
  },

  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchSub: { fontSize: 12, marginTop: 2 },

  ingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },

  ingredientRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  ingLeft: { flex: 1 },
  ingName: { fontSize: 14, fontWeight: '600' },
  ingBrand: { fontSize: 12, marginTop: 1 },
  ingMacros: { fontSize: 11, marginTop: 4 },
  ingRight: { alignItems: 'flex-end', gap: 8 },
  ingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ingAmountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    width: 64,
    textAlign: 'center',
  },
  ingUnit: { fontSize: 12 },
  ingActions: { flexDirection: 'row', gap: 4 },
  ingActionBtn: { padding: 4 },

  emptyIng: {
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  emptyIngText: { fontSize: 13, textAlign: 'center' },

  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 4,
  },
  addIngText: { fontSize: 15, fontWeight: '600' },

  saveBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLabel: { fontSize: 12, fontWeight: '600', width: 80 },
  footerValue: { fontSize: 13, fontWeight: '600', flex: 1 },
});
