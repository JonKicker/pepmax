/**
 * onReportCreate — auto-flag templates that receive 3 or more reports.
 *
 * Triggers on: create of /reports/{reportId}
 * Action: if reportCount >= 3, set template status to 'flagged'.
 *
 * This replaces the client-side stopgap in communityTemplateService.ts.
 * Once deployed, remove the manual reportCount check in reportTemplate().
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const AUTO_FLAG_THRESHOLD = 3;

export const onReportCreate = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap) => {
    const report = snap.data() as { templateId: string };
    if (!report.templateId) return;

    // Count all reports for this template.
    const reportsSnap = await db
      .collection('reports')
      .where('templateId', '==', report.templateId)
      .get();

    const count = reportsSnap.size;

    if (count >= AUTO_FLAG_THRESHOLD) {
      await db.collection('templates').doc(report.templateId).update({
        status: 'flagged',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
