import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import { getPeptides } from '../../services/peptideService';
import { addInventoryItem, updateInventoryItem } from '../../services/inventoryService';
import {
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABELS,
} from '../../types/inventory';
import type { InventoryItem, CompoundSubType, SupplyCategory } from '../../types/inventory';
import type { Peptide } from '../../types/peptide';

type Props = {
  visible: boolean;
  mode: 'compound' | 'supply';
  editItem?: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddInventoryItemModal({
  visible,
  mode,
  editItem,
  onClose,
  onSaved,
}: Props) {
  const { colors } = useTheme();

  const [peptides, setPeptides] = useState<Peptide[]>([]);
  const [selectedPeptide, setSelectedPeptide] = useState<Peptide | null>(null);
  const [showPeptidePicker, setShowPeptidePicker] = useState(false);
  const [subType, setSubType] = useState<CompoundSubType>('vial');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lotNumber, setLotNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('7');

  // Supply fields
  const [supplyCategory, setSupplyCategory] = useState<SupplyCategory>('insulinSyringes');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [customName, setCustomName] = useState('');
  const [supplyQuantity, setSupplyQuantity] = useState('100');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (mode === 'compound') {
      getPeptides().then((r) => {
        if (r.data) setPeptides(r.data);
      });
    }

    if (editItem) {
      if (editItem.type === 'compound') {
        setSubType((editItem.subType as CompoundSubType) ?? 'vial');
        setTotalAmount(String(editItem.totalAmount));
        setRemainingAmount(String(editItem.remainingAmount));
        setQuantity(String(editItem.quantity));
        setLotNumber(editItem.lotNumber ?? '');
        setExpirationDate(editItem.expirationDate ?? '');
        setLowStockThreshold(String(editItem.lowStockThresholdDays));
      } else {
        setSupplyCategory((editItem.subType as SupplyCategory) ?? 'insulinSyringes');
        setCustomName(editItem.subType === 'other' ? editItem.name : '');
        setSupplyQuantity(String(editItem.totalAmount));
        setLowStockThreshold(String(editItem.lowStockThresholdDays));
      }
    } else {
      // Reset for new item
      setSelectedPeptide(null);
      setShowPeptidePicker(false);
      setSubType('vial');
      setTotalAmount('');
      setRemainingAmount('');
      setQuantity('1');
      setLotNumber('');
      setExpirationDate('');
      setLowStockThreshold('7');
      setSupplyCategory('insulinSyringes');
      setShowCategoryPicker(false);
      setCustomName('');
      setSupplyQuantity('100');
    }
  }, [visible, editItem, mode]);

  // Auto-fill remaining when total changes (only for new items)
  useEffect(() => {
    if (!editItem && totalAmount) {
      setRemainingAmount(totalAmount);
    }
  }, [totalAmount, editItem]);

  const handleSave = async () => {
    setSaving(true);

    try {
      if (mode === 'compound') {
        if (!selectedPeptide && !editItem) {
          Alert.alert('Select compound', 'Please select a peptide/compound.');
          setSaving(false);
          return;
        }
        const total = parseFloat(totalAmount);
        const remaining = parseFloat(remainingAmount || totalAmount);
        const qty = parseInt(quantity || '0', 10);
        const threshold = parseInt(lowStockThreshold || '7', 10);

        if (isNaN(total) || total <= 0) {
          Alert.alert('Invalid amount', 'Please enter a valid total amount.');
          setSaving(false);
          return;
        }

        if (!isNaN(remaining) && remaining > total) {
          Alert.alert('Invalid amount', 'Remaining cannot exceed total amount.');
          setSaving(false);
          return;
        }

        const unitLabel = subType === 'pen' ? 'clicks' : 'mg';
        const itemName = editItem?.name ?? `${selectedPeptide!.name} ${subType === 'pen' ? 'Pen' : 'Vial'}`;

        const data = {
          type: 'compound' as const,
          subType,
          name: itemName,
          linkedCompoundId: editItem?.linkedCompoundId ?? selectedPeptide!.id,
          linkedCompoundName: editItem?.linkedCompoundName ?? selectedPeptide!.name,
          totalAmount: total,
          remainingAmount: isNaN(remaining) ? total : remaining,
          unit: unitLabel,
          quantity: isNaN(qty) ? 0 : qty,
          lotNumber: lotNumber.trim() || undefined,
          expirationDate: expirationDate.trim() || null,
          lowStockThresholdDays: isNaN(threshold) ? 7 : threshold,
        };

        if (editItem) {
          await updateInventoryItem(editItem.id, data);
        } else {
          await addInventoryItem(data);
        }
      } else {
        // Supply mode
        const qty = parseInt(supplyQuantity || '0', 10);
        const threshold = parseInt(lowStockThreshold || '7', 10);

        if (isNaN(qty) || qty <= 0) {
          Alert.alert('Invalid quantity', 'Please enter a valid quantity.');
          setSaving(false);
          return;
        }

        const name =
          supplyCategory === 'other'
            ? customName.trim() || 'Other Supply'
            : SUPPLY_CATEGORY_LABELS[supplyCategory];

        const data = {
          type: 'supply' as const,
          subType: supplyCategory,
          name,
          totalAmount: qty,
          remainingAmount: editItem ? editItem.remainingAmount : qty,
          unit: 'count',
          quantity: 0, // supplies use single pool (remainingAmount = total count)
          lowStockThresholdDays: isNaN(threshold) ? 7 : threshold,
        };

        if (editItem) {
          await updateInventoryItem(editItem.id, data);
        } else {
          await addInventoryItem(data);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {editItem ? 'Edit Inventory Item' : mode === 'compound' ? 'Add Compound' : 'Add Supply'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {mode === 'compound' ? (
              <>
                {/* Peptide selector */}
                {!editItem && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>COMPOUND</Text>
                    <TouchableOpacity
                      style={[styles.selectorBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setShowPeptidePicker((v) => !v)}
                    >
                      <Text style={[styles.selectorBtnText, { color: selectedPeptide ? colors.textPrimary : colors.textSecondary }]}>
                        {selectedPeptide?.name ?? 'Select compound…'}
                      </Text>
                      <Ionicons name={showPeptidePicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {showPeptidePicker && (
                      <View style={[styles.pickerDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        {peptides.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            style={[styles.pickerItem, { borderBottomColor: colors.border }, selectedPeptide?.id === p.id && { backgroundColor: Colors.peptide + '1A' }]}
                            onPress={() => { setSelectedPeptide(p); setShowPeptidePicker(false); }}
                          >
                            <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{p.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* Type toggle: Vial / Pen */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>TYPE</Text>
                <View style={styles.toggleRow}>
                  {(['vial', 'pen'] as CompoundSubType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: subType === t ? Colors.peptide : colors.background,
                          borderColor: subType === t ? Colors.peptide : colors.border,
                        },
                      ]}
                      onPress={() => setSubType(t)}
                    >
                      <Text style={[styles.toggleBtnText, { color: subType === t ? '#fff' : colors.textSecondary }]}>
                        {t === 'vial' ? 'Vial' : 'Pen'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Total amount */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  TOTAL AMOUNT ({subType === 'pen' ? 'clicks' : 'mg'})
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder={subType === 'pen' ? 'e.g. 300' : 'e.g. 5'}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />

                {/* Remaining amount */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  REMAINING ({subType === 'pen' ? 'clicks' : 'mg'})
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={remainingAmount}
                  onChangeText={setRemainingAmount}
                  placeholder="Defaults to total"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />

                {/* Quantity on hand */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>QUANTITY ON HAND (full units)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />

                {/* Lot number */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>LOT NUMBER (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={lotNumber}
                  onChangeText={setLotNumber}
                  placeholder="e.g. AB12345"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />

                {/* Expiration date */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>EXPIRATION DATE (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={expirationDate}
                  onChangeText={setExpirationDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />

                {/* Low stock threshold */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>LOW STOCK ALERT (days)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={lowStockThreshold}
                  onChangeText={setLowStockThreshold}
                  placeholder="7"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                {/* Supply category */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
                <TouchableOpacity
                  style={[styles.selectorBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setShowCategoryPicker((v) => !v)}
                >
                  <Text style={[styles.selectorBtnText, { color: colors.textPrimary }]}>
                    {SUPPLY_CATEGORY_LABELS[supplyCategory]}
                  </Text>
                  <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={[styles.pickerDropdown, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {SUPPLY_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.pickerItem, { borderBottomColor: colors.border }, supplyCategory === cat && { backgroundColor: Colors.peptide + '1A' }]}
                        onPress={() => { setSupplyCategory(cat); setShowCategoryPicker(false); }}
                      >
                        <Text style={[styles.pickerItemText, { color: colors.textPrimary }]}>{SUPPLY_CATEGORY_LABELS[cat]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Custom name for "other" */}
                {supplyCategory === 'other' && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CUSTOM NAME</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      value={customName}
                      onChangeText={setCustomName}
                      placeholder="e.g. Gauze pads"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </>
                )}

                {/* Quantity */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>QUANTITY (individual items)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={supplyQuantity}
                  onChangeText={setSupplyQuantity}
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />

                {/* Low stock threshold */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>LOW STOCK ALERT (days)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={lowStockThreshold}
                  onChangeText={setLowStockThreshold}
                  placeholder="7"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.peptide }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>{editItem ? 'Save Changes' : 'Add Item'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtnText: { fontSize: 15 },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { fontSize: 15 },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
