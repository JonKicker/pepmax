/**
 * My Templates — shows templates the user has published and imported.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { getUserPublishedTemplates } from '../../../src/services/communityTemplateService';
import TemplateCard from '../../../src/components/community/TemplateCard';
import EmptyState from '../../../src/components/community/EmptyState';
import type { CommunityTemplate } from '../../../src/types/communityTemplate';

export default function MyTemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [published, setPublished] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await getUserPublishedTemplates();
    if (!result.error) setPublished(result.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleTemplatePress = (template: CommunityTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/dashboard/template-detail',
      params: { templateId: template.id },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={published}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, published.length === 0 && styles.listEmpty]}
        renderItem={({ item }) => (
          <TemplateCard template={item} onPress={handleTemplatePress} colors={colors} />
        )}
        ListHeaderComponent={
          published.length > 0 ? (
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              PUBLISHED BY YOU ({published.length})
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            iconName="share-social-outline"
            title="No Published Templates"
            subtitle="Share a peptide cycle, workout program, or nutrition plan with the community from within the respective module."
            iconColor={Colors.accent}
            colors={colors}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Browse community button */}
      <TouchableOpacity
        style={[styles.browseBanner, { backgroundColor: Colors.accent + '12', borderColor: Colors.accent + '30' }]}
        onPress={() => router.push('/(tabs)/dashboard/community')}
        activeOpacity={0.7}
      >
        <Ionicons name="people-outline" size={18} color={Colors.accent} />
        <Text style={[styles.browseBannerText, { color: Colors.accent }]}>
          Browse Community Library
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  listEmpty: { flexGrow: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  browseBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  browseBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
