/**
 * USDA FoodData Central nutrient IDs and reference values.
 */

export const USDA_NUTRIENT_IDS: Record<string, number> = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  vitaminA: 1106,
  vitaminC: 1162,
  vitaminD: 1114,
  calcium: 1087,
  iron: 1089,
  potassium: 1092,
  sodium: 1093,
  magnesium: 1090,
  zinc: 1095,
};

/** Reference Daily Amounts used for % RDA calculation. */
export const RDA_VALUES: Record<string, number> = {
  vitaminA: 900,    // mcg
  vitaminC: 90,     // mg
  vitaminD: 20,     // mcg
  calcium: 1300,    // mg
  iron: 18,         // mg
  potassium: 4700,  // mg
  sodium: 2300,     // mg
  magnesium: 420,   // mg
  zinc: 11,         // mg
};

export const MICRONUTRIENT_LABELS: Record<string, string> = {
  vitaminA: 'Vitamin A',
  vitaminC: 'Vitamin C',
  vitaminD: 'Vitamin D',
  calcium: 'Calcium',
  iron: 'Iron',
  potassium: 'Potassium',
  sodium: 'Sodium',
  magnesium: 'Magnesium',
  zinc: 'Zinc',
};

export const MICRONUTRIENT_UNITS: Record<string, string> = {
  vitaminA: 'mcg',
  vitaminC: 'mg',
  vitaminD: 'mcg',
  calcium: 'mg',
  iron: 'mg',
  potassium: 'mg',
  sodium: 'mg',
  magnesium: 'mg',
  zinc: 'mg',
};
