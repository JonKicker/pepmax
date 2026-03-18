import type { TemplateExercise } from '../types/template';

type PendingBareMinimum = {
  exercises: TemplateExercise[];
  timeCap: number;
  originalTotalSets: number;
};

let pending: PendingBareMinimum | null = null;

export function setPendingBareMinimum(data: PendingBareMinimum): void {
  pending = data;
}

export function consumePendingBareMinimum(): PendingBareMinimum | null {
  const data = pending;
  pending = null;
  return data;
}
