/**
 * Peptide service — CRUD for the peptides and doses collections.
 *
 * Path layout (handled by firestore helpers):
 *   users/{uid}/peptides/{id}
 *   users/{uid}/doses/{id}
 *
 * Index note: getDoses uses orderBy('timestamp', 'desc') with no other
 * where clause, so no composite index is needed. Filtering by peptideId
 * is done client-side to avoid requiring composite indexes at this stage.
 *
 * getTodaysDoses uses a timestamp range filter on the same field as orderBy,
 * which Firestore allows without a composite index.
 */
import { orderBy, where, Timestamp } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { Peptide, Dose, Unit, InjectionSite, Frequency, PeptideCategory, Route } from '../types/peptide';
import { ROUTES } from '../types/peptide';
import type { ServiceResult } from '../types/service';
import type { Compound, CompoundCategory } from '../data/compoundDatabase';

// ─── Input types (strip server-managed fields) ──────────────────────────────

type PeptideInput = {
  name: string;
  defaultDose: number;
  unit: Unit;
  frequency: Frequency;
  customDays?: string[];
  notes: string;
  // Extended metadata — optional for backward compatibility
  category?: PeptideCategory;
  halfLifeHours?: number;
  route?: Route;
  concentrationMgMl?: number;
  storageTemp?: string;
  isPreset?: boolean;
  presetId?: string;
};

type DoseInput = {
  peptideId: string;
  peptideName: string;
  amount: number;
  unit: Unit;
  site: InjectionSite;
  siteOther?: string;
  timestamp: Timestamp;
  mood: number;
  notes: string;
};

// ─── Preset mapping helpers ──────────────────────────────────────────────────

function parseRoute(routeStr: string): Route {
  for (const part of routeStr.split(', ')) {
    const match = ROUTES.find((r) => r.toLowerCase() === part.trim().toLowerCase());
    if (match) return match;
  }
  return 'SubQ';
}

function parseUnit(unitStr: string): Unit {
  if (unitStr === 'mcg') return 'mcg';
  if (unitStr === 'IU') return 'IU';
  return 'mg'; // covers 'mg' and fallback for 'mg/kg' (Macimorelin)
}

function parseFrequency(freqStr: string): Frequency {
  const f = freqStr.toLowerCase();
  // Check specific multi-day patterns before the generic 'weekly' catch-all
  if (f.includes('2x weekly') || f.includes('3x weekly')) return '3xPerWeek';
  if (f.includes('every other') || f.includes('eod')) return 'everyOtherDay';
  if (f.includes('weekly') || f === 'once weekly') return 'weekly';
  if (f.includes('daily') || f.includes('nightly')) return 'daily';
  return 'custom';
}

function mapGroupToCategory(group: CompoundCategory): PeptideCategory {
  if (group === 'GLP-1 / Weight Management') return 'GLP-1';
  if (group === 'Growth Hormone / GH Secretagogues') return 'GH Secretagogue';
  if (group === 'Healing / Recovery') return 'Healing';
  return 'Other';
}

// ─── Peptide CRUD ────────────────────────────────────────────────────────────

export async function addPeptide(data: PeptideInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.PEPTIDES, data as any);
}

export async function updatePeptide(
  id: string,
  data: Partial<PeptideInput>
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.PEPTIDES, id, data as any);
}

export async function deletePeptide(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.PEPTIDES, id);
}

export async function getPeptides(): Promise<ServiceResult<Peptide[]>> {
  return queryDocuments<Peptide>(COLLECTIONS.PEPTIDES, [orderBy('createdAt', 'asc')]);
}

export async function getPeptideById(id: string): Promise<ServiceResult<Peptide | null>> {
  return getDocument<Peptide>(COLLECTIONS.PEPTIDES, id);
}

/**
 * Add a compound from COMPOUND_DATABASE to the user's personal library.
 * Maps the catalog entry + selected dose into a PeptideInput for Firestore.
 */
export async function addPeptideFromPreset(
  compound: Compound,
  selectedDose: number,
): Promise<ServiceResult<string>> {
  return addPeptide({
    name: compound.name,
    defaultDose: selectedDose,
    unit: parseUnit(compound.unit),
    frequency: parseFrequency(compound.dosingFrequency),
    notes: compound.notesForUsers,
    category: mapGroupToCategory(compound.group),
    halfLifeHours: compound.halfLifeHours,
    route: parseRoute(compound.route),
    storageTemp: compound.storage,
    isPreset: true,
    presetId: compound.id,
  });
}

// ─── Dose CRUD ───────────────────────────────────────────────────────────────

export async function addDose(data: DoseInput): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.DOSES, data as any);
}

export async function updateDose(
  id: string,
  data: Partial<DoseInput>
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.DOSES, id, data as any);
}

export async function deleteDose(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.DOSES, id);
}

/**
 * Fetch all doses (newest first). Optionally filter by peptideId client-side.
 */
export async function getDoses(filters?: {
  peptideId?: string;
  startDate?: Date;
}): Promise<ServiceResult<Dose[]>> {
  const constraints = filters?.startDate
    ? [
        where('timestamp', '>=', Timestamp.fromDate(filters.startDate)),
        orderBy('timestamp', 'desc'),
      ]
    : [orderBy('timestamp', 'desc')];

  const result = await queryDocuments<Dose>(COLLECTIONS.DOSES, constraints);

  if (result.error || !filters?.peptideId) return result;

  return {
    data: result.data!.filter((d) => d.peptideId === filters.peptideId),
    error: null,
  };
}

/**
 * Fetch all doses logged today (used by Dashboard).
 * Uses a timestamp range filter on the same field as orderBy — no composite index needed.
 */
export async function getTodaysDoses(): Promise<ServiceResult<Dose[]>> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return queryDocuments<Dose>(COLLECTIONS.DOSES, [
    where('timestamp', '>=', Timestamp.fromDate(start)),
    where('timestamp', '<=', Timestamp.fromDate(end)),
    orderBy('timestamp', 'desc'),
  ]);
}
