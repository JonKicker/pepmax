# Screen Templates

Complete structural templates for common PepMax screen types. Copy and adapt — don't use verbatim.

## Table of Contents
1. [Dashboard Card](#dashboard-card)
2. [List Screen](#list-screen)
3. [Detail Screen](#detail-screen)
4. [Form Screen](#form-screen)
5. [Settings Screen](#settings-screen)
6. [Bottom Sheet Modal](#bottom-sheet-modal)

---

## Dashboard Card

A module summary card for the main dashboard. Shows the single most important metric with minimal supporting context.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DashboardCard } from './DashboardCard';
import { Colors } from '../../constants/theme';
import type { Theme } from '../../constants/theme';

type Props = {
  data: SomeData | null;
  colors: Theme['colors'];
  onPress: () => void;
};

export function ModuleCard({ data, colors, onPress }: Props) {
  // No data — show CTA
  if (!data) {
    return (
      <DashboardCard
        title="Module Name"
        icon="icon-outline"
        iconColor={Colors.moduleAccent}
        colors={colors}
      >
        <View style={styles.cta}>
          <Text style={[styles.ctaText, { color: colors.textSecondary }]}>
            Encouraging prompt to get started
          </Text>
        </View>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Module Name"
      icon="icon-outline"
      iconColor={Colors.moduleAccent}
      colors={colors}
      onPress={onPress}
    >
      {/* Hero metric — largest element */}
      <Text style={[styles.heroNumber, { color: Colors.moduleAccent }]}>
        {data.primaryMetric}
      </Text>
      {/* Supporting context */}
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        {data.secondaryInfo}
      </Text>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  heroNumber: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  caption: {
    fontSize: 13,
  },
  cta: {
    paddingVertical: 8,
  },
  ctaText: {
    fontSize: 14,
  },
});
```

---

## List Screen

Searchable, filterable list with FAB for adding items. Used for exercises, food search, protocol browser.

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassBackground } from '../../components/GlassBackground';
import { GlassCard } from '../../components/GlassCard';
import { SkeletonLoader, SkeletonCard } from '../../components/SkeletonLoader';
import { useTheme } from '../../hooks/useTheme';

export default function ListScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Filter logic
  const filtered = useMemo(() => {
    // ... filter items by search
  }, [search, items]);

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigateToDetail(item.id);
      }}
    >
      <GlassCard intensity="subtle" style={styles.itemCard}>
        <View style={styles.itemRow}>
          {/* Left: thumbnail or icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="icon" size={20} color={colors.accent} />
          </View>
          {/* Center: title + subtitle */}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
          {/* Right: chevron */}
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  ), [colors]);

  return (
    <GlassBackground>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No results
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Try a different search term
              </Text>
            </View>
          }
        />
      )}
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 20, paddingBottom: 100 },
  itemCard: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSubtitle: { fontSize: 13 },
  skeletons: { padding: 20 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: { fontSize: 14 },
});
```

---

## Detail Screen

Single-item deep dive with hero section, charts, and data sections.

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { GlassBackground } from '../../components/GlassBackground';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';

export default function DetailScreen() {
  const { colors } = useTheme();

  return (
    <GlassBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero section — the big number */}
        <View style={styles.hero}>
          <Text style={[styles.heroNumber, { color: colors.accent }]}>
            {primaryMetric}
          </Text>
          <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
            Metric label
          </Text>
        </View>

        {/* Chart section */}
        <GlassCard intensity="heavy" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Trend
          </Text>
          {/* Victory chart here */}
        </GlassCard>

        {/* Data rows */}
        <GlassCard intensity="heavy" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Details
          </Text>
          {dataRows.map(row => (
            <View key={row.label} style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                {row.label}
              </Text>
              <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroNumber: { fontSize: 48, fontWeight: '800' },
  heroLabel: { fontSize: 14, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataLabel: { fontSize: 14 },
  dataValue: { fontSize: 14, fontWeight: '600' },
});
```

---

## Form Screen

Data entry screen for logging (doses, meals, check-ins, sets).

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassBackground } from '../../components/GlassBackground';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';

export default function FormScreen() {
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      // save logic
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Input group */}
        <GlassCard intensity="heavy" style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Field Label
          </Text>
          <TextInput
            style={[styles.input, {
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            placeholder="Enter value"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
          />
        </GlassCard>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

---

## Settings Screen

Grouped setting rows with navigation, toggles, and descriptions.

```tsx
import React from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '../../components/GlassBackground';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';

function SettingRow({ label, icon, onPress, trailing, colors }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      {trailing ?? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <GlassBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Section */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          PREFERENCES
        </Text>
        <GlassCard intensity="heavy" padding={0}>
          <SettingRow
            label="Notifications"
            icon="notifications-outline"
            onPress={() => {}}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            label="Dark Mode"
            icon="moon-outline"
            colors={colors}
            trailing={<Switch value={true} onValueChange={() => {}} />}
          />
        </GlassCard>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    marginBottom: 8, marginTop: 24, marginLeft: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 44,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
});
```

---

## Bottom Sheet Modal

Quick-action modal that slides up from the bottom.

```tsx
import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />
      {/* Sheet */}
      <View style={styles.sheetContainer}>
        <GlassCard intensity="heavy" style={styles.sheet} padding={0}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[styles.close, { color: colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: SCREEN_H * 0.85,
  },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  handleRow: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title: { fontSize: 17, fontWeight: '700' },
  close: { fontSize: 15, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
});
```
