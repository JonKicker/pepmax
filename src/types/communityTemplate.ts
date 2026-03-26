import { Timestamp } from 'firebase/firestore';
import type { Unit } from './peptide';
import type {
  IncrementFrequency,
  InjectionFrequency,
  DayOfWeek,
  TaperConfig,
} from './cycle';
import type { TemplateExercise } from './template';

// ─── Category & status enums ─────────────────────────────────────────────────

export type TemplateCategory = 'peptide_cycle' | 'workout' | 'nutrition_plan';

export type TemplateStatus = 'published' | 'flagged' | 'removed';

export type ReviewStatus = 'active' | 'flagged';

export type ReportReason = 'inappropriate' | 'dangerous' | 'spam' | 'other';

export type OutcomeNotes = 'yes' | 'partially' | 'no';

// ─── Protocol data shapes ─────────────────────────────────────────────────────

/** Peptide cycle with all personal data stripped. */
export type PeptideCycleProtocol = {
  compoundName: string;
  unit: Unit;
  startingDose: number;
  incrementAmount: number;
  incrementFrequency: IncrementFrequency;
  maxDose: number;
  injectionFrequency: InjectionFrequency;
  preferredDays: DayOfWeek[];
  durationWeeks: number | null;
  taperEnabled: boolean;
  taperConfig: TaperConfig | null;
};

/** Workout template with personal strength data stripped. */
export type WorkoutProtocol = {
  name: string;
  exercises: Omit<TemplateExercise, 'targetWeight'>[];
  muscleGroups: string[];
  estimatedDuration: number;
};

export type SampleMeal = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Nutrition plan — macro targets + curated sample meals. */
export type NutritionProtocol = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sampleMeals: SampleMeal[];
};

/** Discriminated union — one shape per category. */
export type ProtocolData =
  | { category: 'peptide_cycle'; data: PeptideCycleProtocol }
  | { category: 'workout'; data: WorkoutProtocol }
  | { category: 'nutrition_plan'; data: NutritionProtocol };

// ─── Community template document ─────────────────────────────────────────────

export type CommunityTemplate = {
  id: string;
  category: TemplateCategory;
  title: string;
  description: string;
  tags: string[];
  /** SHA-256 hash of uid — consistent but not reversible. */
  anonymousAuthorId: string;
  protocolData: ProtocolData;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: TemplateStatus;
  importCount: number;
  averageRating: number;
  reviewCount: number;
  reportCount: number;
};

export type PublishTemplateInput = {
  category: TemplateCategory;
  title: string;
  description: string;
  tags: string[];
  protocolData: ProtocolData;
};

// ─── Review document (/templates/{id}/reviews/{rid}) ─────────────────────────

export type TemplateReview = {
  id: string;
  anonymousReviewerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text?: string;
  outcomeNotes?: OutcomeNotes;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: ReviewStatus;
};

// ─── Report document (/reports/{id}) ─────────────────────────────────────────

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export type TemplateReport = {
  id: string;
  templateId: string;
  /** Hashed reporter uid — not raw uid. */
  reporterId: string;
  reason: ReportReason;
  details?: string;
  createdAt: Timestamp;
  status: ReportStatus;
};

// ─── User imported template (/users/{uid}/importedTemplates/{id}) ─────────────

export type ImportedTemplate = {
  id: string;
  templateId: string;
  templateTitle: string;
  category: TemplateCategory;
  importedAt: Timestamp;
  /** True if the user customised the imported protocol. */
  modified: boolean;
  /** Firestore doc ID of the copy in users/{uid}/cycles|workoutTemplates|recipes. */
  localCopyRef: string;
};
