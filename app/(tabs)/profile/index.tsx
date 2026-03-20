/**
 * Settings screen — replaces the read-only Profile tab.
 *
 * Sections:
 *   1. Profile Card     — avatar, editable name, email, member since, plan badge
 *   2. Subscription     — upgrade / manage / restore
 *   3. Preferences      — units, dark mode, notification toggles
 *   4. Body Stats       — editable height/weight/age/sex/activity/goal, saves + recalculates TDEE
 *   5. Nutrition        — link to nutrition/settings with calorie target subtitle
 *   6. Sign Out
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { useThemeContext } from '../../../src/contexts/ThemeContext';
import type { ThemePreference } from '../../../src/contexts/ThemeContext';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { usePremium } from '../../../src/contexts/PremiumContext';
import { signOut } from '../../../src/services/firebase/auth';
import { deleteAllUserData } from '../../../src/services/accountService';
import * as Application from 'expo-application';
import * as StoreReview from 'expo-store-review';
import * as MailComposer from 'expo-mail-composer';
import * as WebBrowser from 'expo-web-browser';
import { updateDocument, COLLECTIONS } from '../../../src/services/firebase/firestore';
import {
  requestPermissions,
  cancelAllDoseReminders,
} from '../../../src/services/notificationService';
import { calculateTDEE, calculateMacros, ACTIVITY_LEVELS, feetInchesToCm, cmToFeetInches, kgToLbs, lbsToKg } from '../../../src/utils/tdee';
import type { Units, Sex } from '../../../src/types/profile';
import { SettingsSection } from '../../../src/components/settings/SettingsSection';
import { SettingsRow } from '../../../src/components/settings/SettingsRow';
import { SegmentedControl } from '../../../src/components/settings/SegmentedControl';
import { useHealthKit } from '../../../src/hooks/useHealthKit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  const first = (firstName?.[0] ?? email?.[0] ?? '?').toUpperCase();
  const last = (lastName?.[0] ?? '').toUpperCase();
  return first + last;
}

const GOAL_OFFSET: Record<'lose' | 'maintain' | 'gain', number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { themePreference, setThemePreference } = useThemeContext();
  const { currentUser, userProfile, updateProfile, refreshProfile } = useAuth();
  const { isPremium, plan, expirationDate, restorePurchases } = usePremium();
  const router = useRouter();

  // ── Name editing ────────────────────────────────────────────────────────────
  const [nameEditing, setNameEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState('');
  const [draftLast, setDraftLast] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ── Body stats editing ──────────────────────────────────────────────────────
  const [statsEditing, setStatsEditing] = useState(false);
  const [draftWeightDisplay, setDraftWeightDisplay] = useState('');
  const [draftHeightCm, setDraftHeightCm] = useState('');
  const [draftHeightFt, setDraftHeightFt] = useState('');
  const [draftHeightIn, setDraftHeightIn] = useState('');
  const [draftAge, setDraftAge] = useState('');
  const [draftSex, setDraftSex] = useState<Sex>('male');
  const [draftActivityMultiplier, setDraftActivityMultiplier] = useState(1.55);
  const [draftGoalType, setDraftGoalType] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [savingStats, setSavingStats] = useState(false);

  // ── HealthKit ────────────────────────────────────────────────────────────────
  const { isEnabled: hkEnabled, enable: hkEnable, disable: hkDisable } = useHealthKit();
  const handleHealthKitToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        await hkEnable();
      } else {
        await hkDisable();
      }
    },
    [hkEnable, hkDisable],
  );

  // ── Other ──────────────────────────────────────────────────────────────────
  const [restoringPurchases, setRestoringPurchases] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  // Guard: profile not yet loaded
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
  const memberSince = userProfile.quizCompletedAt
    ? userProfile.quizCompletedAt.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;
  const notifPrefs = userProfile.notificationPrefs ?? { doseReminders: true, workoutReminders: true };

  // ── Name handlers ────────────────────────────────────────────────────────

  const startNameEdit = () => {
    setDraftFirst(userProfile.firstName ?? '');
    setDraftLast(userProfile.lastName ?? '');
    setNameEditing(true);
  };

  async function saveName() {
    setSavingName(true);
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      firstName: draftFirst.trim(),
      lastName: draftLast.trim(),
    });
    setSavingName(false);
    if (result.error) {
      Alert.alert('Save failed', 'Could not update your name. Please try again.');
      return;
    }
    updateProfile({ firstName: draftFirst.trim(), lastName: draftLast.trim() });
    setNameEditing(false);
  }

  // ── Body stats handlers ──────────────────────────────────────────────────

  const startStatsEdit = () => {
    setDraftWeightDisplay(imperial ? String(kgToLbs(userProfile.weightKg)) : String(Math.round(userProfile.weightKg * 10) / 10));
    if (imperial) {
      const { feet, inches } = cmToFeetInches(userProfile.heightCm);
      setDraftHeightFt(String(feet));
      setDraftHeightIn(String(inches));
    } else {
      setDraftHeightCm(String(Math.round(userProfile.heightCm * 10) / 10));
    }
    setDraftAge(String(userProfile.age));
    setDraftSex(userProfile.sex);
    setDraftActivityMultiplier(userProfile.activityLevel ?? 1.55);
    setDraftGoalType(userProfile.goalType ?? 'maintain');
    setStatsEditing(true);
  };

  async function saveStats() {
    const weightKg = imperial ? lbsToKg(parseFloat(draftWeightDisplay)) : parseFloat(draftWeightDisplay);
    const heightCm = imperial ? feetInchesToCm(parseInt(draftHeightFt, 10), parseInt(draftHeightIn, 10)) : parseFloat(draftHeightCm);
    const age = parseInt(draftAge, 10);

    if (isNaN(weightKg) || weightKg <= 0 || isNaN(heightCm) || heightCm <= 0 || isNaN(age) || age <= 0) {
      Alert.alert('Invalid values', 'Please check your height, weight, and age.');
      return;
    }

    const tdee = calculateTDEE(weightKg, heightCm, age, draftSex, draftActivityMultiplier);
    const calorieTarget = tdee + GOAL_OFFSET[draftGoalType];
    const macros = calculateMacros(calorieTarget);

    setSavingStats(true);
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', {
      weightKg,
      heightCm,
      age,
      sex: draftSex,
      activityLevel: draftActivityMultiplier,
      goalType: draftGoalType,
      tdee,
      calorieTarget,
      macros,
    });
    setSavingStats(false);

    if (result.error) {
      Alert.alert('Save failed', 'Could not update your body stats. Please try again.');
      return;
    }
    updateProfile({ weightKg, heightCm, age, sex: draftSex, activityLevel: draftActivityMultiplier, goalType: draftGoalType, tdee, calorieTarget, macros });
    setStatsEditing(false);
  }

  // ── Preferences handlers ─────────────────────────────────────────────────

  async function handleUnitsChange(value: string) {
    const newUnits = value as Units;
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', { units: newUnits });
    if (!result.error) updateProfile({ units: newUnits });
  }

  async function handleNotifToggle(key: 'doseReminders' | 'workoutReminders', value: boolean) {
    const newPrefs = { ...notifPrefs, [key]: value };
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs });
    if (!result.error) {
      updateProfile({ notificationPrefs: newPrefs });
      // Wire system notification permissions / cancellation additively (does not affect Firestore save)
      if (key === 'doseReminders') {
        if (value) {
          requestPermissions().catch(() => {}); // prompt if not yet granted
        } else {
          cancelAllDoseReminders().catch(() => {}); // cancel all scheduled dose reminders
        }
      }
    }
  }

  // ── Activity level picker ────────────────────────────────────────────────

  function pickActivityLevel() {
    Alert.alert(
      'Activity Level',
      'Select your activity level',
      [
        ...ACTIVITY_LEVELS.map((l) => ({
          text: l.label,
          onPress: () => setDraftActivityMultiplier(l.multiplier),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  // ── Sign out ─────────────────────────────────────────────────────────────

  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            const result = await signOut();
            if (result.error) {
              Alert.alert('Sign out failed', 'Please try again.');
              setSigningOut(false);
            }
            // On success: AuthGuard detects currentUser → null and redirects.
            // Analytics reset + Sentry user clear handled in _layout.tsx prevUidRef effect.
          },
        },
      ],
    );
  }

  // -- Data & Privacy handlers

  function handleDeleteData() {
    Alert.alert('Delete All Data', 'This permanently deletes ALL your PepMax data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All Data', style: 'destructive', onPress: () => {
        Alert.alert('Are you absolutely sure?', 'Your data cannot be recovered.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Delete Everything', style: 'destructive', onPress: async () => {
            setDeletingData(true);
            const result = await deleteAllUserData();
            setDeletingData(false);
            if (result.error) Alert.alert('Error', 'Could not delete your data. Please try again.');
            else Alert.alert('Done', 'All your data has been deleted.');
          }},
        ]);
      }},
    ]);
  }

  async function handleRateApp() {
    if (await StoreReview.hasAction()) StoreReview.requestReview();
  }

  async function handleContactSupport() {
    const available = await MailComposer.isAvailableAsync();
    if (!available) { Alert.alert('Email not available', 'Please email us at support@pepmax.app'); return; }
    await MailComposer.composeAsync({ recipients: ['support@pepmax.app'], subject: 'PepMax Support Request' });
  }


  // ── Derived display values ────────────────────────────────────────────────

  const currentActivityLevel = ACTIVITY_LEVELS.find((l) => l.multiplier === (userProfile.activityLevel ?? 1.55)) ?? ACTIVITY_LEVELS[2];
  const weightDisplay = imperial ? `${kgToLbs(userProfile.weightKg)} lbs` : `${Math.round(userProfile.weightKg * 10) / 10} kg`;
  const { feet, inches: heightIn } = cmToFeetInches(userProfile.heightCm);
  const heightDisplay = imperial ? `${feet}ft ${heightIn}in` : `${Math.round(userProfile.heightCm)} cm`;
  const draftActivityLabel = ACTIVITY_LEVELS.find((l) => l.multiplier === draftActivityMultiplier)?.label ?? '';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── 1. Profile Card ─────────────────────────────────────────────── */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: Colors.accent + '22' }]}>
          <Text style={[styles.initials, { color: Colors.accent }]}>{initials}</Text>
        </View>

        {nameEditing ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={draftFirst}
              onChangeText={setDraftFirst}
              placeholder="First name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <TextInput
              style={[styles.nameInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={draftLast}
              onChangeText={setDraftLast}
              placeholder="Last name"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.nameEditBtns}>
              <TouchableOpacity onPress={() => setNameEditing(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={[styles.saveBtn, { backgroundColor: Colors.accent }]} disabled={savingName}>
                {savingName ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <View style={styles.nameTextBlock}>
              {!!fullName && <Text style={[styles.fullName, { color: colors.textPrimary }]}>{fullName}</Text>}
              {!!userProfile.email && <Text style={[styles.emailText, { color: colors.textSecondary }]}>{userProfile.email}</Text>}
              {!!memberSince && <Text style={[styles.memberSince, { color: colors.textSecondary }]}>Member since {memberSince}</Text>}
            </View>
            <TouchableOpacity onPress={startNameEdit} style={styles.editIconBtn}>
              <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Plan badge */}
        <View style={[styles.badge, { backgroundColor: isPremium ? Colors.gold + '22' : colors.border }]}>
          {isPremium && <Ionicons name="star" size={12} color={Colors.gold} />}
          <Text style={[styles.badgeText, { color: isPremium ? Colors.gold : colors.textSecondary }]}>
            {isPremium ? 'PRO' : 'FREE'}
          </Text>
        </View>
      </View>

      {/* ── 2. Subscription ─────────────────────────────────────────────── */}
      <SettingsSection title="Subscription">
        {isPremium ? (
          <>
            <SettingsRow
              icon="star"
              label={plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
              value={expirationDate
                ? `Renews ${new Date(expirationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                : 'Active'}
              separator
            />
            <SettingsRow
              icon="settings-outline"
              label="Manage Subscription"
              onPress={() => {
                const url = Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions';
                Linking.openURL(url);
              }}
              separator
            />
          </>
        ) : (
          <SettingsRow
            icon="star-outline"
            label="Go Pro"
            onPress={() => router.push('/go-pro')}
            separator
          />
        )}
        <SettingsRow
          icon="refresh-outline"
          label="Restore Purchases"
          rightElement={restoringPurchases ? <ActivityIndicator size="small" color={colors.textSecondary} /> : undefined}
          onPress={async () => {
            setRestoringPurchases(true);
            try {
              const restored = await restorePurchases();
              Alert.alert(
                restored ? 'Restored!' : 'No Subscription Found',
                restored ? 'Your premium subscription has been restored.' : 'No active subscription found for this account.',
              );
            } catch {
              Alert.alert('Error', 'Could not restore purchases. Please try again.');
            } finally {
              setRestoringPurchases(false);
            }
          }}
        />
      </SettingsSection>

      {/* ── 3. Preferences ──────────────────────────────────────────────── */}
      <SettingsSection title="Preferences">
        <SettingsRow
          icon="barbell-outline"
          label="Units"
          rightElement={
            <SegmentedControl
              options={['Imperial', 'Metric']}
              values={['imperial', 'metric']}
              selectedValue={userProfile.units}
              onValueChange={handleUnitsChange}
            />
          }
          separator
        />
        <SettingsRow
          icon="moon-outline"
          label="Appearance"
          rightElement={
            <SegmentedControl
              options={['System', 'Light', 'Dark']}
              values={['system', 'light', 'dark']}
              selectedValue={themePreference}
              onValueChange={(v) => setThemePreference(v as ThemePreference)}
            />
          }
          separator
        />
        <SettingsRow
          icon="notifications-outline"
          label="Dose Reminders"
          rightElement={
            <Switch
              value={notifPrefs.doseReminders}
              onValueChange={(v) => handleNotifToggle('doseReminders', v)}
              trackColor={{ true: Colors.accent }}
            />
          }
          separator
        />
        <SettingsRow
          icon="fitness-outline"
          label="Workout Reminders"
          rightElement={
            <Switch
              value={notifPrefs.workoutReminders}
              onValueChange={(v) => handleNotifToggle('workoutReminders', v)}
              trackColor={{ true: Colors.accent }}
            />
          }
        />
      </SettingsSection>

      {/* ── 4. Body Stats ───────────────────────────────────────────────── */}
      <SettingsSection title="Body Stats">
        {statsEditing ? (
          <View style={styles.statsForm}>
            {/* Weight */}
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Weight ({imperial ? 'lbs' : 'kg'})
              </Text>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                value={draftWeightDisplay}
                onChangeText={setDraftWeightDisplay}
                keyboardType="decimal-pad"
                placeholder={imperial ? 'lbs' : 'kg'}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Height */}
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                Height
              </Text>
              {imperial ? (
                <View style={styles.heightImperial}>
                  <TextInput
                    style={[styles.formInputSmall, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={draftHeightFt}
                    onChangeText={setDraftHeightFt}
                    keyboardType="number-pad"
                    placeholder="ft"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.formInputSmall, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={draftHeightIn}
                    onChangeText={setDraftHeightIn}
                    keyboardType="number-pad"
                    placeholder="in"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              ) : (
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={draftHeightCm}
                  onChangeText={setDraftHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="cm"
                  placeholderTextColor={colors.textSecondary}
                />
              )}
            </View>

            {/* Age */}
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Age</Text>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                value={draftAge}
                onChangeText={setDraftAge}
                keyboardType="number-pad"
                placeholder="years"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Sex */}
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Sex</Text>
              <SegmentedControl
                options={['Male', 'Female']}
                values={['male', 'female']}
                selectedValue={draftSex}
                onValueChange={(v) => setDraftSex(v as Sex)}
              />
            </View>

            {/* Activity level */}
            <TouchableOpacity style={styles.formRow} onPress={pickActivityLevel}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Activity</Text>
              <View style={styles.activityValueRow}>
                <Text style={[styles.activityValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {draftActivityLabel}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Goal */}
            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Goal</Text>
              <SegmentedControl
                options={['Lose', 'Maintain', 'Gain']}
                values={['lose', 'maintain', 'gain']}
                selectedValue={draftGoalType}
                onValueChange={(v) => setDraftGoalType(v as 'lose' | 'maintain' | 'gain')}
              />
            </View>

            {/* Save / Cancel */}
            <View style={styles.formActions}>
              <TouchableOpacity onPress={() => setStatsEditing(false)} style={[styles.cancelBtn, { flex: 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveStats} style={[styles.saveBtn, { backgroundColor: Colors.accent, flex: 2 }]} disabled={savingStats}>
                {savingStats
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.saveBtnText}>Save & Recalculate</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <SettingsRow icon="resize-outline" label="Height" value={heightDisplay} separator />
            <SettingsRow icon="scale-outline" label="Weight" value={weightDisplay} separator />
            <SettingsRow icon="calendar-outline" label="Age" value={`${userProfile.age} yrs`} separator />
            <SettingsRow icon="person-outline" label="Sex" value={userProfile.sex === 'male' ? 'Male' : 'Female'} separator />
            <SettingsRow
              icon="walk-outline"
              label="Activity"
              value={currentActivityLevel.label.split('(')[0].trim()}
              separator
            />
            <SettingsRow
              icon="trending-down-outline"
              label="Goal"
              value={userProfile.goalType ? userProfile.goalType.charAt(0).toUpperCase() + userProfile.goalType.slice(1) : 'Maintain'}
            />
            <TouchableOpacity
              style={[styles.editStatsBtn, { borderColor: colors.border }]}
              onPress={startStatsEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={Colors.accent} />
              <Text style={[styles.editStatsBtnText, { color: Colors.accent }]}>Edit Body Stats</Text>
            </TouchableOpacity>
          </>
        )}
      </SettingsSection>

      {/* ── 5. Nutrition ────────────────────────────────────────────────── */}
      <SettingsSection title="Nutrition">
        <SettingsRow
          icon="restaurant-outline"
          label="Nutrition Settings"
          value={`${userProfile.calorieTarget} kcal`}
          onPress={() => router.push('/(tabs)/nutrition/settings')}
        />
      </SettingsSection>

      {/* ── 6. Apple Health (iOS only) ───────────────────────────────────── */}
      {Platform.OS === 'ios' && (
        <SettingsSection title="Apple Health">
          <SettingsRow
            icon="heart-outline"
            label="Connect Apple Health"
            rightElement={
              <Switch value={hkEnabled} onValueChange={handleHealthKitToggle} />
            }
            separator={false}
          />
        </SettingsSection>
      )}

      {/* -- 7. Data & Privacy */}
      <SettingsSection title="Data & Privacy">
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy & Data"
          onPress={() => router.push('/(tabs)/profile/privacy')}
          separator
        />
        <SettingsRow
          icon={isPremium ? 'download-outline' : 'lock-closed-outline'}
          label="Export My Data"
          value={isPremium ? undefined : 'Premium'}
          onPress={() => router.push('/(tabs)/profile/export-data')}
          separator
        />
        <SettingsRow
          icon="trash-outline"
          label="Delete All Data"
          rightElement={deletingData ? <ActivityIndicator size="small" color={Colors.error} /> : undefined}
          onPress={handleDeleteData}
          dangerous
        />
      </SettingsSection>

      {/* -- 8. About & Support */}
      <SettingsSection title="About & Support">
        <SettingsRow
          icon="information-circle-outline"
          label="Version"
          value={Application.nativeApplicationVersion ?? '—'}
          separator
        />
        <SettingsRow icon="star-outline" label="Rate PepMax" onPress={handleRateApp} separator />
        <SettingsRow icon="mail-outline" label="Contact Support" onPress={handleContactSupport} separator />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => WebBrowser.openBrowserAsync('https://pepmax.app/privacy')}
          separator
        />
        <SettingsRow
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => WebBrowser.openBrowserAsync('https://pepmax.app/terms')}
        />
      </SettingsSection>

            {/* ── 6. Sign Out ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.disabled]}
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
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },

  // Profile card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 26, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' },
  nameTextBlock: { alignItems: 'center', gap: 2 },
  fullName: { fontSize: 18, fontWeight: '700' },
  emailText: { fontSize: 13 },
  memberSince: { fontSize: 12 },
  editIconBtn: { padding: 4 },
  nameEditRow: { width: '100%', gap: 8 },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  nameEditBtns: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Buttons
  cancelBtn: { padding: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Stats form
  statsForm: { padding: 16, gap: 14 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formLabel: { width: 70, fontSize: 14 },
  formInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15 },
  formInputSmall: { width: 56, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 15, textAlign: 'center' },
  heightImperial: { flexDirection: 'row', gap: 8 },
  activityValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityValue: { flex: 1, fontSize: 13 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },

  // Edit stats button
  editStatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    margin: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  editStatsBtnText: { fontSize: 14, fontWeight: '600' },

  // Sign out
  signOutBtn: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  disabled: { opacity: 0.6 },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
