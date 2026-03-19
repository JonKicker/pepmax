import { Stack } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';

export default function NutritionLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: Colors.nutrition,
        headerTitleStyle: { color: colors.textPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Nutrition' }} />
      <Stack.Screen name="add-food" options={{ title: 'Add Food' }} />
      <Stack.Screen name="food-detail" options={{ title: 'Food Detail' }} />
      <Stack.Screen name="manual-entry" options={{ title: 'Manual Entry' }} />
      <Stack.Screen name="barcode-scan" options={{ title: 'Scan Barcode', presentation: 'modal' }} />
      <Stack.Screen name="history" options={{ title: 'Nutrition History' }} />
      <Stack.Screen name="settings" options={{ title: 'Nutrition Settings' }} />
      <Stack.Screen name="my-recipes" options={{ title: 'My Recipes' }} />
      <Stack.Screen name="create-recipe" options={{ title: 'Create Recipe' }} />
      <Stack.Screen name="micros" options={{ title: 'Micronutrients' }} />
    </Stack>
  );
}
