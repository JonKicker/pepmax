/**
 * StaggeredList — animates children in with a stagger offset.
 *
 * FIX 2: Each child is wrapped in a separate StaggeredItem component that owns
 * its own useSharedValue hooks. This avoids Rules of Hooks violations that occur
 * when hooks are called inside loops or map callbacks.
 *
 * FIX 5: Animation runs on mount only (empty deps array in useEffect).
 * Re-renders of children do NOT re-trigger the entry animation.
 */
import React, { useEffect, Children } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

// ─── StaggeredItem ─────────────────────────────────────────────────────────────

type StaggeredItemProps = {
  delay: number;
  children: React.ReactNode;
};

/**
 * StaggeredItem — owns the shared values for a single staggered child.
 *
 * Animation fires once on mount only. Subsequent re-renders of the parent
 * (e.g. data loading) do NOT replay the entrance animation.
 */
function StaggeredItem({ delay, children }: StaggeredItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Mount-only animation: opacity fades in, translateY springs to 0.
    // Empty deps array is intentional — this must only run once on mount.
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []); // intentional: animate on mount only

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

// ─── StaggeredList ─────────────────────────────────────────────────────────────

type StaggeredListProps = {
  /** Delay between each child's animation start, in ms. Default: 80 */
  staggerDelay?: number;
  /** Delay before the first child starts animating, in ms. Default: 0 */
  initialDelay?: number;
  style?: ViewStyle;
  children: React.ReactNode;
};

/**
 * StaggeredList — wraps each child in a StaggeredItem with a computed delay.
 *
 * Note: Animation is mount-only. Children that are added after the initial
 * mount will not animate in — use a key change to force remount if needed.
 */
export function StaggeredList({
  staggerDelay = 80,
  initialDelay = 0,
  style,
  children,
}: StaggeredListProps) {
  const items = Children.toArray(children);

  return (
    <Animated.View style={style}>
      {items.map((child, i) => (
        <StaggeredItem
          key={(child as React.ReactElement).key ?? `stagger-${i}`}
          delay={initialDelay + i * staggerDelay}
        >
          {child}
        </StaggeredItem>
      ))}
    </Animated.View>
  );
}
