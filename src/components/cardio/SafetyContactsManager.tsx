/**
 * SafetyContactsManager — add / remove up to 3 emergency contacts.
 * Used in Cardio Settings screen under the "SAFETY BEACON" section.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';
import { useSafetyContacts } from '../../hooks/useSafetyContacts';

type Props = {
  colors: any;
};

export default function SafetyContactsManager({ colors }: Props) {
  const { contacts, loading, addContact, removeContact, canAddMore } = useSafetyContacts();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleAdd = async () => {
    setSaving(true);
    setFormError('');
    const err = await addContact(name, phone);
    setSaving(false);
    if (err) {
      setFormError(err);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName('');
      setPhone('');
      setShowForm(false);
    }
  };

  const handleRemove = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await removeContact(id);
  };

  // Mask middle digits: +15551234567 → +1•••••4567
  const maskPhone = (p: string) => {
    if (p.length <= 5) return p;
    return p.slice(0, 2) + '•'.repeat(p.length - 5) + p.slice(-4);
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ActivityIndicator style={{ margin: 16 }} color={Colors.cardio} />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {contacts.length === 0 && !showForm && (
        <View style={styles.emptyRow}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No contacts added yet.
          </Text>
        </View>
      )}

      {contacts.map((c, idx) => (
        <View
          key={c.id}
          style={[
            styles.contactRow,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: idx < contacts.length - 1 || showForm ? StyleSheet.hairlineWidth : 0,
            },
          ]}
        >
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: colors.textPrimary }]}>{c.name}</Text>
            <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>
              {maskPhone(c.phone)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(c.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ))}

      {showForm && (
        <View style={[styles.formSection, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={(t) => { setName(t); setFormError(''); }}
            maxLength={40}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            placeholder="+15551234567"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={(t) => { setPhone(t); setFormError(''); }}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={16}
          />
          {formError !== '' && (
            <Text style={styles.formError}>{formError}</Text>
          )}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formBtn, styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { setShowForm(false); setName(''); setPhone(''); setFormError(''); }}
            >
              <Text style={[styles.formBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, styles.saveBtn, { backgroundColor: Colors.cardio }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.formBtnText, { color: 'white' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {canAddMore && !showForm && (
        <TouchableOpacity
          style={[styles.addBtn, { borderTopColor: colors.border, borderTopWidth: contacts.length > 0 ? StyleSheet.hairlineWidth : 0 }]}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add-circle-outline" size={16} color={Colors.cardio} />
          <Text style={[styles.addBtnText, { color: Colors.cardio }]}>Add Contact</Text>
        </TouchableOpacity>
      )}

      {!canAddMore && !showForm && (
        <View style={[styles.maxNote, { borderTopColor: colors.border }]}>
          <Text style={[styles.maxNoteText, { color: colors.textSecondary }]}>
            Maximum 3 contacts reached.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  emptyRow: { padding: 16 },
  emptyText: { fontSize: 14 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '600' },
  contactPhone: { fontSize: 12, marginTop: 2 },

  formSection: {
    padding: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  formError: {
    fontSize: 12,
    color: Colors.error,
  },
  formActions: { flexDirection: 'row', gap: 10 },
  formBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: { borderWidth: 1 },
  saveBtn: {},
  formBtnText: { fontWeight: '700', fontSize: 14 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },

  maxNote: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  maxNoteText: { fontSize: 12 },
});
