/**
 * Crews list screen.
 *
 * - FlatList of crew cards (emoji + name + member count)
 * - Create button (disabled if >= 5 crews)
 * - Join section: TextInput for invite code + Join button
 * - Empty state
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useCrews } from '../../../src/hooks/useCrews';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { CrewDoc } from '../../../src/types/social';

// ─── Crew card ────────────────────────────────────────────────────────────────

function CrewCard({
  crew,
  onPress,
  colors,
}: {
  crew: CrewDoc;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.cardEmoji}>{crew.avatarEmoji}</Text>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]}>{crew.name}</Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          {crew.memberUids.length} / 10 members
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: Colors.accent + '18' }]}>
        <Ionicons name="people-circle-outline" size={40} color={Colors.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No crews yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Create a crew or paste an invite code to join one.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CrewsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { crews, loading, canCreateMore, joinCrew, refresh } = useCrews();
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    analytics.track(AnalyticsEvent.CREWS_LIST_VIEWED);
  }, []);

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;

    setJoining(true);
    const result = await joinCrew(code);
    setJoining(false);

    if (result.error) {
      Alert.alert('Could Not Join', result.error.message);
    } else {
      analytics.track(AnalyticsEvent.CREW_JOINED);
      setInviteCode('');
      router.push({
        pathname: '/(tabs)/compete/crew-detail',
        params: { crewId: result.data! },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Create button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.createBtn,
            {
              backgroundColor: canCreateMore ? Colors.accent : colors.surface,
              borderColor: canCreateMore ? Colors.accent : colors.border,
            },
          ]}
          onPress={() => router.push('/(tabs)/compete/create-crew')}
          disabled={!canCreateMore}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add-circle-outline"
            size={18}
            color={canCreateMore ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.createBtnText,
              { color: canCreateMore ? '#fff' : colors.textSecondary },
            ]}
          >
            {canCreateMore ? 'Create Crew' : 'Max 5 Crews Reached'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Crew list */}
      {loading && crews.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={crews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, crews.length === 0 && styles.listEmpty]}
          ListEmptyComponent={<EmptyState colors={colors} />}
          renderItem={({ item }) => (
            <CrewCard
              crew={item}
              colors={colors}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/compete/crew-detail',
                  params: { crewId: item.id },
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
      )}

      {/* Join section */}
      <View style={[styles.joinSection, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[styles.joinLabel, { color: colors.textSecondary }]}>Join with invite code</Text>
        <View style={styles.joinRow}>
          <TextInput
            style={[styles.joinInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="e.g. ABCD1234"
            placeholderTextColor={colors.textSecondary}
            value={inviteCode}
            onChangeText={(t) => setInviteCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
          />
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: Colors.accent, opacity: joining ? 0.6 : 1 }]}
            onPress={handleJoin}
            disabled={joining || !inviteCode.trim()}
            activeOpacity={0.7}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.joinBtnText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  listEmpty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  joinSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  joinLabel: { fontSize: 13, fontWeight: '500' },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  joinBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
