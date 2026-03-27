/**
 * Friend search screen.
 *
 * Searches publicProfiles by username prefix with a 500ms debounce.
 * Results show context-aware action buttons:
 *   - "Add Friend" if no relationship exists
 *   - "Pending"    if a request is already sent
 *   - "Friends ✓"  if already accepted
 *
 * Self is excluded from results.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { searchByUsername } from '../../../src/services/publicProfileService';
import { getFriendStatus, sendFriendRequest } from '../../../src/services/friendService';
import { getTierInfo } from '../../../src/utils/rankTier';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { LeaderboardEntry } from '../../../src/types/social';
import type { FriendDoc } from '../../../src/types/social';

// ─── Friend button state ──────────────────────────────────────────────────────

type FriendButtonState = 'none' | 'pending' | 'accepted' | 'loading';

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  entry,
  buttonState,
  onAddFriend,
  colors,
}: {
  entry: LeaderboardEntry;
  buttonState: FriendButtonState;
  onAddFriend: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const tierInfo = getTierInfo(entry.tier);

  const renderButton = () => {
    if (buttonState === 'loading') {
      return (
        <View style={[styles.friendBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      );
    }
    if (buttonState === 'accepted') {
      return (
        <View style={[styles.friendBtn, { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '44' }]}>
          <Ionicons name="checkmark" size={14} color={Colors.accent} />
          <Text style={[styles.friendBtnText, { color: Colors.accent }]}>Friends</Text>
        </View>
      );
    }
    if (buttonState === 'pending') {
      return (
        <View style={[styles.friendBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.friendBtnText, { color: colors.textSecondary }]}>Pending</Text>
        </View>
      );
    }
    // 'none' — show Add Friend
    return (
      <TouchableOpacity
        style={[styles.friendBtn, { backgroundColor: Colors.accent, borderColor: Colors.accent }]}
        onPress={onAddFriend}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add-outline" size={14} color="#fff" />
        <Text style={[styles.friendBtnText, { color: '#fff' }]}>Add</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Tier colour indicator */}
      <View style={[styles.tierDot, { backgroundColor: tierInfo.color }]} />

      <View style={styles.rowInfo}>
        <Text style={[styles.rowUsername, { color: colors.textPrimary }]}>@{entry.username}</Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
          Lv {entry.level} · {tierInfo.label}
        </Text>
      </View>

      {renderButton()}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendSearchScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeaderboardEntry[]>([]);
  const [searching, setSearching] = useState(false);
  // Map from uid → FriendDoc | null (null = no relationship)
  const [statusMap, setStatusMap] = useState<Record<string, FriendDoc | null>>({});
  // Track which UIDs are in the "sending" loading state
  const [sendingUids, setSendingUids] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) {
        setResults([]);
        setStatusMap({});
        return;
      }

      setSearching(true);
      analytics.track(AnalyticsEvent.FRIEND_SEARCH_PERFORMED, { prefix: trimmed });

      const result = await searchByUsername(trimmed);
      setSearching(false);

      if (result.error || !result.data) return;

      // Filter self out
      const filtered = result.data.filter((e) => e.uid !== currentUser?.uid);
      setResults(filtered);

      // Fetch friend status for each result
      const entries = await Promise.all(
        filtered.map(async (entry) => {
          const statusResult = await getFriendStatus(entry.uid);
          return [entry.uid, statusResult.error ? null : statusResult.data] as [string, FriendDoc | null];
        }),
      );
      setStatusMap(Object.fromEntries(entries));
    },
    [currentUser?.uid],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 500);
    },
    [doSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleAddFriend = useCallback(
    async (entry: LeaderboardEntry) => {
      setSendingUids((prev) => new Set(prev).add(entry.uid));
      const result = await sendFriendRequest(entry.uid, entry.username, entry.level, entry.tier);
      setSendingUids((prev) => {
        const next = new Set(prev);
        next.delete(entry.uid);
        return next;
      });

      if (result.error) {
        Alert.alert('Error', result.error.message || 'Could not send request. Please try again.');
        return;
      }

      analytics.track(AnalyticsEvent.FRIEND_REQUEST_SENT, { targetUid: entry.uid });
      // Update status map to 'sent' pending
      setStatusMap((prev) => ({
        ...prev,
        [entry.uid]: {
          friendUid: entry.uid,
          friendUsername: entry.username,
          friendLevel: entry.level,
          friendTier: entry.tier,
          status: 'pending',
          direction: 'sent',
          createdAt: {} as any,
          updatedAt: {} as any,
        },
      }));
    },
    [],
  );

  const getButtonState = (entry: LeaderboardEntry): FriendButtonState => {
    if (sendingUids.has(entry.uid)) return 'loading';
    const status = statusMap[entry.uid];
    if (status === undefined) return 'loading'; // still fetching
    if (status === null) return 'none';
    if (status.status === 'accepted') return 'accepted';
    return 'pending';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search input */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          placeholder="Search by username…"
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={query}
          onChangeText={handleTextChange}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color={Colors.accent} />}
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={[styles.list, results.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          query.trim().length === 0 ? (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                Type a username to search
              </Text>
            </View>
          ) : !searching && results.length === 0 ? (
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                No users found for "{query.trim()}"
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ResultRow
            entry={item}
            buttonState={getButtonState(item)}
            onAddFriend={() => handleAddFriend(item)}
            colors={colors}
          />
        )}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  hintContainer: { alignItems: 'center', paddingTop: 60 },
  hintText: { fontSize: 14 },
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
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 76,
    justifyContent: 'center',
  },
  friendBtnText: { fontSize: 13, fontWeight: '600' },
});
