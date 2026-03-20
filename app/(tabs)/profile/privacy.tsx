/**
 * Privacy & Data screen.
 *
 * Four collapsible accordion cards explaining what PepMax stores and doesn't do,
 * plus a "Delete My Account" section with inline "type DELETE" confirmation
 * (cross-platform — no Alert.prompt, which is iOS-only).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { deleteAccount } from '../../../src/services/accountService';

// ─── Accordion card data ───────────────────────────────────────────────────────

const CARDS = [
  {
    id: 'what-we-store',
    title: 'What we store',
    icon: 'server-outline' as const,
    body: [
      'Your health logs: peptide doses, workouts, meals, cardio sessions, body measurements, and check-ins.',
      'Your profile: name, email, body stats, and goals — used to calculate your nutrition targets.',
      'App preferences: units, theme, and notification settings.',
      'All data is stored in your private Firebase account. No one else can see it.',
    ],
  },
  {
    id: 'what-we-dont',
    title: "What we DON'T do",
    icon: 'shield-outline' as const,
    body: [
      'We do not sell your data to anyone.',
      'We do not share your health data with advertisers.',
      'We do not use your data to train AI models.',
      'We do not have access to your data for customer support unless you explicitly send it to us.',
    ],
  },
  {
    id: 'who-can-see',
    title: 'Who can see your data',
    icon: 'eye-outline' as const,
    body: [
      'Only you. Your data is scoped to your Firebase UID — no other user can access it.',
      'Firebase (Google) stores the data on our behalf and is subject to their privacy policy.',
      'RevenueCat processes subscription info but does not receive your health data.',
    ],
  },
  {
    id: 'how-to-delete',
    title: 'How to delete everything',
    icon: 'trash-outline' as const,
    body: [
      '"Delete All Data" in Settings removes all health logs, preferences, and profile data from our servers immediately.',
      '"Delete My Account" (below) does the same AND permanently deletes your login — you cannot undo this.',
      'After deletion, your data is gone from our systems. Firebase may retain backups for a short period per their policies.',
    ],
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PrivacyScreen() {
  const { colors } = useTheme();

  // Accordion — only one section open at a time
  const [openCard, setOpenCard] = useState<string | null>(null);

  // Delete account inline confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  function toggleCard(id: string) {
    setOpenCard((prev) => (prev === id ? null : id));
  }

  async function handleDeleteAccount() {
    if (deleteText !== 'DELETE') return;
    setDeletingAccount(true);
    const result = await deleteAccount();
    setDeletingAccount(false);

    if (result.error) {
      Alert.alert('Error', result.error.message ?? 'Could not delete your account. Please try again.');
    }
    // On success: onAuthStateChanged fires null → AuthGuard redirects automatically.
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Plain-English answers to common privacy questions about PepMax.
      </Text>

      {/* ── Accordion cards ─────────────────────────────────────────────── */}
      {CARDS.map((card) => {
        const isOpen = openCard === card.id;
        return (
          <View
            key={card.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleCard(card.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderLeft}>
                <Ionicons name={card.icon} size={18} color={Colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{card.title}</Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.cardBody}>
                {card.body.map((line, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: Colors.accent }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* ── Delete Account section ──────────────────────────────────────── */}
      <View style={[styles.deleteSection, { borderColor: colors.border }]}>
        <Text style={[styles.deleteSectionTitle, { color: colors.textPrimary }]}>Delete Account</Text>
        <Text style={[styles.deleteSectionBody, { color: colors.textSecondary }]}>
          Permanently deletes your account and all data. This cannot be undone.
        </Text>

        {!showDeleteConfirm ? (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: Colors.error }]}
            onPress={() => setShowDeleteConfirm(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-remove-outline" size={16} color={Colors.error} />
            <Text style={[styles.deleteBtnText, { color: Colors.error }]}>Delete My Account</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: Colors.error + '55' }]}>
            <View style={styles.confirmWarningRow}>
              <Ionicons name="warning-outline" size={16} color={Colors.error} />
              <Text style={[styles.confirmWarning, { color: Colors.error }]}>
                This is permanent and cannot be undone.
              </Text>
            </View>
            <Text style={[styles.confirmPrompt, { color: colors.textSecondary }]}>
              Type DELETE to confirm:
            </Text>
            <TextInput
              style={[
                styles.confirmInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="DELETE"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                }}
              >
                <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  {
                    backgroundColor: deleteText === 'DELETE' ? Colors.error : colors.border,
                  },
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deletingAccount}
                activeOpacity={0.8}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48, gap: 12 },

  intro: { fontSize: 14, lineHeight: 20, marginBottom: 4 },

  // Accordion card
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Delete section
  deleteSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  deleteSectionTitle: { fontSize: 16, fontWeight: '700' },
  deleteSectionBody: { fontSize: 14, lineHeight: 20 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },

  // Inline confirmation card
  confirmCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  confirmWarningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmWarning: { fontSize: 14, fontWeight: '600' },
  confirmPrompt: { fontSize: 14 },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: { fontSize: 14 },
  confirmDeleteBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
