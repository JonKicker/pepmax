/**
 * ProtocolCard — displays a single ProtocolInfo with schedule/duration info,
 * optional dose pills, and a "Start Protocol" action button.
 * Uses GlassCard for consistent glassmorphic styling.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { GlassCard } from '../GlassCard';
import { AnimatedPressable } from '../AnimatedPressable';
import type { ProtocolInfo } from '../../types/education';

interface ProtocolCardProps {
  protocol: ProtocolInfo;
  compoundName: string;
  onStartProtocol: (protocol: ProtocolInfo) => void;
}

export function ProtocolCard({ protocol, compoundName, onStartProtocol }: ProtocolCardProps) {
  const { colors } = useTheme();

  const hasDosePills = !!protocol.startingDose || !!protocol.maintenanceDose;

  return (
    <GlassCard intensity="subtle" accentColor={Colors.peptide}>
      {/* Protocol name */}
      <Text style={[styles.protocolName, { color: colors.textPrimary }]}>
        {protocol.name}
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {protocol.description}
      </Text>

      {/* Info row: schedule + duration */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {protocol.schedule}
          </Text>
        </View>
        <View style={styles.infoSpacer} />
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {protocol.duration}
          </Text>
        </View>
      </View>

      {/* Dose pills */}
      {hasDosePills && (
        <View style={styles.pillRow}>
          {!!protocol.startingDose && (
            <View style={[styles.dosePill, { backgroundColor: Colors.peptide + '18', borderColor: Colors.peptide + '40' }]}>
              <Text style={[styles.dosePillText, { color: Colors.peptide }]}>
                Starting: {protocol.startingDose}{protocol.unit ? ` ${protocol.unit}` : ''}
              </Text>
            </View>
          )}
          {!!protocol.maintenanceDose && (
            <View style={[styles.dosePill, { backgroundColor: Colors.peptide + '10', borderColor: Colors.peptide + '30' }]}>
              <Text style={[styles.dosePillText, { color: Colors.peptide }]}>
                Maintenance: {protocol.maintenanceDose}{protocol.unit ? ` ${protocol.unit}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer: Start Protocol button */}
      <View style={styles.footer}>
        <AnimatedPressable
          haptic
          hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
          scaleValue={0.96}
          style={styles.startButton}
          onPress={() => onStartProtocol(protocol)}
        >
          <View style={[styles.startButtonInner, { backgroundColor: Colors.peptide }]}>
            <Text style={styles.startButtonText}>Start Protocol</Text>
          </View>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  protocolName: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 4,
  },
  infoText: {
    fontSize: 13,
  },
  infoSpacer: {
    width: 16,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dosePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dosePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  startButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  startButtonInner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
