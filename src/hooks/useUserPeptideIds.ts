import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { getPeptides } from '../services/peptideService';

/**
 * Returns the set of compound IDs (and lowercased names as fallback)
 * that the current user has in their peptide library.
 *
 * Refreshes on every screen focus so the compound-library and
 * compound-detail screens always reflect the latest library state.
 */
export function useUserPeptideIds(): {
  libraryIds: Set<string>;
  libraryNames: Set<string>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set());
  const [libraryNames, setLibraryNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    const result = await getPeptides();
    if (cancelledRef.current) return;

    if (!result.error && result.data) {
      const ids = new Set<string>();
      const names = new Set<string>();
      for (const peptide of result.data) {
        if (peptide.presetId) {
          ids.add(peptide.presetId);
        }
        names.add(peptide.name.toLowerCase());
      }
      setLibraryIds(ids);
      setLibraryNames(names);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cancelledRef.current = false;
      setLoading(true);
      load();
      return () => { cancelledRef.current = true; };
    }, [load])
  );

  // Imperative refresh for pull-to-refresh
  const refresh = useCallback(async () => {
    cancelledRef.current = false;
    await load();
  }, [load]);

  return { libraryIds, libraryNames, loading, refresh };
}
