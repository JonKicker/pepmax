import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { getReconstitutableCompounds } from '../../../src/data/compoundDatabase';
import type { Compound } from '../../../src/data/compoundDatabase';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import {
  addReconProtocol,
  deleteReconProtocol,
  getReconProtocols,
} from '../../../src/services/reconProtocolService';
import {
  SYRINGE_TYPES,
  SYRINGE_TYPE_LABELS,
  SYRINGE_UNITS_PER_ML,
  WATER_PRESETS,
} from '../../../src/types/reconProtocol';
import type { ReconProtocol, SyringeType } from '../../../src/types/reconProtocol';
import SyringeSVG from '../../../src/components/SyringeSVG';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[toastStyles.toast, { opacity }]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={20} color="white" />
      <Text style={toastStyles.toastText}>Protocol saved!</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: { color: 'white', fontWeight: '600', fontSize: 14 },
});

// ─── Protocol card (swipeable) ────────────────────────────────────────────────

const DELETE_WIDTH = 80;

function ProtocolCard({
  protocol,
  onTap,
  onDelete,
  colors,
}: {
  protocol: ReconProtocol;
  onTap: (p: ReconProtocol) => void;
  onDelete: (id: string, name: string) => void;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
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

  return (
    <View style={pcStyles.swipeWrapper}>
      <View style={[pcStyles.deleteBackground, { width: DELETE_WIDTH }]}>
        <TouchableOpacity
          onPress={() => { close(); onDelete(protocol.id, protocol.name); }}
          style={pcStyles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={pcStyles.deleteBtnLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          onPress={() => { if (isOpen.current) { close(); } else { onTap(protocol); } }}
          activeOpacity={0.85}
        >
          <View style={[pcStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[pcStyles.cardAccent, { backgroundColor: Colors.peptide }]} />
            <View style={pcStyles.cardBody}>
              <Text style={[pcStyles.cardName, { color: colors.textPrimary }]}>{protocol.name}</Text>
              <View style={pcStyles.badgeRow}>
                <View style={pcStyles.badge}>
                  <Text style={[pcStyles.badgeText, { color: Colors.peptide }]}>
                    {protocol.vialMg}mg vial
                  </Text>
                </View>
                <View style={[pcStyles.badge, { marginLeft: 6 }]}>
                  <Text style={[pcStyles.badgeText, { color: Colors.peptide }]}>
                    {protocol.doseMg}mg dose
                  </Text>
                </View>
                <View style={[pcStyles.badge, { marginLeft: 6 }]}>
                  <Text style={[pcStyles.badgeText, { color: colors.textSecondary }]}>
                    {SYRINGE_TYPE_LABELS[protocol.syringeType]}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginRight: 12 }} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const pcStyles = StyleSheet.create({
  swipeWrapper: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', padding: 14 },
  deleteBtnLabel: { color: 'white', fontSize: 10, marginTop: 2, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: Colors.peptide + '1A',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ReconCalculatorScreen() {
  const { colors } = useTheme();

  // Compound picker
  const reconCompounds = useMemo(() => getReconstitutableCompounds(), []);
  const [selectedCompound, setSelectedCompound] = useState<Compound | null>(null);
  const [showCompoundPicker, setShowCompoundPicker] = useState(false);

  // Calculator inputs
  const [vialMg, setVialMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [doseMg, setDoseMg] = useState('');
  const [syringeType, setSyringeType] = useState<SyringeType>('U100');

  // Protocols
  const [protocols, setProtocols] = useState<ReconProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(true);

  // Save form
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [protocolName, setProtocolName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const loadProtocols = async () => {
    setProtocolsLoading(true);
    const result = await getReconProtocols();
    if (result.error) {
      Alert.alert('Error', 'Could not load protocols. Pull down to retry.');
    } else if (result.data) {
      setProtocols(result.data);
    }
    setProtocolsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadProtocols();
    }, [])
  );

  // ─── Derived calculations ──────────────────────────────────────────────────

  const vialMgNum = parseFloat(vialMg);
  const waterMlNum = parseFloat(waterMl);
  const doseMgNum = parseFloat(doseMg);

  const isValid =
    !isNaN(vialMgNum) && isFinite(vialMgNum) && vialMgNum > 0 &&
    !isNaN(waterMlNum) && isFinite(waterMlNum) && waterMlNum > 0 &&
    !isNaN(doseMgNum) && isFinite(doseMgNum) && doseMgNum > 0 &&
    doseMgNum <= vialMgNum;

  const concentration = isValid ? vialMgNum / waterMlNum : null;         // mg/mL
  const volumeToDrawMl = isValid ? doseMgNum / concentration! : null;    // mL
  const unitsPerMl = SYRINGE_UNITS_PER_ML[syringeType];
  const unitsToDraw = isValid && unitsPerMl !== null ? volumeToDrawMl! * unitsPerMl : null;
  const totalDoses = isValid ? Math.floor(vialMgNum / doseMgNum) : null;
  const fillPercent = isValid ? Math.min(volumeToDrawMl! / 1.0, 1.0) : 0;

  const drawLabel =
    unitsToDraw !== null
      ? `${unitsToDraw % 1 === 0 ? unitsToDraw : unitsToDraw.toFixed(1)} units`
      : volumeToDrawMl !== null
      ? `${volumeToDrawMl.toFixed(3)} mL`
      : '';

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTapProtocol = (p: ReconProtocol) => {
    setVialMg(String(p.vialMg));
    setWaterMl(String(p.waterMl));
    setDoseMg(String(p.doseMg));
    setSyringeType(p.syringeType);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteProtocol = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This protocol will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const result = await deleteReconProtocol(id);
          if (result.error) {
            Alert.alert('Error', 'Could not delete protocol. Please try again.');
            return;
          }
          setProtocols((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const handleSaveProtocol = async () => {
    if (!protocolName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this protocol.');
      return;
    }
    if (!isValid) {
      Alert.alert('Invalid inputs', 'Please fill in all calculator fields with valid values.');
      return;
    }

    setSaving(true);
    const result = await addReconProtocol({
      name: protocolName.trim(),
      vialMg: vialMgNum,
      waterMl: waterMlNum,
      doseMg: doseMgNum,
      syringeType,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1400);
    setProtocolName('');
    setShowSaveForm(false);
    loadProtocols();
  };

  const handleSelectCompound = (compound: Compound) => {
    setSelectedCompound(compound);
    setShowCompoundPicker(false);
    const match = compound.typicalVialSize.match(/(\d+(?:\.\d+)?)\s*mg/i);
    if (match) setVialMg(match[1]);
    if (compound.commonDoses.length > 0) {
      setDoseMg(String(compound.commonDoses[0]));
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── My Protocols ── */}
          {(protocolsLoading || protocols.length > 0) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Protocols</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                Tap to load · Swipe left to delete
              </Text>
              {protocolsLoading ? (
                <ActivityIndicator color={Colors.peptide} style={{ marginTop: 12 }} />
              ) : (
                protocols.map((p) => (
                  <ProtocolCard
                    key={p.id}
                    protocol={p}
                    onTap={handleTapProtocol}
                    onDelete={handleDeleteProtocol}
                    colors={colors}
                  />
                ))
              )}
            </View>
          )}

          {/* ── Compound Picker ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Compound</Text>
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Optional — select to pre-fill calculator
            </Text>
            <TouchableOpacity
              style={[styles.compoundPickerBtn, { backgroundColor: colors.surface, borderColor: selectedCompound ? Colors.peptide : colors.border }]}
              onPress={() => setShowCompoundPicker((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={{ color: selectedCompound ? colors.textPrimary : colors.textSecondary, fontSize: 15 }}>
                {selectedCompound ? selectedCompound.name : 'Select a compound...'}
              </Text>
              <Ionicons
                name={showCompoundPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {showCompoundPicker && (
              <View style={[styles.pickerList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FlatList
                  data={reconCompounds}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectCompound(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerItemName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.pickerItemMeta, { color: colors.textSecondary }]}>{item.typicalVialSize}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* ── Calculator ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Calculator</Text>

            {/* Vial Size */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>VIAL SIZE (mg)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={vialMg}
              onChangeText={setVialMg}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="e.g. 5"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Bacteriostatic Water */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>BACTERIOSTATIC WATER (mL)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputFlex, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={waterMl}
                onChangeText={setWaterMl}
                keyboardType="decimal-pad"
                returnKeyType="done"
                placeholder="e.g. 2"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.presetRow}>
                {WATER_PRESETS.map((p) => {
                  const active = waterMl === String(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: active ? Colors.peptide : colors.surface,
                          borderColor: active ? Colors.peptide : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setWaterMl(String(p));
                      }}
                    >
                      <Text style={[styles.presetBtnText, { color: active ? 'white' : colors.textSecondary }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Desired Dose */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DESIRED DOSE (mg)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={doseMg}
              onChangeText={setDoseMg}
              keyboardType="decimal-pad"
              returnKeyType="done"
              placeholder="e.g. 0.25"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Syringe Type */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SYRINGE TYPE</Text>
            <View style={styles.unitRow}>
              {SYRINGE_TYPES.map((s) => {
                const active = syringeType === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.unitBtn,
                      {
                        backgroundColor: active ? Colors.peptide : colors.surface,
                        borderColor: active ? Colors.peptide : colors.border,
                      },
                    ]}
                    onPress={() => setSyringeType(s)}
                  >
                    <Text style={[styles.unitBtnText, { color: active ? 'white' : colors.textSecondary }]}>
                      {SYRINGE_TYPE_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Results ── */}
          {isValid && (
            <>
              <View style={[styles.section, styles.resultsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Results</Text>

                <ResultRow
                  formula={`${vialMg} mg ÷ ${waterMl} mL`}
                  result={`${concentration!.toFixed(2)} mg/mL`}
                  label="Concentration"
                  colors={colors}
                />

                <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />

                <ResultRow
                  formula={`${doseMg} mg ÷ ${concentration!.toFixed(2)} mg/mL`}
                  result={`${volumeToDrawMl!.toFixed(3)} mL`}
                  label="Volume to Draw"
                  colors={colors}
                />

                {unitsToDraw !== null && (
                  <>
                    <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />
                    <ResultRow
                      formula={`${volumeToDrawMl!.toFixed(3)} mL × ${unitsPerMl} units/mL`}
                      result={`${unitsToDraw % 1 === 0 ? unitsToDraw : unitsToDraw.toFixed(1)} units`}
                      label="Syringe Units"
                      colors={colors}
                    />
                  </>
                )}

                <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />

                <ResultRow
                  formula={`floor(${vialMg} ÷ ${doseMg})`}
                  result={`${totalDoses} doses`}
                  label="Doses per Vial"
                  colors={colors}
                />
              </View>

              {/* ── Syringe SVG ── */}
              <View style={[styles.section, styles.syringeSection]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Draw Visualization</Text>
                <View style={styles.syringeContainer}>
                  <SyringeSVG
                    fillPercent={fillPercent}
                    label={drawLabel}
                    accentColor={Colors.peptide}
                    height={260}
                  />
                </View>
              </View>
            </>
          )}

          {/* ── Save Protocol ── */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveProtocolBtn, { borderColor: Colors.peptide }]}
              onPress={() => setShowSaveForm((v) => !v)}
            >
              <Ionicons
                name={showSaveForm ? 'chevron-up' : 'bookmark-outline'}
                size={16}
                color={Colors.peptide}
              />
              <Text style={[styles.saveProtocolBtnText, { color: Colors.peptide }]}>
                {showSaveForm ? 'Cancel' : 'Save Protocol'}
              </Text>
            </TouchableOpacity>

            {showSaveForm && (
              <View style={styles.saveForm}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>PROTOCOL NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  value={protocolName}
                  onChangeText={setProtocolName}
                  placeholder="e.g. BPC-157 Morning"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: Colors.peptide }]}
                  onPress={handleSaveProtocol}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toastVisible} />
    </View>
  );
}

// ─── Result row component ─────────────────────────────────────────────────────

function ResultRow({
  formula,
  result,
  label,
  colors,
}: {
  formula: string;
  result: string;
  label: string;
  colors: ReturnType<typeof import('../../../src/hooks/useTheme').useTheme>['colors'];
}) {
  return (
    <View style={styles.resultRow}>
      <View style={styles.resultLeft}>
        <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.resultFormula, { color: colors.textSecondary }]}>{formula}</Text>
      </View>
      <Text style={[styles.resultValue, { color: Colors.peptide }]}>{result}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 80 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionHint: { fontSize: 12, marginBottom: 10 },

  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputFlex: { flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  presetRow: { flexDirection: 'row', gap: 6 },
  presetBtn: {
    width: 40,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: { fontSize: 15, fontWeight: '600' },

  unitRow: { flexDirection: 'row', gap: 8 },
  unitBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitBtnText: { fontSize: 13, fontWeight: '600' },

  // Results card
  resultsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  resultLeft: { flex: 1 },
  resultLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 },
  resultFormula: { fontSize: 12, opacity: 0.75 },
  resultValue: { fontSize: 18, fontWeight: '800', marginLeft: 12 },
  resultDivider: { height: StyleSheet.hairlineWidth },

  // Syringe section
  syringeSection: {
    alignItems: 'flex-start',
  },
  syringeContainer: {
    marginTop: 8,
    paddingLeft: 20,
    paddingRight: 80,
  },

  // Compound picker
  compoundPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
  },
  pickerList: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemName: { fontSize: 14, fontWeight: '600' },
  pickerItemMeta: { fontSize: 11, marginTop: 2 },

  // Save protocol
  saveProtocolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveProtocolBtnText: { fontSize: 15, fontWeight: '600' },
  saveForm: { marginTop: 12 },
  saveBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
