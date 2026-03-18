import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { signOut } from '../../../src/services/firebase/auth';
import { cmToFeetInches, kgToLbs } from '../../../src/utils/tdee';
import type { Goal } from '../../../src/types/profile';

// ─── Goal display config ──────────────────────────────────────────────────────

const GOAL_LABELS: Record<Goal, string> = {
  peptides: 'Peptides',
  nutrition: 'Nutrition',
  training: 'Training',
  cardio: 'Cardio',
};

const GOAL_COLORS: Record<Goal, string> = {
  peptides: Colors.accent,
  nutrition: Colors.nutrition,
  training: Colors.gym,
  cardio: Colors.gym,
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  const first = (firstName?.[0] ?? email?.[0] ?? '?').toUpperCase();
  const last = (lastName?.[0] ?? '').toUpperCase();
  return first + last;
}

function formatHeight(heightCm: number, imperial: boolean): string {
  if (!imperial) return `${Math.round(heightCm * 10) / 10} cm`;
  let { feet, inches } = cmToFeetInches(heightCm);
  // Guard: Math.round on the modulo can produce inches === 12
  if (inches === 12) { feet += 1; inches = 0; }
  return `${feet}ft ${inches}in`;
}

function formatWeight(weightKg: number, imperial: boolean): string {
  if (!imperial) return `${Math.round(weightKg * 10) / 10} kg`;
  return `${kgToLbs(weightKg)} lbs`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // Guard: profile not yet loaded (brief AuthContext resolution window)
  if (!userProfile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const imperial = userProfile.units === 'imperial';
  const initials = getInitials(userProfile.firstName, userProfile.lastName, userProfile.email);
  const fullName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ');

  const handleSignOut = async () => {
    setSigningOut(true);
    const result = await signOut();
    if (result.error) {
      Alert.alert('Sign out failed', 'Please try again.');
      setSigningOut(false);
    }
    // On success: AuthGuard in _layout.tsx detects currentUser → null
    // and calls router.replace('/(auth)/welcome') automatically.
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
    >
      {/* Avatar + identity */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: Colors.accent + '22' }]}>
          <Text style={[styles.initials, { color: Colors.accent }]}>{initials}</Text>
        </View>
        {!!fullName && (
          <Text style={[styles.fullName, { color: colors.textPrimary }]}>{fullName}</Text>
        )}
        {!!userProfile.email && (
          <Text style={[styles.email, { color: colors.textSecondary }]}>{userProfile.email}</Text>
        )}
      </View>

      {/* Goals */}
      {userProfile.goals?.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Goals</Text>
          <View style={styles.pillRow}>
            {userProfile.goals.map((g) => (
              <View
                key={g}
                style={[styles.pill, { backgroundColor: GOAL_COLORS[g] + '22' }]}
              >
                <Text style={[styles.pillText, { color: GOAL_COLORS[g] }]}>
                  {GOAL_LABELS[g]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Experience level */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Experience</Text>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: Colors.accent + '22' }]}>
            <Text style={[styles.pillText, { color: Colors.accent }]}>
              {EXPERIENCE_LABELS[userProfile.experienceLevel] ?? userProfile.experienceLevel}
            </Text>
          </View>
        </View>
      </View>

      {/* Body stats */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Body Stats</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Height</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatHeight(userProfile.heightCm, imperial)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Weight</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatWeight(userProfile.weightKg, imperial)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Age</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {userProfile.age}
            </Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.signOutBtnDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        {signingOut ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 6 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  initials: { fontSize: 28, fontWeight: '700' },
  fullName: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: '600' },

  statRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statDivider: { width: 1, height: 40, marginHorizontal: 8 },

  signOutBtn: {
    marginTop: 12,
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signOutBtnDisabled: { opacity: 0.6 },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
