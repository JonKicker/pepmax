/**
 * VoiceLogScreen — voice food logging modal screen.
 *
 * Features:
 * - Pulsing mic button (Reanimated) while recording
 * - Transcribed text or manual text-input fallback
 * - Parsed item cards with quantity steppers
 * - "Search & Add All" button triggers individual food searches
 *
 * Route: /(tabs)/nutrition/voice-log (Expo Router modal)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  AccessibilityInfo,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../../src/hooks/useTheme';
import { GlassBackground } from '../../../src/components/GlassBackground';
import { useVoiceRecording } from '../../../src/hooks/useVoiceRecording';
import { parseVoiceInput } from '../../../src/utils/voiceFoodParser';
import { transcribeAudio, isSpeechAvailable } from '../../../src/services/speechService';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';
import type { ParsedFoodItem } from '../../../src/types/voiceLog';

// ─── Pulsing Mic Button ────────────────────────────────────────────────────────

function PulsingMicButton({
  isRecording,
  onPress,
  disabled,
}: {
  isRecording: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  React.useEffect(() => {
    if (isRecording && !reduceMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, reduceMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = isRecording ? colors.error : colors.nutrition;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      accessibilityRole="button"
    >
      <Reanimated.View
        style={[
          styles.micButton,
          animStyle,
          {
            backgroundColor: color + '22',
            borderColor: color,
          },
        ]}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={36}
          color={color}
        />
      </Reanimated.View>
    </TouchableOpacity>
  );
}

// ─── Parsed Item Card ─────────────────────────────────────────────────────────

function ParsedItemCard({
  item,
  onQuantityChange,
  onRemove,
  colors,
}: {
  item: ParsedFoodItem;
  onQuantityChange: (delta: number) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const confidenceColor =
    item.confidence >= 0.8 ? colors.nutrition :
    item.confidence >= 0.5 ? colors.warning :
    colors.textSecondary;

  return (
    <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.itemConfidence, { color: confidenceColor }]}>
          {Math.round(item.confidence * 100)}% confidence
        </Text>
      </View>

      {/* Quantity stepper */}
      <View style={styles.stepperRow}>
        <TouchableOpacity
          onPress={() => onQuantityChange(-0.5)}
          style={[styles.stepperBtn, { backgroundColor: colors.background }]}
          disabled={item.quantity <= 0.5}
          activeOpacity={0.7}
          accessibilityLabel="Decrease quantity"
          accessibilityRole="button"
        >
          <Ionicons name="remove" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
          {item.quantity} {item.unit}
        </Text>
        <TouchableOpacity
          onPress={() => onQuantityChange(0.5)}
          style={[styles.stepperBtn, { backgroundColor: colors.background }]}
          activeOpacity={0.7}
          accessibilityLabel="Increase quantity"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={onRemove}
        style={styles.removeBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
        accessibilityLabel="Remove item"
        accessibilityRole="button"
      >
        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VoiceLogScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { isRecording, recordingState, startRecording, stopRecording, audioUri, error: recordError, reset } = useVoiceRecording();

  const [textInput, setTextInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'review'>('idle');
  const hasSpeech = isSpeechAvailable();

  const handleMicPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isRecording) {
      // Stop and transcribe — use the URI returned directly from stopRecording
      // rather than the audioUri state variable, which may still be null when
      // the await resolves (setState is asynchronous).
      const uri = await stopRecording();
      analytics.track(AnalyticsEvent.VOICE_LOG_COMPLETED);

      if (hasSpeech && uri) {
        setTranscribing(true);
        const result = await transcribeAudio(uri);
        setTranscribing(false);
        if (!result.error && result.data.text) {
          setTextInput(result.data.text);
          handleParse(result.data.text);
          return;
        }
        // Fallback to text input
        analytics.track(AnalyticsEvent.VOICE_LOG_FALLBACK_USED);
      } else {
        // Always fallback in v1
        analytics.track(AnalyticsEvent.VOICE_LOG_FALLBACK_USED);
      }
    } else {
      analytics.track(AnalyticsEvent.VOICE_LOG_STARTED);
      await startRecording();
    }
  }, [isRecording, hasSpeech, startRecording, stopRecording]);

  const handleParse = useCallback((input?: string) => {
    const text = input ?? textInput;
    if (!text.trim()) {
      Alert.alert('Empty input', 'Please speak or type your meal first.');
      return;
    }
    const items = parseVoiceInput(text);
    if (items.length === 0) {
      Alert.alert('Nothing recognized', 'Could not parse any food items. Try phrasing like "two eggs and 100g chicken".');
      return;
    }
    analytics.track(AnalyticsEvent.VOICE_LOG_ITEM_PARSED, { item_count: items.length });
    setParsedItems(items);
    setPhase('review');
  }, [textInput]);

  const handleQuantityChange = (index: number, delta: number) => {
    setParsedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(0.5, item.quantity + delta) } : item,
      ),
    );
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearchAll = useCallback(() => {
    if (parsedItems.length === 0) return;
    // Navigate to food search with the first item pre-filled
    // (Full multi-item flow is a future enhancement)
    const first = parsedItems[0];
    router.navigate({
      pathname: '/(tabs)/nutrition/add-food',
      params: { query: `${first.name}` },
    });
  }, [parsedItems, router]);

  const handleReset = () => {
    reset();
    setTextInput('');
    setParsedItems([]);
    setPhase('idle');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Voice Log', presentation: 'modal' }} />
      <GlassBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Log by Voice</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {hasSpeech
              ? 'Tap the mic and say what you ate.'
              : 'Type what you ate below (e.g. "2 eggs and 100g chicken").'}
          </Text>

          {/* Mic button */}
          {hasSpeech && (
            <View style={styles.micContainer}>
              <PulsingMicButton
                isRecording={isRecording}
                onPress={handleMicPress}
                disabled={transcribing}
              />
              <Text style={[styles.micStatus, { color: colors.textSecondary }]}>
                {isRecording
                  ? 'Recording... tap to stop'
                  : transcribing
                  ? 'Processing...'
                  : recordingState === 'stopped'
                  ? 'Recording done'
                  : 'Tap to start'}
              </Text>
              {transcribing && <ActivityIndicator size="small" color={colors.nutrition} />}
            </View>
          )}

          {/* Text input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {hasSpeech ? 'Or type it manually:' : 'What did you eat?'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder='e.g. "two eggs and 100g chicken"'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>

          {/* Parse button */}
          {phase === 'idle' && (
            <TouchableOpacity
              style={[styles.parseButton, { backgroundColor: colors.nutrition }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleParse();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons name="search" size={18} color={colors.textPrimary} />
              <Text style={[styles.parseButtonText, { color: colors.textPrimary }]}>Parse & Review</Text>
            </TouchableOpacity>
          )}

          {/* Parsed items */}
          {phase === 'review' && parsedItems.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewTitle, { color: colors.textPrimary }]}>
                Parsed Items ({parsedItems.length})
              </Text>
              {parsedItems.map((item, index) => (
                <ParsedItemCard
                  key={`${item.name}-${index}`}
                  item={item}
                  onQuantityChange={(delta) => handleQuantityChange(index, delta)}
                  onRemove={() => handleRemoveItem(index)}
                  colors={colors}
                />
              ))}

              <TouchableOpacity
                style={[styles.addAllButton, { backgroundColor: colors.nutrition }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSearchAll();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={18} color={colors.textPrimary} />
                <Text style={[styles.addAllButtonText, { color: colors.textPrimary }]}>Search & Add All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resetButton, { borderColor: colors.border }]}
                onPress={handleReset}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
                  Start Over
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error state */}
          {(recordError) && (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '22', borderColor: colors.error }]}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {recordError}
              </Text>
            </View>
          )}
        </ScrollView>
      </GlassBackground>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },

  micContainer: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micStatus: { fontSize: 13 },

  inputSection: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '500' },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  parseButtonText: { fontSize: 16, fontWeight: '700' },

  reviewSection: { gap: 12 },
  reviewTitle: { fontSize: 16, fontWeight: '600' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemConfidence: { fontSize: 12, marginTop: 2 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 13, fontWeight: '600', minWidth: 60, textAlign: 'center' },

  removeBtn: { padding: 2 },

  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  addAllButtonText: { fontSize: 16, fontWeight: '700' },

  resetButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetButtonText: { fontSize: 15, fontWeight: '500' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
});
