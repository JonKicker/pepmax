export type HealthKitSleepData = {
  totalHours: number;
  quality: number; // 1–5 mapped from sleep stages
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
};

export type HealthKitRecoveryData = {
  restingHR?: number;
  hrv?: number;
  sleep?: HealthKitSleepData;
};
