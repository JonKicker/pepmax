/**
 * SegmentCreator — modal/bottom sheet for creating a segment from a session.
 *
 * Props:
 *   session   — the completed CardioSession to base the segment on
 *   onCreated — called with the new RouteSegment on success
 *   onCancel  — dismiss the modal
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/theme';
import { createSegment } from '../../services/segmentService';
import type { CardioSession } from '../../types/cardio';
import type { RouteSegment, SegmentActivityType } from '../../types/segments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

const SUPPORTED_TYPES = new Set<string>(['run', 'cycle', 'walk']);

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  session: CardioSession;
  onCreated: (segment: RouteSegment) => void;
  onCancel: () => void;
};

export default function SegmentCreator({ session, onCreated, onCancel }: Props) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState('');

  const polylineCoords = session.route.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const region = useMemo(() => {
    if (session.route.length === 0) return undefined;
    const lats = session.route.map((p) => p.latitude);
    const lngs = session.route.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latDelta = Math.max(maxLat - minLat, 0.002) * 1.4;
    const lngDelta = Math.max(maxLng - minLng, 0.002) * 1.4;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [session.route]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter a segment name.');
      return;
    }
    if (trimmed.length > 60) {
      setNameError('Name must be 60 characters or less.');
      return;
    }
    if (!currentUser?.uid) return;

    const activityType = session.activityType;
    if (!SUPPORTED_TYPES.has(activityType)) {
      Alert.alert('Unsupported Activity', 'Segments can only be created for runs, cycles, and walks.');
      return;
    }

    setNameError('');
    setCreating(true);

    const segmentPoints = session.route.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    const result = await createSegment({
      name: trimmed,
      creatorUid: currentUser.uid,
      creatorUsername: currentUser.displayName ?? currentUser.uid,
      activityType: activityType as SegmentActivityType,
      route: segmentPoints,
      distanceMeters: session.distance,
      visibility,
    });

    setCreating(false);

    if (result.error || !result.data) {
      Alert.alert('Error', 'Could not create segment. Please try again.');
      return;
    }

    onCreated(result.data);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Save as Segment</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Route preview map */}
          {region && (
            <MapView
              style={styles.map}
              region={region}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
            >
              <Polyline
                coordinates={polylineCoords}
                strokeColor={Colors.cardio}
                strokeWidth={4}
              />
            </MapView>
          )}

          {/* Distance info */}
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Distance: {formatDistance(session.distance)}
            </Text>
          </View>

          {/* Name input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Segment Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  borderColor: nameError ? Colors.error : colors.border,
                },
              ]}
              value={name}
              onChangeText={(t) => { setName(t); setNameError(''); }}
              placeholder="e.g. Riverside Sprint"
              placeholderTextColor={colors.textSecondary}
              maxLength={60}
              returnKeyType="done"
            />
            {nameError ? (
              <Text style={[styles.errorText, { color: Colors.error }]}>{nameError}</Text>
            ) : null}
          </View>

          {/* Visibility toggle */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Visibility</Text>
            <View style={styles.visibilityRow}>
              {(['public', 'private'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.visBtn,
                    {
                      backgroundColor: visibility === v ? Colors.cardio : colors.surface,
                      borderColor: visibility === v ? Colors.cardio : colors.border,
                    },
                  ]}
                  onPress={() => setVisibility(v)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={v === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                    size={15}
                    color={visibility === v ? 'white' : colors.textPrimary}
                  />
                  <Text style={[styles.visBtnText, { color: visibility === v ? 'white' : colors.textPrimary }]}>
                    {v === 'public' ? 'Public' : 'Private'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.visHint, { color: colors.textSecondary }]}>
              {visibility === 'public'
                ? 'Friends and crew members can see and compete on this segment.'
                : 'Only you can see and run this segment.'}
            </Text>
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: Colors.cardio, opacity: creating ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.7}
          >
            {creating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="flag" size={16} color="white" />
                <Text style={styles.createBtnText}>Create Segment</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  map: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { fontSize: 14 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: { fontSize: 12, marginTop: 2 },
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  visBtnText: { fontSize: 14, fontWeight: '600' },
  visHint: { fontSize: 12, lineHeight: 16 },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
