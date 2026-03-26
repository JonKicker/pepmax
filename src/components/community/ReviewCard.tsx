/**
 * ReviewCard — individual review display for the template detail screen.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StarRating from './StarRating';
import type { TemplateReview } from '../../types/communityTemplate';
import { Timestamp } from 'firebase/firestore';

function formatDate(ts: Timestamp | any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const OUTCOME_LABELS: Record<string, string> = {
  yes: 'It worked ✓',
  partially: 'Partially worked',
  no: 'Did not work',
};

type Props = {
  review: TemplateReview;
  colors: any;
};

export default function ReviewCard({ review, colors }: Props) {
  const anon = review.anonymousReviewerId.slice(0, 8);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <StarRating rating={review.rating} size={14} />
        <Text style={[styles.author, { color: colors.textSecondary }]}>
          anon_{anon}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(review.createdAt)}
        </Text>
      </View>

      {review.text ? (
        <Text style={[styles.text, { color: colors.textPrimary }]}>{review.text}</Text>
      ) : null}

      {review.outcomeNotes ? (
        <View style={[styles.outcomePill, { backgroundColor: colors.background }]}>
          <Text style={[styles.outcomeText, { color: colors.textSecondary }]}>
            {OUTCOME_LABELS[review.outcomeNotes] ?? review.outcomeNotes}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  author: { fontSize: 12, flex: 1 },
  date: { fontSize: 12 },
  text: { fontSize: 14, lineHeight: 19, marginBottom: 6 },
  outcomePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  outcomeText: { fontSize: 12 },
});
