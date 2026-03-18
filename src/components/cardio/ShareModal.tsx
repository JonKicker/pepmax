import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import ShareCard, { SHARE_CARD_DIMS, type ShareFormat } from './ShareCard';
import { captureShareCard, shareImage, saveToPhotos } from '../../utils/shareCardio';
import type { CardioSession, DistanceUnit } from '../../types/cardio';

// ─── Preview scaling ───────────────────────────────────────────────────────────
// The ShareCard renders at its native capture dimensions (360×640 or 360×360).
// For the modal preview we scale it down and clip with overflow:hidden so the
// capture target (cardRef) is visible but sized for the sheet.
const PREVIEW_W = 280;

function getPreviewStyle(format: ShareFormat) {
  const { width, height } = SHARE_CARD_DIMS[format];
  const scale = PREVIEW_W / width;
  const previewH = height * scale;
  // Transform is applied from the center of the layout box, so we shift the
  // inner view by half the layout-vs-visual difference to align top-left edges.
  const offsetLeft = -((width - PREVIEW_W) / 2);
  const offsetTop = -((height - previewH) / 2);
  return { scale, previewH, offsetLeft, offsetTop };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  session: CardioSession;
  unit: DistanceUnit;
  onClose: () => void;
};

export default function ShareModal({ visible, session, unit, onClose }: Props) {
  const { colors } = useTheme();
  const [format, setFormat] = useState<ShareFormat>('story');
  // Single capturing state gates both Share and Save (Ray requirement)
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<View | null>(null);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCapturing(true);
    try {
      const uri = await captureShareCard(cardRef);
      await shareImage(uri);
    } catch {
      Alert.alert('Share Failed', 'Could not generate share image. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturing(true);
    try {
      const uri = await captureShareCard(cardRef);
      const result = await saveToPhotos(uri);
      if (result.permissionDenied) {
        Alert.alert(
          'Permission Required',
          'Allow photo library access in Settings to save images.'
        );
      } else {
        Alert.alert('Saved!', 'Workout card saved to your photo library.');
      }
    } catch {
      Alert.alert('Save Failed', 'Could not save image. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const { scale, previewH, offsetLeft, offsetTop } = getPreviewStyle(format);
  const { width: cardW, height: cardH } = SHARE_CARD_DIMS[format];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title + close */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Share Workout</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Format toggle */}
          <View style={[styles.formatToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {(['story', 'feed'] as ShareFormat[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.formatBtn, format === f && { backgroundColor: Colors.cardio }]}
                onPress={() => setFormat(f)}
              >
                <Text
                  style={[
                    styles.formatBtnText,
                    { color: format === f ? 'white' : colors.textSecondary },
                  ]}
                >
                  {f === 'story' ? 'Story (9:16)' : 'Square (1:1)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card preview — ShareCard renders at native dimensions, clipped to preview size */}
          <View
            style={[
              styles.previewClip,
              { width: PREVIEW_W, height: previewH },
            ]}
          >
            <View
              style={{
                width: cardW,
                height: cardH,
                transform: [{ scale }],
                marginLeft: offsetLeft,
                marginTop: offsetTop,
              }}
            >
              <ShareCard ref={cardRef} session={session} unit={unit} format={format} />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.saveBtn,
                { borderColor: colors.border },
                capturing && styles.btnDisabled,
              ]}
              onPress={handleSave}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator size="small" color={Colors.cardio} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={17} color={Colors.cardio} />
                  <Text style={[styles.btnText, { color: Colors.cardio }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: Colors.cardio },
                capturing && styles.btnDisabled,
              ]}
              onPress={handleShare}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={17} color="white" />
                  <Text style={[styles.btnText, { color: 'white' }]}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 18,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: { fontSize: 17, fontWeight: '700' },

  formatToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  formatBtnText: { fontSize: 13, fontWeight: '600' },

  previewClip: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },

  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveBtn: { borderWidth: 1 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700', fontSize: 15 },
});
