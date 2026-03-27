// src/types/education.ts — Type definitions for the Peptide Education Hub

export interface ProtocolInfo {
  name: string;
  description: string;
  schedule: string;
  duration: string;
  startingDose?: string;
  maintenanceDose?: string;
  unit?: string;
  frequency?: string;
}

export interface Reference {
  title: string;
  source: string;
  year: number;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface CompoundEducation {
  compoundId: string;
  overview: string;
  mechanismDetail: string;
  commonProtocols: ProtocolInfo[];
  safetyNotes: string[];
  stackingInfo: string;
  storageDetail: string;
  researchStatus: string;
  references: Reference[];
  faqs: FAQ[];
}
