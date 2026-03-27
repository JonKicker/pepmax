/**
 * Friend profile screen.
 *
 * Reads publicProfiles/{uid} — the ONLY data source used here.
 * Never touches workout, nutrition, or peptide subcollections.
 *
 * Header right: "..." menu with "Remove Friend" option (confirmation Alert).
 *
 * PRIVACY BOUNDARY: this screen only reads /publicProfiles/{uid} which
 * contains exclusively non-PII social data. All PII is blocked by
 * Firestore rules on that collection.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { UserProfileCard } from '../../../src/components/social/UserProfileCard';
import { CompareButton } from '../../../src/components/social/CompareButton';
import { getPublicProfile } from '../../../src/services/publicProfileService';
import { removeFriend } from '../../../src/services/friendService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { PublicProfile } from '../../../src/types/social';

export default function FriendProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    if (!uid) {
      setError('No user ID provided.');
      setLoading(false);
      return;
    }

    analytics.track(AnalyticsEvent.FRIEND_PROFILE_VIEWED, { uid });

    getPublicProfile(uid).then((result) => {
      setLoading(false);
      if (result.error || !result.data) {
        setError('Could not load profile.');
        return;
      }
      setProfile(result.data);
    });
  }, [uid]);

  // Remove friend handler with confirmation
  const handleRemoveFriend = useCallback(() => {
    Alert.alert(
      'Remove Friend',
      `Remove @${profile?.username ?? 'this user'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!uid) return;
            const result = await removeFriend(uid);
            if (result.error) {
              Alert.alert('Error', 'Could not remove friend. Please try again.');
              return;
            }
            analytics.track(AnalyticsEvent.FRIEND_REMOVED, { uid });
            router.back();
          },
        },
      ],
    );
  }, [uid, profile?.username, router]);

  // Wire up header right menu button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Options', '', [
              { text: 'Remove Friend', style: 'destructive', onPress: handleRemoveFriend },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleRemoveFriend, colors.textPrimary]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="person-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error ?? 'Profile not found.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <UserProfileCard profile={profile} />

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.challengeButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/compete/create-duel',
              params: { opponentUid: uid, opponentUsername: profile.username },
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="flash-outline" size={16} color="#fff" />
          <Text style={styles.challengeButtonText}>Challenge</Text>
        </TouchableOpacity>
        <CompareButton opponentId={uid!} opponentName={profile.username} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  challengeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  challengeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { fontSize: 15, textAlign: 'center' },
});
