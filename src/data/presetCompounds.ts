/**
 * Pre-loaded compound catalog — hardcoded reference data, not stored in Firestore.
 *
 * When a user adds a preset, `addPeptideFromPreset` maps a PresetCompound + selected dose
 * into a PeptideInput and writes it to the user's personal peptides collection.
 * Common doses live here only — Firestore stores a single defaultDose per entry.
 */
import type { PeptideCategory, Route, Unit, Frequency } from '../types/peptide';

export type PresetCompound = {
  presetId: string;           // stable identifier — never change after release
  name: string;
  category: PeptideCategory;
  subcategoryLabel?: string;  // display-only override, e.g. 'GLP-1/GIP Dual Agonist'
  halfLifeHours: number;
  routes: Route[];            // all supported administration routes
  defaultRoute: Route;        // recommended/primary route
  commonDoses: number[];      // user picks one; becomes the Firestore defaultDose
  unit: Unit;
  defaultFrequency: Frequency;
  defaultNotes: string;
  storageTemp?: string;
};

export const PRESET_COMPOUNDS: PresetCompound[] = [
  {
    presetId: 'semaglutide',
    name: 'Semaglutide',
    category: 'GLP-1',
    halfLifeHours: 168,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [0.25, 0.5, 1, 2.4],
    unit: 'mg',
    defaultFrequency: 'weekly',
    defaultNotes: 'Inject once weekly at same time each week.',
    storageTemp: 'Refrigerate 2–8°C; protect from light',
  },
  {
    presetId: 'tirzepatide',
    name: 'Tirzepatide',
    category: 'GLP-1',
    subcategoryLabel: 'GLP-1/GIP Dual Agonist',
    halfLifeHours: 120,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [2.5, 5, 7.5, 10, 12.5, 15],
    unit: 'mg',
    defaultFrequency: 'weekly',
    defaultNotes: 'Inject once weekly. Titrate dose as tolerated.',
    storageTemp: 'Refrigerate 2–8°C; protect from light',
  },
  {
    presetId: 'bpc157',
    name: 'BPC-157',
    category: 'Healing',
    halfLifeHours: 4,
    routes: ['SubQ', 'IM'],
    defaultRoute: 'SubQ',
    commonDoses: [250, 500],
    unit: 'mcg',
    defaultFrequency: 'daily',
    defaultNotes: 'Inject near site of injury when possible.',
    storageTemp: 'Refrigerate after reconstitution; use within 2 weeks',
  },
  {
    presetId: 'tb500',
    name: 'TB-500',
    category: 'Healing',
    halfLifeHours: 4,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [2, 5],
    unit: 'mg',
    defaultFrequency: 'everyOtherDay',
    defaultNotes: 'Loading phase: 2–4mg twice weekly for 4–6 weeks. Maintenance: 2mg monthly.',
    storageTemp: 'Refrigerate after reconstitution',
  },
  {
    presetId: 'cjc1295-dac',
    name: 'CJC-1295 (with DAC)',
    category: 'GH Secretagogue',
    halfLifeHours: 144,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [2],
    unit: 'mg',
    defaultFrequency: 'weekly',
    defaultNotes: 'Dose 1–2× per week. Best taken before bed.',
    storageTemp: 'Refrigerate after reconstitution',
  },
  {
    presetId: 'cjc1295-nodac',
    name: 'CJC-1295 (no DAC / Mod GRF)',
    category: 'GH Secretagogue',
    halfLifeHours: 0.5,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [100],
    unit: 'mcg',
    defaultFrequency: 'daily',
    defaultNotes: 'Stack with Ipamorelin. Inject fasted, 30 min before meals or pre-sleep.',
    storageTemp: 'Refrigerate after reconstitution',
  },
  {
    presetId: 'ipamorelin',
    name: 'Ipamorelin',
    category: 'GH Secretagogue',
    halfLifeHours: 2,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [200, 300],
    unit: 'mcg',
    defaultFrequency: 'daily',
    defaultNotes: 'Commonly stacked with CJC-1295 (no DAC). Take fasted before bed.',
    storageTemp: 'Refrigerate after reconstitution',
  },
  {
    presetId: 'nad-plus',
    name: 'NAD+',
    category: 'Other',
    halfLifeHours: 3,
    routes: ['SubQ', 'IV'],
    defaultRoute: 'SubQ',
    commonDoses: [100, 250],
    unit: 'mg',
    defaultFrequency: 'daily',
    defaultNotes: 'SubQ injections well tolerated. IV infusion should be done slowly to avoid flushing.',
    storageTemp: 'Refrigerate; protect from light',
  },
  {
    presetId: 'ghk-cu',
    name: 'GHK-Cu',
    category: 'Healing',
    halfLifeHours: 4,
    routes: ['SubQ'],
    defaultRoute: 'SubQ',
    commonDoses: [200],
    unit: 'mcg',
    defaultFrequency: 'daily',
    defaultNotes: 'Inject near target tissue. Often cycled 4 weeks on / 2 weeks off.',
    storageTemp: 'Refrigerate after reconstitution',
  },
  {
    presetId: 'pt141',
    name: 'PT-141 (Bremelanotide)',
    category: 'Other',
    halfLifeHours: 2,
    routes: ['SubQ', 'Nasal'],
    defaultRoute: 'SubQ',
    commonDoses: [1, 2],
    unit: 'mg',
    defaultFrequency: 'custom',
    defaultNotes: 'Take 45–60 min before activity. Start at 1mg to assess tolerance.',
    storageTemp: 'Refrigerate after reconstitution',
  },
];
