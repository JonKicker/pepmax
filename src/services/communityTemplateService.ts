/**
 * Community template service.
 *
 * Handles publishing, browsing, importing, reviewing, and reporting
 * community protocol templates. First multi-user service in PepMax.
 *
 * All user-identifying data is replaced with a hashed anonymousId before
 * writing to Firestore. Personal fields (dates, body stats, IDs) are
 * stripped from protocol data before publishing.
 */
import {
  orderBy,
  limit,
  where,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  addGlobalDocument,
  getGlobalDocument,
  queryGlobalDocuments,
  updateGlobalDocument,
  addSubDocument,
  querySubDocuments,
  updateSubDocument,
  incrementField,
} from './firebase/communityFirestore';
import { addDocument } from './firebase/firestore';
import { COLLECTIONS } from './firebase/firestore';
import { getAnonymousId } from '../utils/anonymousId';
import { generateCyclePlan, toLocalDateStr } from '../utils/cyclePlanner';
import type { CyclePlannerInput } from '../utils/cyclePlanner';
import type { ServiceResult } from '../types/service';
import type {
  CommunityTemplate,
  PublishTemplateInput,
  TemplateReview,
  TemplateReport,
  ImportedTemplate,
  PeptideCycleProtocol,
  WorkoutProtocol,
  NutritionProtocol,
  ProtocolData,
  ReportReason,
  OutcomeNotes,
} from '../types/communityTemplate';
import type { Cycle } from '../types/cycle';
import type { WorkoutTemplate } from '../types/template';

// ─── Firestore collection paths ───────────────────────────────────────────────

export const COMMUNITY_COLLECTIONS = {
  TEMPLATES: 'templates',
  REPORTS: 'reports',
} as const;

export const TEMPLATE_PAGE_SIZE = 20;

export type SortOption = 'most_imported' | 'highest_rated' | 'newest';

export type QueryTemplatesOpts = {
  category?: CommunityTemplate['category'] | 'all';
  sortBy?: SortOption;
  cursor?: DocumentSnapshot | null;
};

// ─── PII stripping helpers ────────────────────────────────────────────────────

/**
 * Strip personal data from a Cycle, leaving only protocol parameters.
 * Removes: id, startDate, preferredTime, plannedDoses, status, compoundId, timestamps.
 */
export function stripCycleData(cycle: Cycle): PeptideCycleProtocol {
  return {
    compoundName: cycle.compoundName,
    unit: cycle.unit,
    startingDose: cycle.startingDose,
    incrementAmount: cycle.incrementAmount,
    incrementFrequency: cycle.incrementFrequency,
    maxDose: cycle.maxDose,
    injectionFrequency: cycle.injectionFrequency,
    preferredDays: cycle.preferredDays,
    durationWeeks: cycle.durationWeeks,
    taperEnabled: cycle.taperEnabled,
    taperConfig: cycle.taperConfig,
  };
}

/**
 * Strip personal data from a WorkoutTemplate.
 * Removes: id, color, targetWeight per exercise, timestamps.
 */
export function stripWorkoutData(template: WorkoutTemplate): WorkoutProtocol {
  return {
    name: template.name,
    exercises: template.exercises.map(({ targetWeight: _tw, ...rest }) => rest),
    muscleGroups: template.muscleGroups,
    estimatedDuration: template.estimatedDuration,
  };
}

/**
 * Build a NutritionProtocol from macro targets.
 * Caller provides sample meals — we do not auto-pull food log entries.
 */
export function buildNutritionProtocol(
  dailyCalories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  sampleMeals: NutritionProtocol['sampleMeals'] = []
): NutritionProtocol {
  return { dailyCalories, proteinG, carbsG, fatG, sampleMeals };
}

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * Publish a protocol as a community template.
 * Returns the new template's Firestore document ID.
 */
export async function publishTemplate(
  input: PublishTemplateInput
): Promise<ServiceResult<string>> {
  try {
    const anonymousAuthorId = await getAnonymousId();
    const doc: Omit<CommunityTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      category: input.category,
      title: input.title.trim(),
      description: input.description.trim(),
      tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
      anonymousAuthorId,
      protocolData: input.protocolData,
      status: 'published',
      importCount: 0,
      averageRating: 0,
      reviewCount: 0,
      reportCount: 0,
    };
    return addGlobalDocument<typeof doc>(COMMUNITY_COLLECTIONS.TEMPLATES, doc);
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getTemplateById(
  id: string
): Promise<ServiceResult<CommunityTemplate | null>> {
  return getGlobalDocument<CommunityTemplate>(COMMUNITY_COLLECTIONS.TEMPLATES, id);
}

/**
 * Paginated query of community templates.
 * Only returns templates with status 'published'.
 */
export async function queryTemplates(
  opts: QueryTemplatesOpts = {}
): Promise<ServiceResult<{ templates: CommunityTemplate[]; lastDoc: DocumentSnapshot | null }>> {
  const { category, sortBy = 'newest', cursor } = opts;

  const constraints: QueryConstraint[] = [
    where('status', '==', 'published'),
  ];

  if (category && category !== 'all') {
    constraints.push(where('category', '==', category));
  }

  switch (sortBy) {
    case 'most_imported':
      constraints.push(orderBy('importCount', 'desc'));
      break;
    case 'highest_rated':
      constraints.push(orderBy('averageRating', 'desc'));
      break;
    case 'newest':
    default:
      constraints.push(orderBy('createdAt', 'desc'));
  }

  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(TEMPLATE_PAGE_SIZE));

  const result = await queryGlobalDocuments<CommunityTemplate>(
    COMMUNITY_COLLECTIONS.TEMPLATES,
    constraints
  );
  if (result.error) return { data: null, error: result.error };
  return {
    data: { templates: result.data.data, lastDoc: result.data.lastDoc },
    error: null,
  };
}

/**
 * Fetch templates published by the current authenticated user.
 */
export async function getUserPublishedTemplates(): Promise<ServiceResult<CommunityTemplate[]>> {
  try {
    const anonymousAuthorId = await getAnonymousId();
    const result = await queryGlobalDocuments<CommunityTemplate>(
      COMMUNITY_COLLECTIONS.TEMPLATES,
      [where('anonymousAuthorId', '==', anonymousAuthorId), orderBy('createdAt', 'desc')]
    );
    if (result.error) return { data: null, error: result.error };
    return { data: result.data.data, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Import a community template into the user's personal data.
 * Creates a deep copy in the appropriate personal collection.
 * Returns the local document ID of the created item.
 */
export async function importTemplate(
  template: CommunityTemplate,
  customTitle?: string
): Promise<ServiceResult<string>> {
  try {
    let localCopyRef = '';

    if (template.protocolData.category === 'peptide_cycle') {
      const proto = template.protocolData.data as PeptideCycleProtocol;
      const today = toLocalDateStr(new Date());
      // Regenerate planned doses from protocol parameters.
      const planInput: CyclePlannerInput = {
        startingDose: proto.startingDose,
        incrementAmount: proto.incrementAmount,
        incrementFrequency: proto.incrementFrequency,
        maxDose: proto.maxDose,
        injectionFrequency: proto.injectionFrequency,
        preferredDays: proto.preferredDays,
        startDate: today,
        durationWeeks: proto.durationWeeks,
        taperEnabled: proto.taperEnabled,
        taperConfig: proto.taperConfig,
      };
      const plan = generateCyclePlan(planInput);

      const cycleDoc = {
        compoundId: '',
        compoundName: customTitle ?? proto.compoundName,
        unit: proto.unit,
        startingDose: proto.startingDose,
        incrementAmount: proto.incrementAmount,
        incrementFrequency: proto.incrementFrequency,
        maxDose: proto.maxDose,
        injectionFrequency: proto.injectionFrequency,
        preferredDays: proto.preferredDays,
        preferredTime: '08:00',
        startDate: today,
        durationWeeks: proto.durationWeeks,
        taperEnabled: proto.taperEnabled,
        taperConfig: proto.taperConfig,
        plannedDoses: plan?.plannedDoses ?? [],
        status: 'active' as const,
      };
      const r = await addDocument(COLLECTIONS.CYCLES, cycleDoc);
      if (r.error) return { data: null, error: r.error };
      localCopyRef = r.data;

    } else if (template.protocolData.category === 'workout') {
      const proto = template.protocolData.data as WorkoutProtocol;
      const workoutDoc = {
        name: customTitle ?? proto.name,
        color: '#2E86C1',
        exercises: proto.exercises,
        muscleGroups: proto.muscleGroups,
        estimatedDuration: proto.estimatedDuration,
      };
      const r = await addDocument(COLLECTIONS.WORKOUT_TEMPLATES, workoutDoc);
      if (r.error) return { data: null, error: r.error };
      localCopyRef = r.data;

    } else if (template.protocolData.category === 'nutrition_plan') {
      const proto = template.protocolData.data as NutritionProtocol;
      // Store as a recipe collection entry with a note on macros.
      const recipeDoc = {
        name: customTitle ?? template.title,
        description: `Imported from community: ${template.description}`,
        calories: proto.dailyCalories,
        protein: proto.proteinG,
        carbs: proto.carbsG,
        fat: proto.fatG,
        servingSize: 1,
        servingUnit: 'day',
        ingredients: proto.sampleMeals.map((m) => ({
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          servingSize: 1,
          servingUnit: 'serving',
        })),
      };
      const r = await addDocument(COLLECTIONS.RECIPES, recipeDoc);
      if (r.error) return { data: null, error: r.error };
      localCopyRef = r.data;
    } else {
      // Unknown category — do not silently succeed with an empty localCopyRef.
      return { data: null, error: new Error(`importTemplate: unknown category '${(template.protocolData as { category: string }).category}'`) };
    }

    // Record the import in the user's personal sub-collection.
    const importDoc: Omit<ImportedTemplate, 'id' | 'importedAt'> = {
      templateId: template.id,
      templateTitle: template.title,
      category: template.category,
      modified: customTitle !== undefined && customTitle !== template.title,
      localCopyRef,
    };
    const importResult = await addDocument(
      COLLECTIONS.IMPORTED_TEMPLATES,
      { ...importDoc, importedAt: Timestamp.now() }
    );
    if (importResult.error) {
      // Non-fatal — the copy was already created.
      console.warn('importTemplate: failed to record import tracking doc', importResult.error);
    }

    // Atomically increment importCount on the template.
    // incrementField takes a hardcoded field name here — never pass user-controlled
    // input to this helper; the field string goes directly to Firestore updateDoc.
    await incrementField(COMMUNITY_COLLECTIONS.TEMPLATES, template.id, 'importCount');

    return { data: localCopyRef, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function addReview(
  templateId: string,
  rating: 1 | 2 | 3 | 4 | 5,
  text?: string,
  outcomeNotes?: OutcomeNotes
): Promise<ServiceResult<string>> {
  try {
    const anonymousReviewerId = await getAnonymousId();
    const reviewDoc = {
      anonymousReviewerId,
      rating,
      ...(text ? { text: text.trim().slice(0, 200) } : {}),
      ...(outcomeNotes ? { outcomeNotes } : {}),
      status: 'active' as const,
    };
    const result = await addSubDocument(
      COMMUNITY_COLLECTIONS.TEMPLATES,
      templateId,
      'reviews',
      reviewDoc
    );
    if (result.error) return result;

    // Client-side aggregate update (stopgap until Cloud Function is deployed).
    await recomputeAverageRating(templateId);
    return result;
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

export async function getReviews(
  templateId: string,
  cursor?: DocumentSnapshot | null
): Promise<ServiceResult<{ reviews: TemplateReview[]; lastDoc: DocumentSnapshot | null }>> {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(20),
  ];
  if (cursor) constraints.push(startAfter(cursor));

  const result = await querySubDocuments<TemplateReview>(
    COMMUNITY_COLLECTIONS.TEMPLATES,
    templateId,
    'reviews',
    constraints
  );
  if (result.error) return { data: null, error: result.error };
  return {
    data: { reviews: result.data.data, lastDoc: result.data.lastDoc },
    error: null,
  };
}

export async function hasUserReviewed(templateId: string): Promise<ServiceResult<boolean>> {
  try {
    const anonymousReviewerId = await getAnonymousId();
    const result = await querySubDocuments<TemplateReview>(
      COMMUNITY_COLLECTIONS.TEMPLATES,
      templateId,
      'reviews',
      [where('anonymousReviewerId', '==', anonymousReviewerId), limit(1)]
    );
    if (result.error) return { data: null, error: result.error };
    return { data: result.data.data.length > 0, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

/**
 * Client-side aggregate computation — stopgap until Cloud Functions are deployed.
 * Reads all reviews and writes back averageRating + reviewCount.
 */
async function recomputeAverageRating(templateId: string): Promise<void> {
  try {
    const result = await querySubDocuments<TemplateReview>(
      COMMUNITY_COLLECTIONS.TEMPLATES,
      templateId,
      'reviews',
      [where('status', '==', 'active')]
    );
    if (result.error || !result.data.data.length) return;
    const reviews = result.data.data;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await updateGlobalDocument(COMMUNITY_COLLECTIONS.TEMPLATES, templateId, {
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: reviews.length,
    });
  } catch {
    // Non-fatal — stale aggregates are fine until Cloud Function is live.
  }
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function reportTemplate(
  templateId: string,
  reason: ReportReason,
  details?: string
): Promise<ServiceResult<string>> {
  try {
    const reporterId = await getAnonymousId();
    const reportDoc: Omit<TemplateReport, 'id' | 'createdAt'> = {
      templateId,
      reporterId,
      reason,
      ...(details ? { details: details.trim() } : {}),
      status: 'pending',
    };
    const result = await addGlobalDocument(COMMUNITY_COLLECTIONS.REPORTS, reportDoc);
    if (result.error) return result;

    // Increment reportCount and auto-flag if threshold reached (client-side stopgap).
    // KNOWN DEFECT: This has a read-after-write race condition. Two concurrent
    // reportTemplate() calls can both read reportCount < 3 after their increments
    // and neither triggers the flag. The Cloud Function onReportCreate (Phase 5)
    // fixes this with a server-side count query. This stopgap is acceptable for
    // low-volume MVP but should not be relied upon for moderation accuracy.
    await incrementField(COMMUNITY_COLLECTIONS.TEMPLATES, templateId, 'reportCount');
    const templateResult = await getTemplateById(templateId);
    if (!templateResult.error && templateResult.data) {
      if (templateResult.data.reportCount >= 3) {
        await updateGlobalDocument(COMMUNITY_COLLECTIONS.TEMPLATES, templateId, {
          status: 'flagged',
        });
      }
    }
    return result;
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
