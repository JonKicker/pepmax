/**
 * BeaconIndicator — small "Beacon Active" pill shown during active session.
 * Tap to see which contacts are being notified.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BEACON_GREEN = '#22c55e';

type Props = {
  contactCount: number;
};

export default function BeaconIndicator({ contactCount }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setTooltipVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.dot} />
        <Ionicons name="radio-outline" size={13} color={BEACON_GREEN} />
        <Text style={styles.label}>Beacon Active</Text>
      </TouchableOpacity>

      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTooltipVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.tooltip}>
                <Ionicons name="radio-outline" size={24} color={BEACON_GREEN} />
                <Text style={styles.tooltipTitle}>Safety Beacon Active</Text>
                <Text style={styles.tooltipBody}>
                  Your live location is being shared with{' '}
                  {contactCount} contact{contactCount !== 1 ? 's' : ''}.
                  {'\n'}They can track you at pepmax.app/beacon/…
                </Text>
                <TouchableOpacity
                  style={styles.tooltipDismiss}
                  onPress={() => setTooltipVisible(false)}
                >
                  <Text style={styles.tooltipDismissText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: BEACON_GREEN + '1A',
    borderColor: BEACON_GREEN,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
    marginBottom: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BEACON_GREEN,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: BEACON_GREEN,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  tooltip: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    maxWidth: 280,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  tooltipBody: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  tooltipDismiss: {
    marginTop: 4,
    backgroundColor: BEACON_GREEN,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tooltipDismissText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
