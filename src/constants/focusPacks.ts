export type FocusPack = { id: string; label: string; nutrients: string[] };

export const FOCUS_PACKS: FocusPack[] = [
  { id: 'all', label: 'All', nutrients: [] },
  {
    id: 'athletic',
    label: 'Athletic Performance',
    nutrients: ['iron', 'magnesium', 'potassium', 'sodium', 'vitaminB12', 'vitaminD'],
  },
  {
    id: 'vegan',
    label: 'Vegan Essentials',
    nutrients: ['vitaminB12', 'iron', 'zinc', 'vitaminD', 'calcium'],
  },
  {
    id: 'bone',
    label: 'Bone Health',
    nutrients: ['calcium', 'vitaminD', 'vitaminK', 'magnesium', 'phosphorus'],
  },
  {
    id: 'immune',
    label: 'Immune Support',
    nutrients: ['vitaminC', 'vitaminD', 'zinc', 'vitaminA'],
  },
];
