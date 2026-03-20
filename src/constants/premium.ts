/** Free tier limits — premium users bypass these. */
export const FREE_LIMITS = {
  PROGRESS_PHOTOS: 3,
  WORKOUT_TEMPLATES: 2,
};

/** Pro features listed in the Go Pro comparison screen. */
export const PRO_FEATURES: { id: string; label: string; freeAvailable: boolean }[] = [
  { id: 'logging',         label: 'Workout & nutrition logging',  freeAvailable: true },
  { id: 'programs',        label: 'Training programs',            freeAvailable: true },
  { id: 'recipes',         label: 'Recipe tracking',              freeAvailable: true },
  { id: 'history',         label: 'Dose & workout history',       freeAvailable: true },
  { id: 'barcode',         label: 'Barcode food scanner',         freeAvailable: true },
  { id: 'recon',           label: 'Recon calculator',             freeAvailable: true },
  { id: 'half_life',       label: 'Half-life blood level graphs', freeAvailable: false },
  { id: 'ai_insights',     label: 'AI training insights',         freeAvailable: false },
  { id: 'bare_minimum',    label: 'Bare Minimum workout mode',    freeAvailable: false },
  { id: 'effort_analysis', label: 'Effort & progress analysis',   freeAvailable: false },
  { id: 'micro_dashboard', label: 'Micronutrient dashboard',      freeAvailable: false },
  { id: 'adv_trends',      label: 'Advanced measurement trends',  freeAvailable: false },
];
