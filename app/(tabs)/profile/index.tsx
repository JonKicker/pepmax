/**
 * Settings screen — replaces the read-only Profile tab.
 *
 * Sections:
 *   1. Profile Card     — avatar (photo or initials), editable name, email,
 *                         member since, PRO badge, username, bio
 *   2. Preferences      — units, dark mode, notification toggles with
 *                         time pickers (Custom / Optimized)
 *   3. Body Stats       — editable height/weight/age/sex/activity/goal
 *   4. Nutrition        — link to nutrition/settings
 *   5. Apple Health     — HealthKit sync toggle (iOS only)
 *   6. Data & Privacy
 *   7. About & Support
 *   8. Sign Out
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../src/hooks/useTheme';
import { useThemeContext } from '../../../src/contexts/ThemeContext';
import type { ThemePreference } from '../../../src/contexts/ThemeContext';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { usePremium } from '../../../src/contexts/PremiumContext';
import { signOut } from '../../../src/services/firebase/auth';
import { deleteAllUserData, deleteAccount } from '../../../src/services/accountService';
import * as Haptics from 'expo-haptics';
import * as Application from 'expo-application';
import * as StoreReview from 'expo-store-review';
import * as MailComposer from 'expo-mail-composer';
import * as WebBrowser from 'expo-web-browser';
import { updateDocument, COLLECTIONS } from '../../../src/services/firebase/firestore';
import {
  requestPermissions,
  cancelAllDoseReminders,
  scheduleRecoveryReminder,
  cancelRecoveryReminder,
  scheduleWorkoutReminder,
  cancelWorkoutReminder,
  scheduleDoseReminderDaily,
  cancelDoseReminderDaily,
} from '../../../src/services/notificationService';
import { applyOptimizedSchedule } from '../../../src/services/optimizedReminderService';
import { uploadProfilePicture, removeProfilePicture } from '../../../src/services/profilePictureService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
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

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

function dateFromHourMinute(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
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
  const { isPremium } = usePremium();
  const router = useRouter();

  // ── Name editing ────────────────────────────────────────────────────────────
  const [nameEditing, setNameEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState('');
  const [draftLast, setDraftLast] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ── Avatar / photo ───────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Bio editing ─────────────────────────────────────────────────────────────
  const [bioEditing, setBioEditing] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);

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

  // ── Reminder time pickers ────────────────────────────────────────────────────
  const [showDoseTimePicker, setShowDoseTimePicker] = useState(false);
  const [showWorkoutTimePicker, setShowWorkoutTimePicker] = useState(false);
  const [showRecoveryTimePicker, setShowRecoveryTimePicker] = useState(false);

  // ── Other ──────────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  // ── Avatar handlers ───────────────────────────────────────────────────────

  function handleAvatarPress() {
    const options: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
      { text: 'Take Photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from Library', onPress: () => pickPhoto('library') },
    ];
    if (userProfile!.profilePictureUrl) {
      options.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePhoto });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', 'Update your profile picture', options);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take a photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to choose a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      }

      if (result.canceled || !result.assets[0]) return;

      setUploadingPhoto(true);
      const uploadResult = await uploadProfilePicture(result.assets[0].uri);
      setUploadingPhoto(false);

      if (uploadResult.error) {
        Alert.alert('Upload failed', 'Could not update your profile picture. Please try again.');
        return;
      }
      updateProfile({ profilePictureUrl: uploadResult.data ?? undefined });
    } catch {
      setUploadingPhoto(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    const result = await removeProfilePicture();
    setUploadingPhoto(false);
    if (result.error) {
      Alert.alert('Error', 'Could not remove your photo. Please try again.');
      return;
    }
    updateProfile({ profilePictureUrl: undefined });
  }

  // ── Bio handlers ─────────────────────────────────────────────────────────

  function startBioEdit() {
    setDraftBio(userProfile!.bio ?? '');
    setBioEditing(true);
  }

  async function saveBio() {
    setSavingBio(true);
    const trimmed = draftBio.trim();
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', { bio: trimmed });
    setSavingBio(false);
    if (result.error) {
      Alert.alert('Save failed', 'Could not update your bio. Please try again.');
      return;
    }
    updateProfile({ bio: trimmed });
    analytics.track(AnalyticsEvent.BIO_UPDATED, { length: trimmed.length });
    setBioEditing(false);
  }

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

  async function handleNotifToggle(key: 'doseReminders' | 'workoutReminders' | 'recoveryCheckIn', value: boolean) {
    const newPrefs = { ...notifPrefs, [key]: value };
    const result = await updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs });
    if (!result.error) {
      updateProfile({ notificationPrefs: newPrefs });
      if (key === 'doseReminders') {
        if (value) {
          requestPermissions().catch(() => {});
          const hour = notifPrefs.doseReminderHour ?? 9;
          const minute = notifPrefs.doseReminderMinute ?? 0;
          scheduleDoseReminderDaily(hour, minute).catch(() => {});
        } else {
          cancelAllDoseReminders().catch(() => {});
          cancelDoseReminderDaily().catch(() => {});
        }
      } else if (key === 'workoutReminders') {
        if (value) {
          requestPermissions().catch(() => {});
          const hour = notifPrefs.workoutReminderHour ?? 17;
          const minute = notifPrefs.workoutReminderMinute ?? 0;
          scheduleWorkoutReminder(hour, minute).catch(() => {});
        } else {
          cancelWorkoutReminder().catch(() => {});
        }
      } else if (key === 'recoveryCheckIn') {
        if (value) {
          requestPermissions().catch(() => {});
          const hour = notifPrefs.recoveryCheckInHour ?? 7;
          const minute = notifPrefs.recoveryCheckInMinute ?? 0;
          scheduleRecoveryReminder(hour, minute).catch(() => {});
          analytics.track(AnalyticsEvent.RECOVERY_REMINDER_CONFIGURED, { enabled: true, hour, minute });
        } else {
          cancelRecoveryReminder().catch(() => {});
          analytics.track(AnalyticsEvent.RECOVERY_REMINDER_CONFIGURED, { enabled: false });
        }
      }
    }
  }

  // ── Reminder time change handlers ────────────────────────────────────────

  async function handleDoseTimeChange(_: unknown, selectedDate?: Date) {
    setShowDoseTimePicker(false);
    if (!selectedDate) return;
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const newPrefs = {
      ...notifPrefs,
      doseReminderHour: hour,
      doseReminderMinute: minute,
      doseReminderOptimized: false,
    };
    updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs }).catch(() => {});
    updateProfile({ notificationPrefs: newPrefs });
    scheduleDoseReminderDaily(hour, minute).catch(() => {});
    analytics.track(AnalyticsEvent.DOSE_REMINDER_TIME_SET, { hour, minute });
  }

  async function handleWorkoutTimeChange(_: unknown, selectedDate?: Date) {
    setShowWorkoutTimePicker(false);
    if (!selectedDate) return;
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const newPrefs = {
      ...notifPrefs,
      workoutReminderHour: hour,
      workoutReminderMinute: minute,
      workoutReminderOptimized: false,
    };
    updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs }).catch(() => {});
    updateProfile({ notificationPrefs: newPrefs });
    scheduleWorkoutReminder(hour, minute).catch(() => {});
    analytics.track(AnalyticsEvent.WORKOUT_REMINDER_TIME_SET, { hour, minute });
  }

  async function handleRecoveryTimeChange(_: unknown, selectedDate?: Date) {
    setShowRecoveryTimePicker(false);
    if (!selectedDate) return;
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const newPrefs = {
      ...notifPrefs,
      recoveryCheckInHour: hour,
      recoveryCheckInMinute: minute,
      recoveryCheckInOptimized: false,
    };
    updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs }).catch(() => {});
    updateProfile({ notificationPrefs: newPrefs });
    scheduleRecoveryReminder(hour, minute).catch(() => {});
    analytics.track(AnalyticsEvent.RECOVERY_REMINDER_CONFIGURED, { enabled: true, hour, minute });
  }

  async function handleOptimizedToggle(type: 'recovery' | 'dose' | 'workout', value: number) {
    const isOptimized = value === 1;
    analytics.track(AnalyticsEvent.REMINDER_OPTIMIZED_TOGGLED, { type, optimized: isOptimized });
    if (isOptimized) {
      applyOptimizedSchedule(type).catch(() => {});
      const optimizedKey = type === 'recovery'
        ? 'recoveryCheckInOptimized'
        : type === 'dose'
        ? 'doseReminderOptimized'
        : 'workoutReminderOptimized';
      const newPrefs = { ...notifPrefs, [optimizedKey]: true };
      updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs }).catch(() => {});
      updateProfile({ notificationPrefs: newPrefs });
    } else {
      const optimizedKey = type === 'recovery'
        ? 'recoveryCheckInOptimized'
        : type === 'dose'
        ? 'doseReminderOptimized'
        : 'workoutReminderOptimized';
      const newPrefs = { ...notifPrefs, [optimizedKey]: false };
      updateDocument(COLLECTIONS.PROFILE, 'data', { notificationPrefs: newPrefs }).catch(() => {});
      updateProfile({ notificationPrefs: newPrefs });
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

  async function runDeleteAccount() {
    setDeletingAccount(true);
    try {
      const result = await deleteAccount();
      if (result.error) {
        Alert.alert('Could not delete account', result.error.message);
        return;
      }
    } catch {
      Alert.alert('Error', 'Could not delete your account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  }

  function handleDeleteAccount() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete My Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt(
                'Confirm Account Deletion',
                `Type your email address to confirm:\n${currentUser?.email ?? ''}`,
                async (input) => {
                  if ((input ?? '').trim().toLowerCase() !== (currentUser?.email ?? '').toLowerCase()) {
                    Alert.alert('Email does not match', 'Please type your exact email address to confirm.');
                    return;
                  }
                  await runDeleteAccount();
                },
                'plain-text',
              );
            } else {
              Alert.alert(
                'Are you absolutely sure?',
                `This will permanently delete your account (${currentUser?.email ?? ''}) and all your data. This cannot be reversed.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes, Delete My Account', style: 'destructive', onPress: runDeleteAccount },
                ],
              );
            }
          },
        },
      ],
    );
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

  const doseH = notifPrefs.doseReminderHour ?? 9;
  const doseM = notifPrefs.doseReminderMinute ?? 0;
  const workoutH = notifPrefs.workoutReminderHour ?? 17;
  const workoutM = notifPrefs.workoutReminderMinute ?? 0;
  const recoveryH = notifPrefs.recoveryCheckInHour ?? 7;
  const recoveryM = notifPrefs.recoveryCheckInMinute ?? 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── 1. Profile Card ─────────────────────────────────────────────── */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

        {/* Avatar */}
        <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapper} activeOpacity={0.7}>
          {userProfile.profilePictureUrl ? (
            <Image
              source={{ uri: userProfile.profilePictureUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: Colors.accent + '22' }]}>
              <Text style={[styles.initials, { color: Colors.accent }]}>{initials}</Text>
            </View>
          )}
          {/* Camera overlay badge */}
          <View style={[styles.cameraOverlay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color={Colors.accent} />
              : <Ionicons name="camera" size={14} color={Colors.accent} />
            }
          </View>
        </TouchableOpacity>

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

        {/* Username row */}
        {userProfile.username ? (
          <TouchableOpacity onPress={() => router.push('/profile/choose-username')}>
            <Text style={[styles.usernameText, { color: Colors.accent }]}>@{userProfile.username}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/profile/choose-username')}>
            <Text style={[styles.setUsernameLink, { color: colors.textSecondary }]}>Set username</Text>
          </TouchableOpacity>
        )}

        {/* Bio section */}
        {bioEditing ? (
          <View style={styles.bioEditBlock}>
            <TextInput
              style={[styles.bioInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={draftBio}
              onChangeText={(t) => setDraftBio(t.slice(0, 160))}
              placeholder="Tell others a little about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>{draftBio.length}/160</Text>
            <View style={styles.nameEditBtns}>
              <TouchableOpacity onPress={() => setBioEditing(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBio} style={[styles.saveBtn, { backgroundColor: Colors.accent }]} disabled={savingBio}>
                {savingBio ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={startBioEdit}>
            <Text style={[styles.bioText, { color: userProfile.bio ? colors.textPrimary : colors.textSecondary }]}>
              {userProfile.bio || 'Add a short bio'}
            </Text>
          </TouchableOpacity>
        )}

        {/* PRO badge — only shown when premium */}
        {isPremium && (
          <View style={[styles.badge, { backgroundColor: Colors.gold + '22' }]}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={[styles.badgeText, { color: Colors.gold }]}>PRO</Text>
          </View>
        )}
      </View>

      {/* ── 2. Preferences ──────────────────────────────────────────────── */}
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

        {/* Dose Reminders toggle + expander */}
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
        {notifPrefs.doseReminders && (
          <View style={[styles.reminderExpander, { borderColor: colors.border }]}>
            <SegmentedControl
              options={['Custom', 'Optimized']}
              values={['0', '1']}
              selectedValue={notifPrefs.doseReminderOptimized ? '1' : '0'}
              onValueChange={(v) => handleOptimizedToggle('dose', parseInt(v, 10))}
            />
            {notifPrefs.doseReminderOptimized ? (
              <Text style={[styles.optimizedLabel, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios' && hkEnabled
                  ? 'Adapts to your sleep schedule'
                  : 'Enable Apple Health for personalized times'}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.reminderTimeRow}
                onPress={() => setShowDoseTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.reminderTimeText, { color: colors.textPrimary }]}>
                  {formatTime(doseH, doseM)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {showDoseTimePicker && (
              <DateTimePicker
                mode="time"
                value={dateFromHourMinute(doseH, doseM)}
                onChange={handleDoseTimeChange}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            )}
          </View>
        )}

        {/* Workout Reminders toggle + expander */}
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
          separator
        />
        {notifPrefs.workoutReminders && (
          <View style={[styles.reminderExpander, { borderColor: colors.border }]}>
            <SegmentedControl
              options={['Custom', 'Optimized']}
              values={['0', '1']}
              selectedValue={notifPrefs.workoutReminderOptimized ? '1' : '0'}
              onValueChange={(v) => handleOptimizedToggle('workout', parseInt(v, 10))}
            />
            {notifPrefs.workoutReminderOptimized ? (
              <Text style={[styles.optimizedLabel, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios' && hkEnabled
                  ? 'Adapts to your sleep schedule'
                  : 'Enable Apple Health for personalized times'}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.reminderTimeRow}
                onPress={() => setShowWorkoutTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.reminderTimeText, { color: colors.textPrimary }]}>
                  {formatTime(workoutH, workoutM)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {showWorkoutTimePicker && (
              <DateTimePicker
                mode="time"
                value={dateFromHourMinute(workoutH, workoutM)}
                onChange={handleWorkoutTimeChange}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            )}
          </View>
        )}

        {/* Recovery Check-In toggle + expander */}
        <SettingsRow
          icon="bed-outline"
          label="Recovery Check-In"
          rightElement={
            <Switch
              value={notifPrefs.recoveryCheckIn ?? false}
              onValueChange={(v) => handleNotifToggle('recoveryCheckIn', v)}
              trackColor={{ true: Colors.accent }}
            />
          }
        />
        {notifPrefs.recoveryCheckIn && (
          <View style={[styles.reminderExpander, { borderColor: colors.border, borderTopWidth: 0 }]}>
            <SegmentedControl
              options={['Custom', 'Optimized']}
              values={['0', '1']}
              selectedValue={notifPrefs.recoveryCheckInOptimized ? '1' : '0'}
              onValueChange={(v) => handleOptimizedToggle('recovery', parseInt(v, 10))}
            />
            {notifPrefs.recoveryCheckInOptimized ? (
              <Text style={[styles.optimizedLabel, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios' && hkEnabled
                  ? 'Adapts to your sleep schedule'
                  : 'Enable Apple Health for personalized times'}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.reminderTimeRow}
                onPress={() => setShowRecoveryTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.reminderTimeText, { color: colors.textPrimary }]}>
                  {formatTime(recoveryH, recoveryM)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {showRecoveryTimePicker && (
              <DateTimePicker
                mode="time"
                value={dateFromHourMinute(recoveryH, recoveryM)}
                onChange={handleRecoveryTimeChange}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
              />
            )}
          </View>
        )}

      </SettingsSection>

      {/* ── 3. Body Stats ───────────────────────────────────────────────── */}
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
            >
              <Ionicons name="create-outline" size={16} color={Colors.accent} />
              <Text style={[styles.editStatsBtnText, { color: Colors.accent }]}>Edit Body Stats</Text>
            </TouchableOpacity>
          </>
        )}
      </SettingsSection>

      {/* ── 4. Nutrition ────────────────────────────────────────────────── */}
      <SettingsSection title="Nutrition">
        <SettingsRow
          icon="restaurant-outline"
          label="Nutrition Settings"
          value={`${userProfile.calorieTarget} kcal`}
          onPress={() => router.push('/(tabs)/nutrition/settings')}
        />
      </SettingsSection>

      {/* ── 5. Apple Health (iOS only) ───────────────────────────────────── */}
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

      {/* -- 6. Data & Privacy */}
      <SettingsSection title="Data & Privacy">
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy & Data"
          onPress={() => router.push('/(tabs)/profile/privacy')}
          separator
        />
        <SettingsRow
          icon="people-outline"
          label="My Templates"
          onPress={() => router.push('/(tabs)/profile/my-templates')}
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
          separator
        />
        <SettingsRow
          icon="person-remove-outline"
          label="Delete My Account"
          rightElement={deletingAccount ? <ActivityIndicator size="small" color={Colors.error} /> : undefined}
          onPress={handleDeleteAccount}
          dangerous
        />
      </SettingsSection>

      {/* -- 7. About & Support */}
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

      {/* ── 8. Sign Out ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && styles.disabled]}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.7}
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
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  usernameText: { fontSize: 14, fontWeight: '600' },
  setUsernameLink: { fontSize: 13 },
  bioText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bioEditBlock: { width: '100%', gap: 8 },
  bioInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, alignSelf: 'flex-end' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Reminder expander
  reminderExpander: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    gap: 10,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  reminderTimeText: { flex: 1, fontSize: 15, fontWeight: '500' },
  optimizedLabel: { fontSize: 13, lineHeight: 18 },

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
