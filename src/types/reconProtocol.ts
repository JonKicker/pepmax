export type SyringeType = 'U100' | 'U40' | 'mL';

export const SYRINGE_TYPES: SyringeType[] = ['U100', 'U40', 'mL'];

export const SYRINGE_TYPE_LABELS: Record<SyringeType, string> = {
  U100: 'U-100',
  U40: 'U-40',
  mL: 'Standard mL',
};

/** How many syringe units equal 1 mL */
export const SYRINGE_UNITS_PER_ML: Record<SyringeType, number | null> = {
  U100: 100,
  U40: 40,
  mL: null, // mL syringes show mL directly
};

export const WATER_PRESETS = [1, 2, 3] as const;

export type ReconProtocol = {
  id: string;
  name: string;
  vialMg: number;
  waterMl: number;
  doseMg: number;
  syringeType: SyringeType;
  createdAt: unknown;
  updatedAt: unknown;
};
