/**
 * useProgressPhotos — manages photo entries with pagination and upload state.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getPhotoEntries,
  getPhotoDates,
  uploadProgressPhotos,
  deletePhotoEntry,
  type UploadProgress,
} from '../services/progressPhotoService';
import type { ProgressPhotoEntry, CapturedPhoto } from '../types/bodyTracking';

export function useProgressPhotos() {
  const [entries, setEntries] = useState<ProgressPhotoEntry[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [entriesResult, datesResult] = await Promise.all([
      getPhotoEntries(20),
      getPhotoDates(),
    ]);

    if (entriesResult.error) {
      setError('Failed to load progress photos.');
    } else {
      setEntries(entriesResult.data ?? []);
    }

    if (!datesResult.error) {
      setDates(datesResult.data ?? []);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await load();
        if (cancelled) return;
      })();
      return () => { cancelled = true; };
    }, [load]),
  );

  const upload = useCallback(async (
    date: string,
    captures: CapturedPhoto[],
    weight?: number,
    note?: string,
  ) => {
    setUploading(true);
    setUploadProgress(null);

    const result = await uploadProgressPhotos(date, captures, weight, note, (p) => {
      setUploadProgress(p);
    });

    setUploading(false);
    setUploadProgress(null);

    if (!result.error) {
      await load();
    }

    return result;
  }, [load]);

  const deleteEntry = useCallback(async (date: string) => {
    const result = await deletePhotoEntry(date);
    if (!result.error) {
      await load();
    }
    return result;
  }, [load]);

  return {
    entries,
    dates,
    loading,
    error,
    uploading,
    uploadProgress,
    upload,
    deleteEntry,
    refresh: load,
  };
}
