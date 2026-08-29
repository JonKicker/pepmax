import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { useEquipmentProfiles } from '../../../src/hooks/useEquipmentProfiles';
import { ALL_EQUIPMENT } from '../../../src/types/equipmentProfile';
import type { EquipmentProfile, ProfileEquipment } from '../../../src/types/equipmentProfile';

const DELETE_WIDTH = 80;

// ─── Swipeable profile card ───────────────────────────────────────────────────

interface ProfileCardProps {
  profile: EquipmentProfile;
  isExpanded: boolean;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  colors: any;
}

function ProfileCard({ profile, isExpanded, onPress, onDelete, colors }: ProfileCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !profile.isPreset && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        if (!isOpen.current) {
          if (dx < 0) translateX.setValue(Math.max(dx, -DELETE_WIDTH));
        } else {
          translateX.setValue(Math.min(0, dx - DELETE_WIDTH));
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (!isOpen.current && (dx < -DELETE_WIDTH / 2 || vx < -0.3)) {
          isOpen.current = true;
          Animated.spring(translateX, { toValue: -DELETE_WIDTH, useNativeDriver: true }).start();
        } else {
          isOpen.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const equipCount = profile.equipment.length;
  const subtitle =
    equipCount === 0
      ? 'No equipment'
      : equipCount === ALL_EQUIPMENT.length
      ? 'All equipment'
      : `${equipCount} item${equipCount !== 1 ? 's' : ''}`;

  const chevronIcon = isExpanded ? 'chevron-up' : 'chevron-down';

  return (
    <View style={cardStyles.wrapper}>
      {!profile.isPreset && (
        <View style={[cardStyles.deleteBg, { width: DELETE_WIDTH }]}>
          <TouchableOpacity
            onPress={() => {
              close();
              onDelete(profile.id);
            }}
            style={cardStyles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={cardStyles.deleteTxt}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(profile.id);
          }}
          activeOpacity={0.7}
          style={[
            cardStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: profile.isActive ? Colors.gym : colors.border,
              borderWidth: profile.isActive ? 2 : 1,
            },
          ]}
        >
          <View style={[cardStyles.accent, { backgroundColor: Colors.gym }]} />
          <View style={cardStyles.content}>
            <View style={cardStyles.row}>
              <Text style={[cardStyles.name, { color: colors.textPrimary }]}>{profile.name}</Text>
              {profile.isActive && (
                <View style={[cardStyles.activeBadge, { backgroundColor: Colors.gym + '20' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.gym} />
                  <Text style={[cardStyles.activeTxt, { color: Colors.gym }]}>Active</Text>
                </View>
              )}
              {profile.isPreset && (
                <View style={[cardStyles.presetBadge, { backgroundColor: colors.border }]}>
                  <Text style={[cardStyles.presetTxt, { color: colors.textSecondary }]}>
                    Preset
                  </Text>
                </View>
              )}
            </View>
            <Text style={[cardStyles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

            {/* Accordion: equipment list when expanded */}
            {isExpanded && profile.equipment.length > 0 && (
              <View style={cardStyles.equipGrid}>
                {profile.equipment.map((item) => (
                  <View
                    key={item}
                    style={[cardStyles.equipChip, { backgroundColor: Colors.gym + '18', borderColor: Colors.gym + '55' }]}
                  >
                    <Text style={[cardStyles.equipChipTxt, { color: Colors.gym }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            {isExpanded && profile.equipment.length === 0 && (
              <Text style={[cardStyles.noEquipTxt, { color: colors.textSecondary }]}>
                No equipment selected for this profile.
              </Text>
            )}
          </View>
          <Ionicons name={chevronIcon} size={18} color={colors.textSecondary} style={cardStyles.chevron} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 10 },
  deleteBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  deleteTxt: { color: 'white', fontSize: 11, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  subtitle: { fontSize: 13 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeTxt: { fontSize: 12, fontWeight: '700' },
  presetBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  presetTxt: { fontSize: 12, fontWeight: '600' },
  chevron: { marginTop: 16, marginRight: 12 },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  equipChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  equipChipTxt: { fontSize: 12, fontWeight: '600' },
  noEquipTxt: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
});

// ─── Equipment chip (editor) ──────────────────────────────────────────────────

function EquipChip({
  item,
  selected,
  onToggle,
  colors,
}: {
  item: ProfileEquipment;
  selected: boolean;
  onToggle: (item: ProfileEquipment) => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(item);
      }}
      style={[
        chipStyles.chip,
        selected
          ? { backgroundColor: Colors.gym, borderColor: Colors.gym }
          : { backgroundColor: 'transparent', borderColor: colors.border },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[chipStyles.label, { color: selected ? 'white' : colors.textSecondary }]}>
        {item}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EquipmentProfilesScreen() {
  const { colors } = useTheme();
  const {
    profiles,
    isLoading,
    error,
    loadProfiles,
    switchProfile,
    createCustomProfile,
    removeProfile,
  } = useEquipmentProfiles();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedEquip, setSelectedEquip] = useState<ProfileEquipment[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles])
  );

  const handleCardPress = async (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;

    if (profile.isActive) {
      // Active card: toggle expand/collapse
      setExpandedId((prev) => (prev === id ? null : id));
    } else {
      // Non-active card: switch active + expand, collapse previous
      try {
        await switchProfile(id);
        setExpandedId(id);
      } catch {
        Alert.alert('Switch failed', 'Could not switch equipment profile. Please try again.');
      }
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Profile', 'Are you sure you want to delete this profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (expandedId === id) setExpandedId(null);
          removeProfile(id);
        },
      },
    ]);
  };

  const toggleEquip = (item: ProfileEquipment) => {
    setSelectedEquip((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSaveCustom = async () => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this profile.');
      return;
    }
    setSaving(true);
    try {
      await createCustomProfile(newName.trim(), selectedEquip);
      setShowEditor(false);
      setNewName('');
      setSelectedEquip([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Save failed', 'Could not create profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PROFILES</Text>

        {/* Error banner */}
        {error !== null && (
          <View style={[styles.errorBanner, { backgroundColor: Colors.error + '18', borderColor: Colors.error }]}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={[styles.errorTxt, { color: Colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={loadProfiles} style={styles.retryBtn}>
              <Text style={[styles.retryTxt, { color: Colors.error }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={Colors.gym} style={{ marginTop: 20 }} />
        ) : (
          <>
            {/* Empty state */}
            {profiles.length === 0 && error === null && (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Profiles Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Create a custom profile below to track your equipment.
                </Text>
              </View>
            )}

            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isExpanded={expandedId === profile.id}
                onPress={handleCardPress}
                onDelete={handleDelete}
                colors={colors}
              />
            ))}
          </>
        )}

        {/* Create custom button */}
        {!showEditor && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditor(true);
            }}
            style={[styles.createBtn, { borderColor: Colors.gym }]}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.gym} />
            <Text style={[styles.createBtnTxt, { color: Colors.gym }]}>Create Custom Profile</Text>
          </TouchableOpacity>
        )}

        {/* Custom profile editor */}
        {showEditor && (
          <View
            style={[
              styles.editor,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.editorTitle, { color: colors.textPrimary }]}>
              New Custom Profile
            </Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Profile name (e.g. My Garage Gym)"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.nameInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              maxLength={40}
            />

            <Text style={[styles.equipLabel, { color: colors.textSecondary }]}>
              SELECT EQUIPMENT
            </Text>

            <View style={styles.chipGrid}>
              {ALL_EQUIPMENT.map((item) => (
                <EquipChip
                  key={item}
                  item={item}
                  selected={selectedEquip.includes(item)}
                  onToggle={toggleEquip}
                  colors={colors}
                />
              ))}
            </View>

            <View style={styles.editorBtns}>
              <TouchableOpacity
                onPress={() => {
                  setShowEditor(false);
                  setNewName('');
                  setSelectedEquip([]);
                }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCustom}
                disabled={saving}
                style={[styles.saveBtn, { backgroundColor: Colors.gym }]}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveTxt}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorTxt: { flex: 1, fontSize: 13, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  retryTxt: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  createBtnTxt: { fontSize: 15, fontWeight: '700' },
  editor: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  editorTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  equipLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  editorBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveTxt: { color: 'white', fontSize: 15, fontWeight: '700' },
});
