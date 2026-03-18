import { useMemo } from 'react';
import { getHRZones, getZoneForBpm } from '../utils/cardio';
import type { HeartRateZone } from '../types/cardio';

export function useHeartRateZones(maxHR: number) {
  const zones = useMemo<HeartRateZone[]>(() => getHRZones(maxHR), [maxHR]);

  const getZone = useMemo(
    () => (bpm: number) => getZoneForBpm(bpm, zones, maxHR),
    [zones, maxHR]
  );

  const getColor = useMemo(
    () => (bpm: number) => {
      const zone = getZoneForBpm(bpm, zones, maxHR);
      return zone?.color ?? '#999999';
    },
    [zones, maxHR]
  );

  return { zones, getZone, getColor };
}
