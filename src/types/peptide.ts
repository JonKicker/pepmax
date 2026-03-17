import { Timestamp } from 'firebase/firestore';

export type Unit = 'mg' | 'mcg' | 'IU';
export const UNITS: Unit[] = ['mg', 'mcg', 'IU'];

export type Frequency = 'daily' | 'everyOtherDay' | '3xPerWeek' | 'custom';
export const FREQUENCIES: Frequency[] = ['daily', 'everyOtherDay', '3xPerWeek', 'custom'];

export type InjectionSite =
  | 'leftDelt'
  | 'rightDelt'
  | 'leftGlute'
  | 'rightGlute'
  | 'leftQuad'
  | 'rightQuad'
  | 'abdomenLeft'
  | 'abdomenRight'
  | 'other';

export const INJECTION_SITES: InjectionSite[] = [
  'leftDelt',
  'rightDelt',
  'leftGlute',
  'rightGlute',
  'leftQuad',
  'rightQuad',
  'abdomenLeft',
  'abdomenRight',
  'other',
];

export const INJECTION_SITE_LABELS: Record<InjectionSite, string> = {
  leftDelt: 'Left Delt',
  rightDelt: 'Right Delt',
  leftGlute: 'Left Glute',
  rightGlute: 'Right Glute',
  leftQuad: 'Left Quad',
  rightQuad: 'Right Quad',
  abdomenLeft: 'Abdomen L',
  abdomenRight: 'Abdomen R',
  other: 'Other',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  everyOtherDay: 'Every Other Day',
  '3xPerWeek': '3× / Week',
  custom: 'Custom',
};

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
};

export type Peptide = {
  id: string;
  name: string;
  defaultDose: number;
  unit: Unit;
  frequency: Frequency;
  customDays?: string[]; // e.g. ['Mon', 'Wed', 'Fri'] when frequency === 'custom'
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Dose = {
  id: string;
  peptideId: string;
  peptideName: string;
  amount: number;
  unit: Unit;
  site: InjectionSite;
  siteOther?: string; // free-text when site === 'other'
  timestamp: Timestamp;
  mood: number; // 1–5
  notes: string;
  createdAt: Timestamp;
};
