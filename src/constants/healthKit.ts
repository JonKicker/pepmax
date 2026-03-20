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

/** Sentinel stored in BodyWeightInput.note to mark entries imported from HealthKit.
 *  Used by logWeight() to prevent a Firestore→HealthKit→Firestore sync loop. */
export const HK_WEIGHT_SOURCE_MARKER = 'healthkit';

/** AsyncStorage key for caching the user's healthKitEnabled preference.
 *  Lets isHKEnabled() return synchronously before the auth profile loads. */
export const HK_ENABLED_STORAGE_KEY = '@pepmax_hk_enabled';
