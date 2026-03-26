/**
 * StarRating — display or interactive star rating (1–5).
 *
 * Display mode: renders filled/half/outline stars from rating value.
 * Interactive mode: tappable — calls onRatingChange when a star is tapped.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  rating: number;
  size?: number;
  color?: string;
  interactive?: boolean;
  onRatingChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
};

function starIconName(position: number, rating: number): 'star' | 'star-half' | 'star-outline' {
  if (rating >= position) return 'star';
  if (rating >= position - 0.5) return 'star-half';
  return 'star-outline';
}

export default function StarRating({
  rating,
  size = 16,
  color = '#F39C12',
  interactive = false,
  onRatingChange,
}: Props) {
  return (
    <View style={styles.row}>
      {([1, 2, 3, 4, 5] as const).map((pos) => {
        const iconName = starIconName(pos, rating);
        if (interactive) {
          return (
            <TouchableOpacity
              key={pos}
              onPress={() => onRatingChange?.(pos)}
              hitSlop={6}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={size} color={iconName === 'star-outline' ? '#ccc' : color} />
            </TouchableOpacity>
          );
        }
        return (
          <Ionicons
            key={pos}
            name={iconName}
            size={size}
            color={iconName === 'star-outline' ? '#ccc' : color}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
