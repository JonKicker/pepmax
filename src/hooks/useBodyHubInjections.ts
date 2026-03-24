/**
 * Data hook for the Body Hub injections layer.
 * Fetches dose history and computes site stats + suggested next site.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDoses } from '../services/peptideService';
import {
  computeSiteStats,
  suggestNextSite,
  getSiteColor,
  type SiteStats,
  BODY_MAP_ZONES,
} from '../utils/siteRotation';
import type { BodyView } from '../types/bodyHub';

type UseBodyHubInjectionsResult = {
  siteStats: SiteStats[];
  suggestedSite: SiteStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getStatsForZone: (zoneId: string) => SiteStats | null;
  getColorForZone: (zoneId: string) => { fill: string; fillOpacity: number };
};

export function useBodyHubInjections(view: BodyView, enabled = true): UseBodyHubInjectionsResult {
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [suggestedSite, setSuggestedSite] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await getDoses({ startDate: ninetyDaysAgo });
      if (result.error) {
        setError(result.error.message ?? String(result.error));
        return;
      }

      const doses = result.data ?? [];
      const stats = computeSiteStats(doses);
      setSiteStats(stats);
      setSuggestedSite(suggestNextSite(stats));
    } catch (err) {
      setError('Failed to load injection data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [enabled, fetchData]);

  const getStatsForZone = useCallback(
    (zoneId: string): SiteStats | null => {
      const zone = BODY_MAP_ZONES.find((z) => z.id === zoneId);
      if (!zone) return null;
      return siteStats.find((s) => s.site === zone.injectionSite) ?? null;
    },
    [siteStats]
  );

  const getColorForZone = useCallback(
    (zoneId: string): { fill: string; fillOpacity: number } => {
      const stats = getStatsForZone(zoneId);
      if (!stats) return { fill: '#D1D5DB', fillOpacity: 0.6 }; // gray — never used
      const color = getSiteColor(stats.lastUsed, stats.status);
      return { fill: color, fillOpacity: 0.75 };
    },
    [getStatsForZone]
  );

  return {
    siteStats,
    suggestedSite,
    loading,
    error,
    refresh: fetchData,
    getStatsForZone,
    getColorForZone,
  };
}
