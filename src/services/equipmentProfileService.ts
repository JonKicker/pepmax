import { where } from 'firebase/firestore';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  COLLECTIONS,
} from './firebase/firestore';
import type { EquipmentProfile, EquipmentProfileInput, ProfileEquipment } from '../types/equipmentProfile';
import { ALL_EQUIPMENT } from '../types/equipmentProfile';
import type { ServiceResult } from '../types/service';

export async function getProfiles(): Promise<ServiceResult<EquipmentProfile[]>> {
  return queryDocuments<EquipmentProfile>(COLLECTIONS.EQUIPMENT_PROFILES);
}

export async function getActiveProfile(): Promise<ServiceResult<EquipmentProfile | null>> {
  const result = await queryDocuments<EquipmentProfile>(COLLECTIONS.EQUIPMENT_PROFILES, [
    where('isActive', '==', true),
  ]);
  if (result.error) return result;
  return { data: result.data![0] ?? null, error: null };
}

export async function createProfile(
  input: EquipmentProfileInput
): Promise<ServiceResult<string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return addDocument(COLLECTIONS.EQUIPMENT_PROFILES, input as any);
}

export async function updateProfile(
  id: string,
  data: Partial<EquipmentProfile>
): Promise<ServiceResult<void>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.EQUIPMENT_PROFILES, id, data as any);
}

export async function deleteProfile(id: string): Promise<ServiceResult<void>> {
  return deleteDocument(COLLECTIONS.EQUIPMENT_PROFILES, id);
}

export async function setActiveProfile(id: string): Promise<ServiceResult<void>> {
  const allResult = await getProfiles();
  if (allResult.error) return { data: null, error: allResult.error };

  // Deactivate all, then activate target
  for (const profile of allResult.data!) {
    if (profile.id === id) continue;
    if (profile.isActive) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateDocument(COLLECTIONS.EQUIPMENT_PROFILES, profile.id, { isActive: false } as any);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return updateDocument(COLLECTIONS.EQUIPMENT_PROFILES, id, { isActive: true } as any);
}

const PRESET_PROFILES: EquipmentProfileInput[] = [
  {
    name: 'Full Commercial Gym',
    isPreset: true,
    equipment: ALL_EQUIPMENT as ProfileEquipment[],
    isActive: true,
  },
  {
    name: 'Home Gym',
    isPreset: true,
    equipment: ['Barbell', 'Dumbbells', 'Pull-up Bar', 'Flat Bench', 'Squat Rack/Power Rack'],
    isActive: false,
  },
  {
    name: 'Hotel / Travel',
    isPreset: true,
    equipment: ['Dumbbells'],
    isActive: false,
  },
  {
    name: 'Bodyweight Only',
    isPreset: true,
    equipment: [],
    isActive: false,
  },
];

export async function seedDefaultProfiles(): Promise<ServiceResult<void>> {
  const existing = await getProfiles();
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data!.length > 0) return { data: undefined, error: null };

  for (const preset of PRESET_PROFILES) {
    const result = await createProfile(preset);
    if (result.error) return { data: null, error: result.error };
  }
  return { data: undefined, error: null };
}
