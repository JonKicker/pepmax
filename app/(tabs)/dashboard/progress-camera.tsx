/**
 * progress-camera — 3-step camera flow for capturing front/side/back photos.
 *
 * Flow: pose guide → capture → preview (retake/next/skip) → repeat for next pose → review all → save
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { toLocalDateKey } from '../../../src/utils/nutrition';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useProgressPhotos } from '../../../src/hooks/useProgressPhotos';
import PoseOverlay from '../../../src/components/body/PoseOverlay';
import type { PhotoPose, CapturedPhoto } from '../../../src/types/bodyTracking';

const POSES: PhotoPose[] = ['front', 'side', 'back'];

type Stage = 'camera' | 'preview' | 'review';

export default function ProgressCameraScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { upload, uploading, uploadProgress } = useProgressPhotos();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [poseIndex, setPoseIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('camera');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [captures, setCaptures] = useState<CapturedPhoto[]>([]);

  const currentPose = POSES[poseIndex];
  const isLastPose = poseIndex >= POSES.length - 1;

  // ── Permission not granted yet ──────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.body} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionScreen, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={64} color={Colors.body} style={styles.permissionIcon} />
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          Camera Access Needed
        </Text>
        <Text style={[styles.permissionBody, { color: colors.textSecondary }]}>
          PepMax uses your camera to take progress photos. Your photos are stored privately in your account.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: Colors.body }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: Colors.body }]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.permissionBtnText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.permissionCancel}>
          <Text style={[styles.permissionCancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Capture ──────────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (photo?.uri) {
      setPreviewUri(photo.uri);
      setStage('preview');
    }
  };

  // ── Retake ───────────────────────────────────────────────────────────────
  const handleRetake = () => {
    setPreviewUri(null);
    setStage('camera');
  };

  // ── Accept photo and move to next pose ───────────────────────────────────
  const handleNext = () => {
    if (previewUri) {
      setCaptures((prev) => [...prev, { pose: currentPose, uri: previewUri }]);
    }
    setPreviewUri(null);
    if (isLastPose) {
      setStage('review');
    } else {
      setPoseIndex((i) => i + 1);
      setStage('camera');
    }
  };

  // ── Skip this pose ───────────────────────────────────────────────────────
  const handleSkip = () => {
    setPreviewUri(null);
    if (isLastPose) {
      if (captures.length === 0) {
        Alert.alert('No Photos', 'Take at least one photo before saving.');
        return;
      }
      setStage('review');
    } else {
      setPoseIndex((i) => i + 1);
      setStage('camera');
    }
  };

  // ── Save all captures ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (captures.length === 0) {
      Alert.alert('No Photos', 'Take at least one photo before saving.');
      return;
    }
    const date = toLocalDateKey();
    const result = await upload(date, captures);
    if (result.error) {
      Alert.alert('Upload Failed', 'Could not save your photos. Please try again.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  // ── Uploading state ────────────────────────────────────────────────────────
  if (uploading) {
    const pct = uploadProgress ? Math.round(uploadProgress.overall * 100) : 0;
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.body} />
        <Text style={[styles.uploadLabel, { color: colors.textPrimary }]}>
          Uploading photos... {pct}%
        </Text>
        {uploadProgress && (
          <Text style={[styles.uploadPose, { color: colors.textSecondary }]}>
            {uploadProgress.currentPose}
          </Text>
        )}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: Colors.body }]} />
        </View>
      </View>
    );
  }

  // ── Review stage ──────────────────────────────────────────────────────────
  if (stage === 'review') {
    return (
      <View style={[styles.review, { backgroundColor: colors.background }]}>
        <Text style={[styles.reviewTitle, { color: colors.textPrimary }]}>Review Photos</Text>
        <ScrollView horizontal contentContainerStyle={styles.reviewScroll}>
          {captures.map((c) => (
            <View key={c.pose} style={styles.reviewItem}>
              <Image source={{ uri: c.uri }} style={styles.reviewImage} />
              <Text style={[styles.reviewPose, { color: colors.textSecondary }]}>
                {c.pose.charAt(0).toUpperCase() + c.pose.slice(1)}
              </Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.body }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>Save Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setPoseIndex(0); setStage('camera'); setCaptures([]); }} style={styles.retakeAll}>
          <Text style={[styles.retakeAllText, { color: colors.textSecondary }]}>Start over</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Preview stage ─────────────────────────────────────────────────────────
  if (stage === 'preview' && previewUri) {
    return (
      <View style={styles.fullScreen}>
        <Image source={{ uri: previewUri }} style={styles.previewImage} />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.previewBtn} onPress={handleRetake}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
            <Text style={styles.previewBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.previewBtn, { backgroundColor: Colors.body }]}
            onPress={handleNext}
          >
            <Text style={styles.previewBtnText}>{isLastPose ? 'Finish' : 'Next'}</Text>
            <Ionicons name="chevron-forward-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera stage ─────────────────────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <PoseOverlay pose={currentPose} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close-outline" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.poseIndicators}>
            {POSES.map((p, i) => (
              <View
                key={p}
                style={[
                  styles.poseDot,
                  {
                    backgroundColor: captures.some((c) => c.pose === p)
                      ? Colors.body
                      : i === poseIndex
                        ? '#fff'
                        : 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            ))}
          </View>
          <TouchableOpacity onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.8}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  camera: { flex: 1 },

  // Permission screen
  permissionScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionIcon: { marginBottom: 20 },
  permissionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  permissionBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  permissionBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 12 },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permissionCancel: { padding: 8 },
  permissionCancelText: { fontSize: 15 },

  // Camera UI
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  poseIndicators: { flexDirection: 'row', gap: 8 },
  poseDot: { width: 10, height: 10, borderRadius: 5 },
  skipText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },

  // Preview
  previewImage: { flex: 1, resizeMode: 'cover' },
  previewActions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Review
  review: { flex: 1, padding: 24 },
  reviewTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  reviewScroll: { gap: 12, paddingBottom: 20 },
  reviewItem: { alignItems: 'center' },
  reviewImage: { width: 160, height: 213, borderRadius: 12, resizeMode: 'cover' },
  reviewPose: { fontSize: 14, marginTop: 8, textTransform: 'capitalize' },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retakeAll: { alignItems: 'center', paddingVertical: 12 },
  retakeAllText: { fontSize: 14 },

  // Upload
  uploadLabel: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  uploadPose: { fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  progressTrack: { width: '80%', height: 6, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
