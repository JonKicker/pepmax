import type { Timestamp } from 'firebase/firestore';

export type ProfileEquipment =
  | 'Barbell'
  | 'Dumbbells'
  | 'Kettlebells'
  | 'Pull-up Bar'
  | 'Dip Station'
  | 'Flat Bench'
  | 'Adjustable Bench'
  | 'Squat Rack/Power Rack'
  | 'Smith Machine'
  | 'Cable Machine'
  | 'Lat Pulldown'
  | 'Leg Press'
  | 'Leg Curl/Extension'
  | 'Chest Fly Machine'
  | 'Rowing Machine'
  | 'Resistance Bands'
  | 'TRX/Suspension Trainer'
  | 'Medicine Ball'
  | 'Ab Wheel';

export const ALL_EQUIPMENT: ProfileEquipment[] = [
  'Barbell',
  'Dumbbells',
  'Kettlebells',
  'Pull-up Bar',
  'Dip Station',
  'Flat Bench',
  'Adjustable Bench',
  'Squat Rack/Power Rack',
  'Smith Machine',
  'Cable Machine',
  'Lat Pulldown',
  'Leg Press',
  'Leg Curl/Extension',
  'Chest Fly Machine',
  'Rowing Machine',
  'Resistance Bands',
  'TRX/Suspension Trainer',
  'Medicine Ball',
  'Ab Wheel',
];

export interface EquipmentProfile {
  id: string;
  name: string;
  isPreset: boolean;
  equipment: ProfileEquipment[];
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type EquipmentProfileInput = Omit<EquipmentProfile, 'id' | 'createdAt' | 'updatedAt'>;
