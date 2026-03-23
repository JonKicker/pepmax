/**
 * onReviewWrite — recompute template aggregate stats when a review is written.
 *
 * Triggers on: create, update, delete of /templates/{templateId}/reviews/{reviewId}
 * Updates: averageRating, reviewCount on the parent /templates/{templateId} doc.
 *
 * This replaces the client-side stopgap in communityTemplateService.ts.
 * Once deployed, remove the recomputeAverageRating() call in addReview().
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onReviewWrite = functions.firestore
  .document('templates/{templateId}/reviews/{reviewId}')
  .onWrite(async (change, context) => {
    const templateId = context.params.templateId;

    // Fetch all active reviews for this template.
    const reviewsSnap = await db
      .collection('templates')
      .doc(templateId)
      .collection('reviews')
      .where('status', '==', 'active')
      .get();

    const reviews = reviewsSnap.docs.map((d) => d.data() as { rating: unknown });

    if (reviews.length === 0) {
      await db.collection('templates').doc(templateId).update({
        averageRating: 0,
        reviewCount: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Guard against malicious writes with non-numeric rating values.
    // Firestore rules don't validate field types, so a direct API caller could
    // write rating: "string" and cause NaN to propagate to averageRating.
    const sum = reviews.reduce(
      (acc, r) => acc + (typeof r.rating === 'number' && isFinite(r.rating) ? r.rating : 0),
      0
    );
    const avg = Math.round((sum / reviews.length) * 10) / 10;

    await db.collection('templates').doc(templateId).update({
      averageRating: avg,
      reviewCount: reviews.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
