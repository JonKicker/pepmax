/**
 * Compare Privacy Settings screen.
 *
 * Lets users control which modules are visible when friends request a
 * head-to-head comparison, manage their blocked-users list, and toggle
 * the master compare switch.
 *
 * Route: app/(tabs)/profile/compare-privacy.tsx
 * Registered in app/(tabs)/profile/_layout.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getComparePrivacy,
  saveComparePrivacy,
  unblockUser,
} from '../../../src/services/compareService';
import { getPublicProfile } from '../../../src/services/publicProfileService';
import type { ComparePrivacy } from '../../../src/types/compare';

// ─── Theme constants ──────────────────────────────────────────────────────────
// PepMax uses a dark-only theme by design — all screens use hardcoded dark
// colors for a consistent experience. There is no light-mode variant.

const COLORS = {
  background: '#1a1a2e',
  card: '#0d1b2a',
  accent: '#7C3AED',
  text: '#FFFFFF',
  textSecondary: '#8B9BB4',
  border: '#1E2D40',
  danger: '#EF4444',
  success: '#22C55E',
};

// ─── Module row config ────────────────────────────────────────────────────────

type ModuleConfig = {
  key: keyof Pick<
    ComparePrivacy,
    'showTraining' | 'showCardio' | 'showNutrition' | 'showRecovery' | 'showBodyComp' | 'showPeptides'
  >;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MODULES: ModuleConfig[] = [
  {
    key: 'showTraining',
    label: 'Training',
    subtitle: 'Estimated 1RM, weekly volume',
    icon: 'barbell-outline',
  },
  {
    key: 'showCardio',
    label: 'Cardio',
    subtitle: 'Weekly distance, avg pace',
    icon: 'walk-outline',
  },
  {
    key: 'showNutrition',
    label: 'Nutrition',
    subtitle: 'Average daily calories',
    icon: 'nutrition-outline',
  },
  {
    key: 'showRecovery',
    label: 'Recovery',
    subtitle: 'Average recovery score',
    icon: 'bed-outline',
  },
  {
    key: 'showBodyComp',
    label: 'Body Composition',
    subtitle: 'Body weight trend',
    icon: 'body-outline',
  },
  {
    key: 'showPeptides',
    label: 'Peptides',
    subtitle: 'Active peptide count (hidden by default)',
    icon: 'medkit-outline',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComparePrivacyScreen() {
  const router = useRouter();

  const [privacy, setPrivacy] = useState<ComparePrivacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedUsernames, setBlockedUsernames] = useState<Record<string, string>>({});

  // ── Load privacy settings on mount ────────────────────────────────────────

  const loadPrivacy = useCallback(async () => {
    setLoading(true);
    const result = await getComparePrivacy();
    if (result.error) {
      Alert.alert('Error', 'Could not load privacy settings. Please try again.');
      setLoading(false);
      return;
    }
    setPrivacy(result.data);

    // Fetch display names for blocked users (parallel)
    const usernameMap: Record<string, string> = {};
    const profileResults = await Promise.all(
      result.data.blockedUsers.map(async (uid) => {
        const profileResult = await getPublicProfile(uid);
        return { uid, profileResult };
      }),
    );
    for (const { uid, profileResult } of profileResults) {
      usernameMap[uid] = (!profileResult.error && profileResult.data)
        ? (profileResult.data.username ?? uid)
        : uid;
    }
    setBlockedUsernames(usernameMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrivacy();
  }, [loadPrivacy]);

  // ── Save on each toggle change ─────────────────────────────────────────────

  const applyChange = useCallback(
    async (updated: ComparePrivacy) => {
      setPrivacy(updated);
      setSaving(true);
      const { createdAt, updatedAt, blockedUsers, ...rest } = updated;
      const result = await saveComparePrivacy({ ...rest, blockedUsers });
      setSaving(false);
      if (result.error) {
        Alert.alert('Error', 'Could not save settings. Please try again.');
      }
    },
    [],
  );

  const toggleMaster = useCallback(
    (value: boolean) => {
      if (!privacy) return;
      applyChange({ ...privacy, compareEnabled: value });
    },
    [privacy, applyChange],
  );

  const toggleModule = useCallback(
    (key: ModuleConfig['key'], value: boolean) => {
      if (!privacy) return;
      applyChange({ ...privacy, [key]: value });
    },
    [privacy, applyChange],
  );

  // ── Unblock user ───────────────────────────────────────────────────────────

  const handleUnblock = useCallback(
    (targetUid: string) => {
      Alert.alert(
        'Unblock User',
        `Unblock ${blockedUsernames[targetUid] ?? targetUid}? They will be able to request a comparison again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            style: 'destructive',
            onPress: async () => {
              const result = await unblockUser(targetUid);
              if (result.error) {
                Alert.alert('Error', 'Could not unblock user. Please try again.');
                return;
              }
              // Remove from local state
              if (!privacy) return;
              const updatedBlocked = privacy.blockedUsers.filter((uid) => uid !== targetUid);
              const updatedPrivacy = { ...privacy, blockedUsers: updatedBlocked };
              setPrivacy(updatedPrivacy);
              const updatedNames = { ...blockedUsernames };
              delete updatedNames[targetUid];
              setBlockedUsernames(updatedNames);
            },
          },
        ],
      );
    },
    [privacy, blockedUsernames],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!privacy) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load settings.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPrivacy}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Privacy</Text>
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.accent} style={styles.savingIndicator} />
        ) : (
          <View style={styles.savingIndicator} />
        )}
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Control what fitness data friends can see when requesting a head-to-head comparison.
      </Text>

      {/* Master toggle */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="people-outline" size={20} color={COLORS.accent} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Allow Comparisons</Text>
            <Text style={styles.rowSubtitle}>
              When off, your scores are hidden from all comparison requests
            </Text>
          </View>
          <Switch
            value={privacy.compareEnabled}
            onValueChange={toggleMaster}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={COLORS.text}
          />
        </View>
      </View>

      {/* Module visibility */}
      <Text style={styles.sectionHeader}>VISIBLE MODULES</Text>
      <View style={[styles.card, !privacy.compareEnabled && styles.cardDisabled]}>
        {MODULES.map((module, index) => (
          <View key={module.key}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons
                  name={module.icon}
                  size={20}
                  color={privacy.compareEnabled ? COLORS.accent : COLORS.textSecondary}
                />
              </View>
              <View style={styles.rowText}>
                <Text
                  style={[styles.rowLabel, !privacy.compareEnabled && styles.textDisabled]}
                >
                  {module.label}
                </Text>
                <Text style={styles.rowSubtitle}>{module.subtitle}</Text>
              </View>
              <Switch
                value={privacy.compareEnabled ? privacy[module.key] : false}
                onValueChange={(value) => toggleModule(module.key, value)}
                disabled={!privacy.compareEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={COLORS.text}
              />
            </View>
            {index < MODULES.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Blocked users */}
      <Text style={styles.sectionHeader}>BLOCKED USERS</Text>
      <View style={styles.card}>
        {privacy.blockedUsers.length === 0 ? (
          <View style={styles.emptyBlocked}>
            <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.textSecondary} />
            <Text style={styles.emptyBlockedText}>No blocked users</Text>
          </View>
        ) : (
          privacy.blockedUsers.map((uid, index) => (
            <View key={uid}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{blockedUsernames[uid] ?? uid}</Text>
                  <Text style={styles.rowSubtitle}>Blocked from comparing</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnblock(uid)}
                  style={styles.unblockButton}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
              </View>
              {index < privacy.blockedUsers.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>

      {/* Privacy note */}
      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.noteText}>
          Comparison scores show 30-day aggregated metrics — never raw logs or exact timestamps.
          Block enforcement is applied client-side in this version.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  savingIndicator: {
    width: 24,
    height: 24,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  textDisabled: {
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 64,
  },
  emptyBlocked: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyBlockedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  unblockButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  unblockText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
