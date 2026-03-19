import type { Timestamp } from 'firebase/firestore';

export type RecoveryEntry = {
  sleepQuality: number;   // 1-5
  sleepHours: number;     // 3-12
  energyLevel: number;    // 1-5
  effortScore: number;    // 10-100 (calculated)
  timestamp: Timestamp;
};
