/**
 * Export My Data screen.
 *
 * Lets users export all their health data as JSON or a CSV zip.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/hooks/useTheme';
import { Colors } from '../../../src/constants/theme';
import { exportUserDataAsJSON, exportUserDataAsCSV } from '../../../src/services/dataExportService';

export default function ExportDataScreen() {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<'json' | 'csv' | null>(null);

  async function handleExport(format: 'json' | 'csv') {
    setLoading(true);
    setLoadingFormat(format);

    const result = format === 'json'
      ? await exportUserDataAsJSON()
      : await exportUserDataAsCSV();

    setLoading(false);
    setLoadingFormat(null);

    if (result.error) {
      Alert.alert('Export Failed', result.error.message ?? 'Could not export your data. Please try again.');
    }
    // On success: OS share sheet has already been shown by the service
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Download a copy of all your PepMax data. Choose your preferred format.
      </Text>

      {/* Format buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.formatBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleExport('json')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="code-slash-outline" size={28} color={Colors.accent} />
          <Text style={[styles.formatLabel, { color: colors.textPrimary }]}>Export as JSON</Text>
          <Text style={[styles.formatSub, { color: colors.textSecondary }]}>
            Single file with all collections
          </Text>
          {loadingFormat === 'json' && (
            <ActivityIndicator style={styles.spinner} color={Colors.accent} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.formatBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleExport('csv')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={28} color={Colors.accent} />
          <Text style={[styles.formatLabel, { color: colors.textPrimary }]}>Export as CSV</Text>
          <Text style={[styles.formatSub, { color: colors.textSecondary }]}>
            ZIP file with one CSV per collection
          </Text>
          {loadingFormat === 'csv' && (
            <ActivityIndicator style={styles.spinner} color={Colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      {/* Loading overlay message */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Gathering your data…
          </Text>
        </View>
      )}

      <Text style={[styles.note, { color: colors.textSecondary }]}>
        Your export will be shared via your device's share sheet. Data includes all logged health records.
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 20 },

  description: { fontSize: 14, lineHeight: 20 },

  buttons: { gap: 14 },

  formatBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  formatLabel: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  formatSub: { fontSize: 13, textAlign: 'center' },
  spinner: { marginTop: 4 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  loadingText: { fontSize: 14 },

  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
