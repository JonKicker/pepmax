/**
 * Create crew screen.
 *
 * - Name input (3-30 chars, real-time validation)
 * - Emoji grid picker (20 presets)
 * - Create button with loading state
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useCrews } from '../../../src/hooks/useCrews';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_EMOJIS = [
  '💪', '🏋️', '🔥', '⚡', '🦁', '🐺', '🐻', '🦅',
  '🏆', '🥇', '🎯', '💯', '🚀', '⚔️', '🛡️', '💎',
  '🌊', '🏔️', '🌪️', '☄️',
];

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 30;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCrewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { createCrew } = useCrews();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS[0]);
  const [creating, setCreating] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length > 0 && trimmedName.length < MIN_NAME_LENGTH
      ? 'Name must be at least 3 characters.'
      : trimmedName.length > MAX_NAME_LENGTH
      ? 'Name must be 30 characters or fewer.'
      : null;
  const canCreate = trimmedName.length >= MIN_NAME_LENGTH && trimmedName.length <= MAX_NAME_LENGTH;

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!canCreate || creating) return;

    setCreating(true);
    const result = await createCrew(trimmedName, selectedEmoji);
    setCreating(false);

    if (result.error) {
      Alert.alert('Could Not Create Crew', result.error.message);
    } else {
      analytics.track(AnalyticsEvent.CREW_CREATED);
      // Navigate to the new crew's detail screen
      router.replace({
        pathname: '/(tabs)/dashboard/crew-detail',
        params: { crewId: result.data! },
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Selected emoji preview */}
        <View style={styles.emojiPreview}>
          <Text style={styles.emojiPreviewText}>{selectedEmoji}</Text>
        </View>

        {/* Emoji grid */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Choose an emoji</Text>
        <View style={styles.emojiGrid}>
          {PRESET_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.emojiCell,
                {
                  backgroundColor:
                    selectedEmoji === emoji ? Colors.accent + '22' : colors.surface,
                  borderColor:
                    selectedEmoji === emoji ? Colors.accent : colors.border,
                },
              ]}
              onPress={() => setSelectedEmoji(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiCellText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name input */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Crew name</Text>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.surface,
              borderColor: nameError ? '#EF4444' : colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholder="e.g. Iron Brotherhood"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          maxLength={MAX_NAME_LENGTH + 5}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          autoFocus
        />
        {nameError ? (
          <Text style={styles.errorText}>{nameError}</Text>
        ) : (
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {trimmedName.length} / {MAX_NAME_LENGTH}
          </Text>
        )}

        {/* Create button */}
        <TouchableOpacity
          style={[
            styles.createBtn,
            {
              backgroundColor: canCreate ? Colors.accent : colors.surface,
              borderColor: canCreate ? Colors.accent : colors.border,
              opacity: creating ? 0.7 : 1,
            },
          ]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
          activeOpacity={0.7}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.createBtnText, { color: canCreate ? '#fff' : colors.textSecondary }]}>
              Create Crew
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 8,
  },
  emojiPreview: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  emojiPreviewText: {
    fontSize: 64,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellText: { fontSize: 24 },
  nameInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
  },
  charCount: {
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
