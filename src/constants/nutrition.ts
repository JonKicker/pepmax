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
  vitaminB1: 1165,
  vitaminB2: 1166,
  vitaminB3: 1167,
  vitaminB6: 1175,
  vitaminB12: 1178,
  vitaminE: 1109,
  vitaminK: 1185,
  folate: 1177,
  phosphorus: 1091,
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
  vitaminB1: 1.2,   // mg
  vitaminB2: 1.3,   // mg
  vitaminB3: 16,    // mg
  vitaminB6: 1.7,   // mg
  vitaminB12: 2.4,  // mcg
  vitaminE: 15,     // mg
  vitaminK: 120,    // mcg
  folate: 400,      // mcg
  phosphorus: 1250, // mg
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
  vitaminB1: 'Vitamin B1 (Thiamin)',
  vitaminB2: 'Vitamin B2 (Riboflavin)',
  vitaminB3: 'Vitamin B3 (Niacin)',
  vitaminB6: 'Vitamin B6',
  vitaminB12: 'Vitamin B12',
  vitaminE: 'Vitamin E',
  vitaminK: 'Vitamin K',
  folate: 'Folate',
  phosphorus: 'Phosphorus',
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
  vitaminB1: 'mg',
  vitaminB2: 'mg',
  vitaminB3: 'mg',
  vitaminB6: 'mg',
  vitaminB12: 'mcg',
  vitaminE: 'mg',
  vitaminK: 'mcg',
  folate: 'mcg',
  phosphorus: 'mg',
};
