/**
 * PhotoGrid — 3-column grid of progress photo thumbnails.
 *
 * Each cell shows date, front thumbnail, and weight. Long-press to delete.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../constants/theme';
import type { ProgressPhotoEntry } from '../../types/bodyTracking';
import type { Units } from '../../types/profile';
import { kgToLbs } from '../../utils/tdee';

type Props = {
  entries: ProgressPhotoEntry[];
  units: Units;
  loading: boolean;
  onEntryPress: (date: string) => void;
  onDelete: (date: string) => void;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;
const GRID_PADDING = 16;
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function PhotoCell({
  entry,
  units,
  onPress,
  onDelete,
}: {
  entry: ProgressPhotoEntry;
  units: Units;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();

  // Pick the first available thumbnail
  const thumbUrl = entry.poses.front?.thumbUrl
    ?? entry.poses.side?.thumbUrl
    ?? entry.poses.back?.thumbUrl;

  const weightDisplay = entry.weight != null
    ? (units === 'imperial' ? `${(Math.round(kgToLbs(entry.weight) * 10) / 10)}` : `${(Math.round(entry.weight * 10) / 10)}`)
    : null;

  const handleLongPress = () => {
    Alert.alert(
      'Delete Photos',
      `Delete photos from ${entry.date}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.cell, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: colors.border }]} />
      )}
      <View style={styles.cellInfo}>
        <Text style={[styles.cellDate, { color: colors.textPrimary }]} numberOfLines={1}>
          {formatDate(entry.date)}
        </Text>
        {weightDisplay && (
          <Text style={[styles.cellWeight, { color: colors.textSecondary }]} numberOfLines={1}>
            {weightDisplay} {units === 'imperial' ? 'lbs' : 'kg'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function PhotoGrid({ entries, units, loading, onEntryPress, onDelete }: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.body} />
      </View>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.date}
      numColumns={COLUMN_COUNT}
      scrollEnabled={false}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <PhotoCell
          entry={item}
          units={units}
          onPress={() => onEntryPress(item.date)}
          onDelete={() => onDelete(item.date)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  cell: {
    width: ITEM_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cellInfo: {
    padding: 6,
  },
  cellDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  cellWeight: {
    fontSize: 10,
    marginTop: 1,
  },
});
