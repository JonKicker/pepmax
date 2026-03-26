/**
 * ShareButton — reusable share button that captures a ViewShot and invokes the
 * native share sheet.
 *
 * Off-screen strategy: overflow:hidden wrapper with height:0 contains the
 * ViewShot. This is reliable on Android (left:-9999 is fragile there).
 *
 * Double-tap guard: `sharing` state blocks a second press while capture/share
 * is in progress.
 *
 * Shows ActivityIndicator during capture instead of an icon.
 *
 * For list contexts (e.g. trophy-case), pass a single instance and update
 * `data` prop as the user taps different items — avoids creating N ViewShots.
 */
import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { captureAndShare } from '../../services/cardGenerator';
import { ShareableCard } from './ShareableCard';
import type { ShareCardData } from '../../types/shareCard';

type Props = {
  data: ShareCardData;
  /** Tint colour for the share icon */
  color?: string;
  /** Icon size (default 22) */
  size?: number;
  /** Called just before the capture + share flow begins (e.g. to pause auto-dismiss timers) */
  onShareStart?: () => void;
  /** Called in the finally block after the share flow completes or errors */
  onShareEnd?: () => void;
};

export function ShareButton({ data, color = '#A0A0B8', size = 22, onShareStart, onShareEnd }: Props) {
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = React.useState(false);

  const handlePress = useCallback(async () => {
    if (sharing) return; // double-tap guard
    onShareStart?.();
    setSharing(true);
    try {
      // ViewShot's ref type exposes `capture` at the instance level.
      // We cast to the minimal interface expected by captureAndShare.
      const result = await captureAndShare(
        viewShotRef as React.RefObject<{ capture: () => Promise<string> }>,
        data,
      );
      if (result.error) {
        // Only alert on genuine errors, not sharing unavailability in simulators
        const msg = result.error.message;
        if (!msg.includes('not available')) {
          Alert.alert('Could not share', 'Please try again.');
        }
      }
    } finally {
      setSharing(false);
      onShareEnd?.();
    }
  }, [sharing, data, onShareStart, onShareEnd]);

  return (
    <>
      {/* Off-screen ViewShot: overflow:hidden + height:0 wrapper */}
      <View style={styles.offScreenWrapper}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
        >
          <ShareableCard data={data} />
        </ViewShot>
      </View>

      {/* Visible button */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={sharing}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
        style={styles.button}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons name="share-outline" size={size} color={color} />
        )}
      </TouchableOpacity>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  offScreenWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 0,
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
});
