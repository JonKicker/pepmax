/**
 * PresetBrowser — modal sheet for browsing and adding compounds from COMPOUND_DATABASE.
 *
 * Features: search bar, 14-group filter chips, expandable compound cards with
 * dose chips, custom dose input, and a detail view with clinical information.
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { searchCompounds, getCompoundGroups, hasSafetyWarning } from '../../data/compoundDatabase';
import type { Compound, CompoundCategory } from '../../data/compoundDatabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (compound: Compound, dose: number) => void;
  existingPeptideNames: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeProps(status: string, isDark: boolean): { label: string; bg: string; text: string } {
  if (status.startsWith('FDA')) return isDark
    ? { label: 'FDA', bg: '#1B5E20', text: '#A5D6A7' }
    : { label: 'FDA', bg: '#E8F5E9', text: '#1B5E20' };
  if (status === 'Research Peptide') return isDark
    ? { label: 'Research', bg: '#BF360C', text: '#FFCCBC' }
    : { label: 'Research', bg: '#FFF3E0', text: '#E65100' };
  return isDark
    ? { label: 'Compounded', bg: '#424242', text: '#E0E0E0' }
    : { label: 'Compounded', bg: '#E0E0E0', text: '#424242' };
}

// ─── Pill tag ─────────────────────────────────────────────────────────────────

function PillTag({ label, bgColor, textColor }: { label: string; bgColor: string; textColor: string }) {
  return (
    <View style={[styles.pillTag, { backgroundColor: bgColor }]}>
      <Text style={[styles.pillTagText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─── Compound card ────────────────────────────────────────────────────────────

function CompoundCard({
  compound,
  isExpanded,
  showDetails,
  alreadyInLibrary,
  customDose,
  onCustomDoseChange,
  onToggle,
  onToggleDetails,
  onAdd,
  colors,
  isDark,
}: {
  compound: Compound;
  isExpanded: boolean;
  showDetails: boolean;
  alreadyInLibrary: boolean;
  customDose: string;
  onCustomDoseChange: (v: string) => void;
  onToggle: () => void;
  onToggleDetails: () => void;
  onAdd: (dose: number) => void;
  colors: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors'];
  isDark: boolean;
}) {
  const badge = statusBadgeProps(compound.status, isDark);
  const hasAliases = compound.aliases && !compound.aliases.startsWith('N/A');
  const showWarning = hasSafetyWarning(compound);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isExpanded ? Colors.peptide : colors.border,
        },
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: Colors.peptide }]} />
      <View style={styles.cardContent}>
        {/* Collapsed header — always tappable */}
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameLine}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]}>{compound.name}</Text>
              {showWarning && (
                <Ionicons name="warning" size={15} color={Colors.warning} style={{ marginLeft: 2, marginTop: 1 }} />
              )}
              {alreadyInLibrary && (
                <Text style={[styles.alreadyLabel, { color: colors.textSecondary }]}>In library</Text>
              )}
            </View>
            {!!hasAliases && (
              <Text style={[styles.cardAliases, { color: colors.textSecondary }]} numberOfLines={1}>
                {compound.aliases}
              </Text>
            )}
            <View style={styles.headerMeta}>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              <Text style={[styles.freqText, { color: colors.textSecondary }]}>
                {compound.dosingFrequency}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
            style={{ marginLeft: 8, marginTop: 2 }}
          />
        </TouchableOpacity>

        {/* Expanded content */}
        {isExpanded && (
          <View>
            {/* Dose chips */}
            <Text style={[styles.doseLabel, { color: colors.textSecondary }]}>Select dose to add:</Text>
            <View style={styles.doseRow}>
              {compound.commonDoses.map((dose) => (
                <TouchableOpacity
                  key={dose}
                  style={[styles.doseChip, { borderColor: Colors.peptide }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAdd(dose);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.doseChipText, { color: Colors.peptide }]}>
                    {dose} {compound.unit}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Custom dose chip */}
              <View style={[styles.customDoseWrap, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.customDoseInput, { color: colors.textPrimary }]}
                  value={customDose}
                  onChangeText={onCustomDoseChange}
                  placeholder="Custom"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
                {!!customDose && (
                  <TouchableOpacity
                    onPress={() => {
                      const val = parseFloat(customDose);
                      if (!isNaN(val) && val > 0 && val <= 10000) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onAdd(val);
                      }
                    }}
                    style={[styles.customAddBtn, { backgroundColor: Colors.peptide }]}
                  >
                    <Text style={styles.customAddBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* View Details toggle */}
            <TouchableOpacity onPress={onToggleDetails} style={styles.detailsToggle} activeOpacity={0.7}>
              <Text style={[styles.detailsToggleText, { color: Colors.peptide }]}>
                {showDetails ? 'Hide Details' : 'View Details'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.peptide}
              />
            </TouchableOpacity>

            {/* Detail section */}
            {showDetails && (
              <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>MECHANISM</Text>
                <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                  {compound.mechanismOfAction}
                </Text>

                {compound.commonSideEffects.length > 0 && (
                  <>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SIDE EFFECTS</Text>
                    <View style={styles.pillRow}>
                      {compound.commonSideEffects.map((se) => (
                        <PillTag
                          key={se}
                          label={se}
                          bgColor={colors.border}
                          textColor={colors.textPrimary}
                        />
                      ))}
                    </View>
                  </>
                )}

                {compound.commonStacks.length > 0 && (
                  <>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>COMMON STACKS</Text>
                    <View style={styles.pillRow}>
                      {compound.commonStacks.map((s) => (
                        <PillTag
                          key={s}
                          label={s}
                          bgColor={Colors.peptide + '20'}
                          textColor={Colors.peptide}
                        />
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>HALF-LIFE</Text>
                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                      {compound.halfLifeDisplay}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CYCLE</Text>
                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                      {compound.cycleLength}
                    </Text>
                  </View>
                </View>

                {compound.reconstitutionNeeded && (
                  <>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>RECONSTITUTION</Text>
                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                      Vial: {compound.typicalVialSize}
                    </Text>
                    <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                      {compound.concentrationAfterRecon}
                    </Text>
                  </>
                )}

                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>STORAGE</Text>
                <Text style={[styles.detailText, { color: colors.textPrimary }]}>{compound.storage}</Text>

                {!!compound.notesForUsers && (
                  <View style={[styles.notesBox, { backgroundColor: Colors.peptide + '10' }]}>
                    {compound.notesForUsers.split('⚠️').map((segment, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.notesText,
                          { color: i > 0 ? Colors.warning : colors.textPrimary },
                          i > 0 && { fontWeight: '600' },
                        ]}
                      >
                        {i > 0 ? '⚠️ ' : ''}{segment}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PresetBrowser({ visible, onClose, onAdd, existingPeptideNames }: Props) {
  const { colors, dark: isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeGroup, setActiveGroup] = useState<CompoundCategory | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [customDose, setCustomDose] = useState('');

  const groups = useMemo(() => getCompoundGroups(), []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 500);
  }, []);

  const existingSet = useMemo(
    () => new Set(existingPeptideNames.map((n) => n.toLowerCase())),
    [existingPeptideNames],
  );

  const sections = useMemo(() => {
    let compounds = searchCompounds(debouncedQuery);
    if (activeGroup !== 'All') {
      compounds = compounds.filter((c) => c.group === activeGroup);
    }
    const grouped = new Map<CompoundCategory, Compound[]>();
    for (const c of compounds) {
      if (!grouped.has(c.group)) grouped.set(c.group, []);
      grouped.get(c.group)!.push(c);
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [debouncedQuery, activeGroup]);

  const handleToggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setShowDetails(false);
      setCustomDose('');
    }
  };

  const handleToggleDetails = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((prev) => !prev);
  };

  const handleAdd = (compound: Compound, dose: number) => {
    if (existingSet.has(compound.name.toLowerCase())) {
      Alert.alert(
        'Already in library',
        `You already have ${compound.name}. Add another entry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add', onPress: () => onAdd(compound, dose) },
        ],
      );
    } else {
      onAdd(compound, dose);
    }
  };

  const handleClose = () => {
    setQuery('');
    setDebouncedQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setActiveGroup('All');
    setExpandedId(null);
    setShowDetails(false);
    setCustomDose('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Browse Compounds</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={query}
              onChangeText={handleSearch}
              placeholder="Search compounds, goals..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Group filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {(['All', ...groups] as const).map((g) => {
              const active = activeGroup === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? Colors.peptide : colors.surface,
                      borderColor: active ? Colors.peptide : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setActiveGroup(active ? 'All' : (g as CompoundCategory | 'All'));
                    setExpandedId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Compound list */}
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No compounds match your search.
              </Text>
            }
            renderSectionHeader={({ section: { title } }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  { color: colors.textSecondary, backgroundColor: colors.background },
                ]}
              >
                {title}
              </Text>
            )}
            renderItem={({ item }) => (
              <CompoundCard
                compound={item}
                isExpanded={expandedId === item.id}
                showDetails={expandedId === item.id && showDetails}
                alreadyInLibrary={existingSet.has(item.name.toLowerCase())}
                customDose={expandedId === item.id ? customDose : ''}
                onCustomDoseChange={setCustomDose}
                onToggle={() => handleToggle(item.id)}
                onToggleDetails={handleToggleDetails}
                onAdd={(dose) => handleAdd(item, dose)}
                colors={colors}
                isDark={isDark}
              />
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 0,
    paddingTop: 4,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingTop: 14,
    paddingBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 24,
  },

  // Card
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  alreadyLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  cardAliases: {
    fontSize: 12,
    marginTop: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  freqText: {
    fontSize: 12,
  },

  // Dose chips
  doseLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  doseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doseChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  customDoseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  customDoseInput: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 72,
  },
  customAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Details toggle
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingVertical: 4,
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Detail section
  detailSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 19,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pillTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  metaItem: {
    flex: 1,
  },
  notesBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
