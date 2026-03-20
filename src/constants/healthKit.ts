import type { QuantityTypeIdentifierWriteable } from '@kingstinct/react-native-healthkit';
import type { CategoryTypeIdentifierWriteable } from '@kingstinct/react-native-healthkit';
import type { QuantityTypeIdentifier } from '@kingstinct/react-native-healthkit';
import type { CategoryTypeIdentifier } from '@kingstinct/react-native-healthkit';

// Identifiers to request read access
export const HK_READ_IDENTIFIERS: readonly (QuantityTypeIdentifier | CategoryTypeIdentifier)[] = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
] as const;

// Identifiers to request write access
export const HK_WRITE_IDENTIFIERS: readonly (
  | QuantityTypeIdentifierWriteable
  | CategoryTypeIdentifierWriteable
)[] = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
] as const;
