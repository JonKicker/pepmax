import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import type { EquipmentProfile } from '../../types/equipmentProfile';

// ─── Quick-switch modal ───────────────────────────────────────────────────────

interface EquipmentQuickSwitchProps {
  visible: boolean;
  onClose: () => void;
  profiles: EquipmentProfile[];
  activeProfileId: string | null;
  onSwitch: (id: string) => void;
  onManage: () => void;
  colors: any;
}

export function EquipmentQuickSwitch({
  visible,
  onClose,
  profiles,
  activeProfileId,
  onSwitch,
  onManage,
  colors,
}: EquipmentQuickSwitchProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Switch Equipment Profile</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfileId;
            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => {
                  if (isActive) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSwitch(profile.id);
                  onClose();
                }}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    isActive
                      ? { backgroundColor: Colors.gym, borderColor: Colors.gym }
                      : { backgroundColor: 'transparent', borderColor: colors.border },
                  ]}
                >
                  {isActive && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowName, { color: colors.textPrimary }]}>{profile.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                    {profile.equipment.length === 0
                      ? 'No equipment'
                      : profile.equipment.length === 19
                      ? 'All equipment'
                      : `${profile.equipment.length} items`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={() => { onClose(); onManage(); }}
          style={[styles.manageBtn, { borderTopColor: colors.border }]}
        >
          <Ionicons name="settings-outline" size={16} color={Colors.gym} />
          <Text style={[styles.manageTxt, { color: Colors.gym }]}>Manage Profiles</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 1 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  manageTxt: { fontSize: 15, fontWeight: '600' },
});

// ─── Exercise swap modal ──────────────────────────────────────────────────────

interface ExerciseSwapModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  missingEquipment: string;
  alternatives: Array<{ id: string; name: string; equipment: string; primaryMuscles: string[] }>;
  onSwap: (exerciseId: string, exerciseName: string) => void;
  colors: any;
}

export function ExerciseSwapModal({
  visible,
  onClose,
  exerciseName,
  missingEquipment,
  alternatives,
  onSwap,
  colors,
}: ExerciseSwapModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={swapStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <SafeAreaView style={[swapStyles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[swapStyles.handle, { backgroundColor: colors.border }]} />

        <Text style={[swapStyles.title, { color: colors.textPrimary }]}>Swap Exercise</Text>
        <Text style={[swapStyles.exerciseName, { color: Colors.gym }]}>{exerciseName}</Text>
        <View style={swapStyles.warningRow}>
          <Ionicons name="warning-outline" size={14} color={Colors.warning} />
          <Text style={[swapStyles.warnTxt, { color: Colors.warning }]}>
            Requires: {missingEquipment}
          </Text>
        </View>

        <Text style={[swapStyles.altsLabel, { color: colors.textSecondary }]}>ALTERNATIVES</Text>

        {alternatives.length === 0 ? (
          <View style={swapStyles.emptyState}>
            <Text style={[swapStyles.emptyTxt, { color: colors.textSecondary }]}>
              No alternatives available for your current equipment profile.
            </Text>
          </View>
        ) : (
          alternatives.map((alt) => (
            <TouchableOpacity
              key={alt.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSwap(alt.id, alt.name);
                onClose();
              }}
              style={[swapStyles.altCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={swapStyles.altContent}>
                <Text style={[swapStyles.altName, { color: colors.textPrimary }]}>{alt.name}</Text>
                <Text style={[swapStyles.altMeta, { color: colors.textSecondary }]}>
                  {alt.primaryMuscles[0]} · {alt.equipment}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={18} color={Colors.gym} />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          onPress={onClose}
          style={[swapStyles.keepBtn, { borderColor: colors.border }]}
        >
          <Text style={[swapStyles.keepTxt, { color: colors.textSecondary }]}>Keep Exercise</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const swapStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700' },
  exerciseName: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginBottom: 16,
  },
  warnTxt: { fontSize: 13, fontWeight: '600' },
  altsLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyTxt: { fontSize: 14, textAlign: 'center' },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  altContent: { flex: 1 },
  altName: { fontSize: 15, fontWeight: '600' },
  altMeta: { fontSize: 13, marginTop: 2 },
  keepBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  keepTxt: { fontSize: 15, fontWeight: '600' },
});
