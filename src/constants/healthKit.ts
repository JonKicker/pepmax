import {
  HKQuantityTypeIdentifier,
  HKCategoryTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

export const HK_READ_PERMISSIONS: readonly (
  | HKQuantityTypeIdentifier
  | HKCategoryTypeIdentifier
)[] = [
  HKCategoryTypeIdentifier.sleepAnalysis,
  HKQuantityTypeIdentifier.restingHeartRate,
  HKQuantityTypeIdentifier.heartRateVariabilitySDNN,
  HKQuantityTypeIdentifier.stepCount,
  HKQuantityTypeIdentifier.bodyMass,
  HKQuantityTypeIdentifier.bodyFatPercentage,
] as const;

export const HK_WRITE_PERMISSIONS: readonly HKQuantityTypeIdentifier[] = [
  HKQuantityTypeIdentifier.dietaryEnergyConsumed,
  HKQuantityTypeIdentifier.dietaryProtein,
  HKQuantityTypeIdentifier.dietaryCarbohydrates,
  HKQuantityTypeIdentifier.dietaryFatTotal,
  HKQuantityTypeIdentifier.bodyMass,
  HKQuantityTypeIdentifier.bodyFatPercentage,
] as const;
