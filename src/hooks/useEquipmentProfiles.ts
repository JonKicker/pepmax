import { useState, useCallback } from 'react';
import {
  getProfiles,
  getActiveProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  setActiveProfile,
  seedDefaultProfiles,
} from '../services/equipmentProfileService';
import type { EquipmentProfile, ProfileEquipment } from '../types/equipmentProfile';

interface UseEquipmentProfilesResult {
  profiles: EquipmentProfile[];
  activeProfile: EquipmentProfile | null;
  isLoading: boolean;
  error: string | null;
  loadProfiles: () => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  createCustomProfile: (name: string, equipment: ProfileEquipment[]) => Promise<void>;
  updateProfileEquipment: (id: string, equipment: ProfileEquipment[]) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
}

export function useEquipmentProfiles(): UseEquipmentProfilesResult {
  const [profiles, setProfiles] = useState<EquipmentProfile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<EquipmentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let result = await getProfiles();
    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    // Seed if empty
    if (result.data!.length === 0) {
      const seedResult = await seedDefaultProfiles();
      if (seedResult.error) {
        setError(seedResult.error.message);
        setIsLoading(false);
        return;
      }
      result = await getProfiles();
      if (result.error) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }
    }

    const all = result.data!;
    setProfiles(all);
    setActiveProfileState(all.find((p) => p.isActive) ?? null);
    setIsLoading(false);
  }, []);

  const switchProfile = useCallback(async (id: string) => {
    const result = await setActiveProfile(id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => ({ ...p, isActive: p.id === id }))
    );
    setActiveProfileState((prev) => {
      const target = profiles.find((p) => p.id === id);
      return target ? { ...target, isActive: true } : prev;
    });
  }, [profiles]);

  const createCustomProfile = useCallback(
    async (name: string, equipment: ProfileEquipment[]) => {
      const result = await createProfile({ name, isPreset: false, equipment, isActive: false });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await loadProfiles();
    },
    [loadProfiles]
  );

  const updateProfileEquipment = useCallback(
    async (id: string, equipment: ProfileEquipment[]) => {
      const result = await updateProfile(id, { equipment });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, equipment } : p))
      );
    },
    []
  );

  const removeProfile = useCallback(async (id: string) => {
    const result = await deleteProfile(id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setActiveProfileState((prev) => (prev?.id === id ? null : prev));
  }, []);

  return {
    profiles,
    activeProfile,
    isLoading,
    error,
    loadProfiles,
    switchProfile,
    createCustomProfile,
    updateProfileEquipment,
    removeProfile,
  };
}
