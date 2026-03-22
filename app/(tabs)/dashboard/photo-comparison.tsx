/**
 * photo-comparison — side-by-side progress photo comparison with sharing.
 *
 * Before/after date pickers, pose selector tabs, weight labels, share with
 * react-native-view-shot and system Share API.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getPhotoDates, getPhotoEntry } from '../../../src/services/progressPhotoService';
import { kgToLbs } from '../../../src/utils/tdee';
import type { ProgressPhotoEntry, PhotoPose } from '../../../src/types/bodyTracking';
import { analytics, AnalyticsEvent } from '../../../src/services/analytics';

const POSES: PhotoPose[] = ['front', 'side', 'back'];

function fmtWeight(kg: number | undefined, units: 'imperial' | 'metric'): string {
  if (kg == null) return '—';
  const val = units === 'imperial' ? kgToLbs(kg) : kg;
  const u = units === 'imperial' ? 'lbs' : 'kg';
  return `${(Math.round(val * 10) / 10).toFixed(1)} ${u}`;
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PhotoComparisonScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const units = userProfile?.units ?? 'imperial';

  const viewShotRef = useRef<ViewShot>(null);

  const [dates, setDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  const [beforeDate, setBeforeDate] = useState<string | null>(null);
  const [afterDate, setAfterDate] = useState<string | null>(null);

  const [beforeEntry, setBeforeEntry] = useState<ProgressPhotoEntry | null>(null);
  const [afterEntry, setAfterEntry] = useState<ProgressPhotoEntry | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [selectedPose, setSelectedPose] = useState<PhotoPose>('front');
  const [sharing, setSharing] = useState(false);

  // Track when user opens this screen
  useFocusEffect(useCallback(() => {
    analytics.track(AnalyticsEvent.PHOTO_COMPARISON_VIEWED, {});
  }, []));

  // Load available dates
  useEffect(() => {
    getPhotoDates().then((result) => {
      setLoadingDates(false);
      if (!result.error && result.data && result.data.length > 0) {
        const sorted = [...result.data].sort();
        setDates(sorted);
        if (sorted.length >= 2) {
          setBeforeDate(sorted[0]);
          setAfterDate(sorted[sorted.length - 1]);
        } else if (sorted.length === 1) {
          setBeforeDate(sorted[0]);
          setAfterDate(sorted[0]);
        }
      }
    });
  }, []);

  // Load entries when dates change
  const loadEntries = useCallback(async () => {
    if (!beforeDate || !afterDate) return;
    setLoadingEntries(true);
    const [b, a] = await Promise.all([
      getPhotoEntry(beforeDate),
      getPhotoEntry(afterDate),
    ]);
    setBeforeEntry(!b.error ? b.data : null);
    setAfterEntry(!a.error ? a.data : null);
    setLoadingEntries(false);
  }, [beforeDate, afterDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Share
  const handleShare = async () => {
    if (!viewShotRef.current) return;
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const uri = await viewShotRef.current.capture!();
      await Share.share({ url: uri, title: 'Progress Comparison' });
      analytics.track(AnalyticsEvent.PHOTO_SHARED, {});
    } catch {
      Alert.alert('Share failed', 'Could not generate the comparison image.');
    }
    setSharing(false);
  };

  if (loadingDates) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.body} />
      </View>
    );
  }

  if (dates.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Photos Yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          Take progress photos to compare your journey.
        </Text>
      </View>
    );
  }

  const beforeUrl = beforeEntry ? (beforeEntry.poses[selectedPose]?.fullUrl ?? null) : null;
  const afterUrl = afterEntry ? (afterEntry.poses[selectedPose]?.fullUrl ?? null) : null;

  const beforeWeight = beforeEntry?.weight;
  const afterWeight = afterEntry?.weight;
  const weightChange = beforeWeight != null && afterWeight != null
    ? afterWeight - beforeWeight
    : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>

      {/* Pose selector */}
      <View style={styles.poseTabs}>
        {POSES.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.poseTab,
              { backgroundColor: p === selectedPose ? Colors.body : 'transparent', borderColor: Colors.body },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPose(p); }}
          >
            <Text style={[styles.poseTabText, { color: p === selectedPose ? '#fff' : Colors.body }]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Shareable comparison view */}
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
        <View style={[styles.comparison, { backgroundColor: colors.background }]}>
          {/* Before photo */}
          <View style={styles.photoSide}>
            {loadingEntries ? (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                <ActivityIndicator color={Colors.body} />
              </View>
            ) : beforeUrl ? (
              <Image source={{ uri: beforeUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.noPhotoText, { color: colors.textSecondary }]}>No photo</Text>
              </View>
            )}
            <Text style={[styles.photoDate, { color: colors.textPrimary }]}>
              {beforeDate ? fmtDate(beforeDate) : '—'}
            </Text>
            <Text style={[styles.photoWeight, { color: colors.textSecondary }]}>
              {fmtWeight(beforeWeight, units)}
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* After photo */}
          <View style={styles.photoSide}>
            {loadingEntries ? (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                <ActivityIndicator color={Colors.body} />
              </View>
            ) : afterUrl ? (
              <Image source={{ uri: afterUrl }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.noPhotoText, { color: colors.textSecondary }]}>No photo</Text>
              </View>
            )}
            <Text style={[styles.photoDate, { color: colors.textPrimary }]}>
              {afterDate ? fmtDate(afterDate) : '—'}
            </Text>
            <Text style={[styles.photoWeight, { color: colors.textSecondary }]}>
              {fmtWeight(afterWeight, units)}
            </Text>
          </View>

          {/* PepMax watermark */}
          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>PepMax</Text>
          </View>
        </View>
      </ViewShot>

      {/* Weight change summary */}
      {weightChange != null && (
        <View style={styles.changeRow}>
          <Ionicons
            name={weightChange <= 0 ? 'trending-down-outline' : 'trending-up-outline'}
            size={18}
            color={weightChange <= 0 ? Colors.light.success : Colors.error}
          />
          <Text style={[styles.changeText, { color: weightChange <= 0 ? Colors.light.success : Colors.error }]}>
            {weightChange > 0 ? '+' : ''}{fmtWeight(Math.abs(weightChange), units)} overall
          </Text>
        </View>
      )}

      {/* Date pickers */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Before</Text>
      <DatePicker dates={dates} selected={beforeDate} onSelect={setBeforeDate} colors={colors} />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>After</Text>
      <DatePicker dates={dates} selected={afterDate} onSelect={setAfterDate} colors={colors} />

      {/* Share button */}
      <TouchableOpacity
        style={[styles.shareBtn, { backgroundColor: Colors.body, opacity: sharing ? 0.6 : 1 }]}
        onPress={handleShare}
        disabled={sharing}
        activeOpacity={0.8}
      >
        <Ionicons name="share-outline" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>{sharing ? 'Generating...' : 'Share Comparison'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

function DatePicker({
  dates,
  selected,
  onSelect,
  colors,
}: {
  dates: string[];
  selected: string | null;
  onSelect: (d: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datePicker}>
      {dates.map((d) => (
        <TouchableOpacity
          key={d}
          style={[
            styles.dateChip,
            {
              backgroundColor: d === selected ? Colors.body : colors.surface,
              borderColor: d === selected ? Colors.body : colors.border,
            },
          ]}
          onPress={() => onSelect(d)}
        >
          <Text style={[styles.dateChipText, { color: d === selected ? '#fff' : colors.textPrimary }]}>
            {fmtDate(d)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  poseTabs: { flexDirection: 'row', gap: 8, padding: 16, justifyContent: 'center' },
  poseTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  poseTabText: { fontSize: 14, fontWeight: '600' },

  comparison: { flexDirection: 'row', position: 'relative' },
  photoSide: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8 },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: { fontSize: 12, marginTop: 6 },
  photoDate: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  photoWeight: { fontSize: 12, marginTop: 2 },
  divider: { width: 1, marginVertical: 8 },
  watermark: { position: 'absolute', bottom: 16, alignSelf: 'center' },
  watermarkText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  changeText: { fontSize: 15, fontWeight: '700' },

  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 16, marginBottom: 6 },
  datePicker: { paddingHorizontal: 16, gap: 8 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  dateChipText: { fontSize: 13, fontWeight: '600' },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, borderRadius: 12 },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
