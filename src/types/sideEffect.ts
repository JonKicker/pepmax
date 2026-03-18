import type { Timestamp } from 'firebase/firestore';

export type SideEffectSeverity = 'mild' | 'moderate' | 'severe';
export const SEVERITIES: SideEffectSeverity[] = ['mild', 'moderate', 'severe'];

export const SIDE_EFFECT_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: '🤢', label: 'Nausea' },
  { emoji: '😴', label: 'Fatigue' },
  { emoji: '🤕', label: 'Headache' },
  { emoji: '💉', label: 'Injection pain' },
  { emoji: '😰', label: 'Anxiety' },
  { emoji: '🔥', label: 'Flushing' },
  { emoji: '🤮', label: 'Vomiting' },
  { emoji: '💫', label: 'Dizziness' },
];

export type SideEffect = {
  id: string;
  timestamp: Timestamp;
  emoji: string;
  label: string;
  severity: SideEffectSeverity;
  notes: string;
  peptideId?: string;
  peptideName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
