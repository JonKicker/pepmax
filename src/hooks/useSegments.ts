/**
 * useSegments — fetches the list of route segments visible to the current user.
 *
 * Pulls friend UIDs and crew member UIDs then delegates to
 * segmentService.getAccessibleSegments for the combined result.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAccessibleSegments } from '../services/segmentService';
import { getFriends } from '../services/friendService';
import { getMyCrews } from '../services/crewService';
import type { RouteSegment } from '../types/segments';

export type UseSegmentsResult = {
  segments: RouteSegment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSegments(): UseSegmentsResult {
  const { currentUser } = useAuth();
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch friend UIDs and crew member UIDs in parallel
      const [friendsResult, crewsResult] = await Promise.all([
        getFriends(),
        getMyCrews(),
      ]);

      const friendUids = friendsResult.data
        ? friendsResult.data.map((f) => f.friendUid)
        : [];

      const crewMemberUids = crewsResult.data
        ? crewsResult.data.flatMap((crew) =>
            crew.memberUids.filter((uid) => uid !== currentUser.uid)
          )
        : [];

      const result = await getAccessibleSegments(currentUser.uid, friendUids, crewMemberUids);
      if (result.error) {
        setError('Could not load segments. Please try again.');
      } else {
        setSegments(result.data ?? []);
      }
    } catch {
      setError('Could not load segments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  return { segments, loading, error, refresh };
}
