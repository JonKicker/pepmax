/**
 * useFriends — hook wrapping friendService.
 *
 * Exposes friends, pending requests (received), pending sent requests,
 * counts, loading state, and CRUD actions.
 *
 * Refreshes all three lists on screen focus via useFocusEffect.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from '../services/friendService';
import type { FriendDoc, RankTier } from '../types/social';

// ─── State shape ──────────────────────────────────────────────────────────────

type UseFriendsState = {
  friends: FriendDoc[];
  pendingReceived: FriendDoc[];
  pendingSent: FriendDoc[];
  pendingCount: number;
  loading: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFriends() {
  const [friends, setFriends] = useState<FriendDoc[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendDoc[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch all three lists ─────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setLoading(true);
    const [friendsResult, receivedResult, sentResult] = await Promise.all([
      getFriends(),
      getPendingRequests(),
      getSentRequests(),
    ]);
    if (!friendsResult.error) setFriends(friendsResult.data ?? []);
    if (!receivedResult.error) setPendingReceived(receivedResult.data ?? []);
    if (!sentResult.error) setPendingSent(sentResult.data ?? []);
    setLoading(false);
  }, []);

  // Refresh whenever the screen that uses this hook comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendRequest = useCallback(
    async (
      targetUid: string,
      targetUsername: string,
      targetLevel: number,
      targetTier: RankTier,
    ) => {
      const result = await sendFriendRequest(targetUid, targetUsername, targetLevel, targetTier);
      if (!result.error) {
        // Refresh sent list optimistically
        await getSentRequests().then((r) => {
          if (!r.error) setPendingSent(r.data ?? []);
        });
      }
      return result;
    },
    [],
  );

  const acceptRequest = useCallback(async (friendUid: string) => {
    const result = await acceptFriendRequest(friendUid);
    if (!result.error) await refresh();
    return result;
  }, [refresh]);

  const declineRequest = useCallback(async (friendUid: string) => {
    const result = await declineFriendRequest(friendUid);
    if (!result.error) {
      setPendingReceived((prev) => prev.filter((f) => f.friendUid !== friendUid));
    }
    return result;
  }, []);

  const removeExistingFriend = useCallback(async (friendUid: string) => {
    const result = await removeFriend(friendUid);
    if (!result.error) {
      setFriends((prev) => prev.filter((f) => f.friendUid !== friendUid));
    }
    return result;
  }, []);

  return {
    // State
    friends,
    pendingReceived,
    pendingSent,
    pendingCount: pendingReceived.length,
    loading,
    // Actions
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend: removeExistingFriend,
    refresh,
  };
}
