/**
 * useSafetyContacts — fetch, add, and remove safety contacts.
 * Max 3 contacts enforced client-side.
 * Phone validated to E.164 format before saving.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getSafetyContacts,
  addSafetyContact,
  deleteSafetyContact,
} from '../services/beaconService';
import { analytics, AnalyticsEvent } from '../services/analytics';
import type { SafetyContact } from '../types/beacon';

const MAX_CONTACTS = 3;
// Basic E.164: + followed by 7–15 digits
const E164_RE = /^\+[1-9]\d{6,14}$/;

export function useSafetyContacts() {
  const [contacts, setContacts] = useState<SafetyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSafetyContacts();
    if (result.error) {
      setError('Failed to load contacts.');
    } else {
      setContacts(result.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addContact = useCallback(
    async (name: string, phone: string): Promise<string | null> => {
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();

      if (!trimmedName) return 'Name is required.';
      if (!E164_RE.test(trimmedPhone)) {
        return 'Phone must be in E.164 format (e.g. +15551234567).';
      }
      if (contacts.length >= MAX_CONTACTS) {
        return `Maximum ${MAX_CONTACTS} contacts allowed.`;
      }

      const result = await addSafetyContact({ name: trimmedName, phone: trimmedPhone });
      if (result.error) return 'Failed to save contact. Try again.';

      analytics.track(AnalyticsEvent.BEACON_CONTACT_ADDED);
      await load();
      return null; // null = success
    },
    [contacts.length, load],
  );

  const removeContact = useCallback(
    async (id: string): Promise<void> => {
      await deleteSafetyContact(id);
      analytics.track(AnalyticsEvent.BEACON_CONTACT_REMOVED);
      await load();
    },
    [load],
  );

  return {
    contacts,
    loading,
    error,
    addContact,
    removeContact,
    canAddMore: contacts.length < MAX_CONTACTS,
  };
}
