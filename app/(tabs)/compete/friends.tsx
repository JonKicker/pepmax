/**
 * Friends list screen.
 *
 * Two tabs: "Friends" (accepted list) | "Requests" (pending received, with badge).
 * Header right: "Find" button → friend-search.
 *
 * PRIVACY: this screen only reads /users/{uid}/friends — it never touches
 * workout, nutrition, or peptide subcollections.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { Colors } from '../../../src/constants/theme';
import { useFriends } from '../../../src/hooks/useFriends';
import { getTierInfo } from '../../../src/utils/rankTier';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { FriendDoc } from '../../../src/types/social';
import * as Haptics from 'expo-haptics';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'friends' | 'requests';

// ─── Friend row ───────────────────────────────────────────────────────────────

function FriendRow({
  friend,
  onPress,
  colors,
}: {
  friend: FriendDoc;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tierInfo = getTierInfo(friend.friendTier);
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${friend.friendUsername}`}
    >
      <View style={[styles.tierDot, { backgroundColor: tierInfo.color }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowUsername, { color: colors.textPrimary }]}>
          @{friend.friendUsername}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
          Lv {friend.friendLevel} · {tierInfo.label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Request row ──────────────────────────────────────────────────────────────

function RequestRow({
  request,
  onAccept,
  onDecline,
  colors,
}: {
  request: FriendDoc;
  onAccept: () => void;
  onDecline: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tierInfo = getTierInfo(request.friendTier);
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.tierDot, { backgroundColor: tierInfo.color }]} />
      <View style={styles.rowInfo}>
        <Text style={[styles.rowUsername, { color: colors.textPrimary }]}>
          @{request.friendUsername}
        </Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
          Lv {request.friendLevel} · {tierInfo.label}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAccept(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Accept friend request from ${request.friendUsername}`}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.declineBtn, { borderColor: colors.border }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onDecline(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Decline friend request from ${request.friendUsername}`}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message, colors }: { message: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.accent + '18' }]}>
        <Ionicons name="people-outline" size={40} color={Colors.accent} />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  const {
    friends,
    pendingReceived,
    pendingCount,
    loading,
    acceptRequest,
    declineRequest,
    refresh,
  } = useFriends();

  useEffect(() => {
    analytics.track(AnalyticsEvent.FRIENDS_LIST_VIEWED);
  }, []);

  const handleAccept = (friendUid: string) => {
    acceptRequest(friendUid).then((result) => {
      if (result.error) {
        Alert.alert('Error', 'Could not accept request. Please try again.');
      } else {
        analytics.track(AnalyticsEvent.FRIEND_REQUEST_ACCEPTED);
      }
    });
  };

  const handleDecline = (friendUid: string) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          declineRequest(friendUid).then((result) => {
            if (result.error) {
              Alert.alert('Error', 'Could not decline request. Please try again.');
            } else {
              analytics.track(AnalyticsEvent.FRIEND_REQUEST_DECLINED);
            }
          });
        },
      },
    ]);
  };

  return (
    <GlassBackground>
    <View style={styles.container}>
      {/* Find button (header right equivalent — rendered inline at top) */}
      <View style={styles.topBar}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'friends' && { borderBottomColor: Colors.accent, borderBottomWidth: 2 },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab('friends'); }}
            accessibilityRole="button"
            accessibilityLabel="Friends tab"
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'friends' ? Colors.accent : colors.textSecondary },
              ]}
            >
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'requests' && { borderBottomColor: Colors.accent, borderBottomWidth: 2 },
            ]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab('requests'); }}
            accessibilityRole="button"
            accessibilityLabel="Requests tab"
          >
            <View style={styles.tabBadgeRow}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'requests' ? Colors.accent : colors.textSecondary },
                ]}
              >
                Requests
              </Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.findBtn, { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '44' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/compete/friend-search'); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Find friends"
        >
          <Ionicons name="person-add-outline" size={16} color={Colors.accent} />
          <Text style={[styles.findBtnText, { color: Colors.accent }]}>Find</Text>
        </TouchableOpacity>
      </View>

      {loading && friends.length === 0 && pendingReceived.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : activeTab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.friendUid}
          contentContainerStyle={[styles.list, friends.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <EmptyState message="No friends yet. Use the Find button to search for people." colors={colors} />
          }
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              colors={colors}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/compete/friend-profile',
                  params: { uid: item.friendUid },
                })
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={pendingReceived}
          keyExtractor={(item) => item.friendUid}
          contentContainerStyle={[styles.list, pendingReceived.length === 0 && styles.listEmpty]}
          ListEmptyComponent={
            <EmptyState message="No pending requests." colors={colors} />
          }
          renderItem={({ item }) => (
            <RequestRow
              request={item}
              colors={colors}
              onAccept={() => handleAccept(item.friendUid)}
              onDecline={() => handleDecline(item.friendUid)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </GlassBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 0,
  },
  tab: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  findBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowInfo: { flex: 1 },
  rowUsername: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.accent,
  },
  declineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
