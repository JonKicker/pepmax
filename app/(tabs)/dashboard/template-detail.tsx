/**
 * Template Detail — full view of a community template.
 * Shows protocol data, aggregate stats, reviews, import button, and report option.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import {
  getTemplateById,
  getReviews,
  hasUserReviewed,
} from '../../../src/services/communityTemplateService';
import StarRating from '../../../src/components/community/StarRating';
import ProtocolView from '../../../src/components/community/ProtocolView';
import ReviewCard from '../../../src/components/community/ReviewCard';
import ReviewModal from '../../../src/components/community/ReviewModal';
import ReportModal from '../../../src/components/community/ReportModal';
import ImportConfirmModal from '../../../src/components/community/ImportConfirmModal';
import type { CommunityTemplate, TemplateReview } from '../../../src/types/communityTemplate';
import type { DocumentSnapshot } from 'firebase/firestore';

function categoryColor(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return Colors.peptide;
    case 'workout': return Colors.gym;
    case 'nutrition_plan': return Colors.nutrition;
  }
}

function categoryLabel(cat: CommunityTemplate['category']): string {
  switch (cat) {
    case 'peptide_cycle': return 'Peptide Cycle';
    case 'workout': return 'Workout';
    case 'nutrition_plan': return 'Nutrition Plan';
  }
}

export default function TemplateDetailScreen() {
  const { colors } = useTheme();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<CommunityTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCursor, setReviewsCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    const [templateResult, reviewsResult, reviewedResult] = await Promise.all([
      getTemplateById(templateId),
      getReviews(templateId),
      hasUserReviewed(templateId),
    ]);
    setLoading(false);

    if (templateResult.data) setTemplate(templateResult.data);
    if (reviewsResult.data) {
      setReviews(reviewsResult.data.reviews);
      setReviewsCursor(reviewsResult.data.lastDoc);
      setHasMoreReviews(reviewsResult.data.reviews.length === 20);
    }
    if (!reviewedResult.error) setUserHasReviewed(reviewedResult.data ?? false);
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMoreReviews = async () => {
    if (!templateId || !hasMoreReviews || reviewsLoading) return;
    setReviewsLoading(true);
    const result = await getReviews(templateId, reviewsCursor);
    setReviewsLoading(false);
    if (result.data) {
      setReviews((prev) => [...prev, ...result.data!.reviews]);
      setReviewsCursor(result.data.lastDoc);
      setHasMoreReviews(result.data.reviews.length === 20);
    }
  };

  const handleImported = (localCopyRef: string) => {
    setShowImport(false);
    setTemplate((prev) => prev ? { ...prev, importCount: prev.importCount + 1 } : prev);
    Alert.alert(
      'Imported!',
      `The template has been added to your personal ${template?.category === 'peptide_cycle' ? 'cycles' : template?.category === 'workout' ? 'workout templates' : 'recipes'}.`
    );
  };

  const handleReviewed = () => {
    setUserHasReviewed(true);
    // Reload to pick up updated averageRating/reviewCount
    load();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!template) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Template not found.</Text>
      </View>
    );
  }

  const catColor = categoryColor(template.category);
  const catLabel = categoryLabel(template.category);
  const anon = template.anonymousAuthorId.slice(0, 8);

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { borderColor: colors.border }]}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>{catLabel}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{template.title}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>by anon_{anon}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{template.description}</Text>

          {/* Tags */}
          {template.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {template.tags.map((tag) => (
                <View key={tag} style={[styles.tagPill, { backgroundColor: catColor + '12' }]}>
                  <Text style={[styles.tagText, { color: catColor }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StarRating rating={template.averageRating} size={16} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {template.averageRating > 0
                ? `${template.averageRating.toFixed(1)} (${template.reviewCount} review${template.reviewCount !== 1 ? 's' : ''})`
                : 'No reviews yet'}
            </Text>
            <View style={styles.statSpacer} />
            <Ionicons name="download-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {template.importCount} imported
            </Text>
          </View>
        </View>

        {/* Protocol */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROTOCOL</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ProtocolView protocolData={template.protocolData} colors={colors} />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: Colors.warning + '12', borderColor: Colors.warning + '30' }]}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={[styles.disclaimerText, { color: Colors.warning }]}>
            Community protocols are not medical advice. Always consult a healthcare provider before starting any protocol.
          </Text>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              REVIEWS ({template.reviewCount})
            </Text>
            {!userHasReviewed && (
              <TouchableOpacity onPress={() => setShowReview(true)}>
                <Text style={[styles.writeReview, { color: Colors.accent }]}>Write a Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {reviews.length === 0 ? (
            <Text style={[styles.noReviews, { color: colors.textSecondary }]}>
              Be the first to review this template.
            </Text>
          ) : (
            reviews.map((r) => (
              <ReviewCard key={r.id} review={r} colors={colors} />
            ))
          )}

          {hasMoreReviews && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreReviews}>
              {reviewsLoading ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={[styles.loadMoreText, { color: Colors.accent }]}>Load more reviews</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Report button */}
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowReport(true);
          }}
        >
          <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.reportText, { color: colors.textSecondary }]}>Report this template</Text>
        </TouchableOpacity>

        {/* Bottom padding for sticky button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky import button */}
      <View style={[styles.importBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: catColor }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowImport(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="download-outline" size={18} color="white" />
          <Text style={styles.importBtnText}>Import to My Library</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {showImport && (
        <ImportConfirmModal
          visible={showImport}
          template={template}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      <ReviewModal
        visible={showReview}
        templateId={template.id}
        onClose={() => setShowReview(false)}
        onReviewed={handleReviewed}
      />

      <ReportModal
        visible={showReport}
        templateId={template.id}
        onClose={() => setShowReport(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, marginTop: 12 },
  scroll: { paddingBottom: 24 },

  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  catBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  author: { fontSize: 13, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13 },
  statSpacer: { flex: 1 },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },

  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  writeReview: { fontSize: 13, fontWeight: '600' },
  noReviews: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  reportText: { fontSize: 13 },

  importBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  importBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
