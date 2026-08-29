/**
 * AnimatedPressable — spring-scale pressable using Animated.View + Pressable.
 *
 * Children are rendered directly inside the Animated.View so they inherit its
 * flexDirection / alignItems / gap / padding. An absolutely-positioned Pressable
 * overlays everything for touch handling.
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type AnimatedPressableProps = PressableProps & {
  /** Fire haptic feedback on press. Default: false */
  haptic?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  /** Scale factor when pressed. Default: 0.96 */
  scaleValue?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function AnimatedPressable({
  haptic = false,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  scaleValue = 0.96,
  style,
  children,
  onPress,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleValue, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (haptic) {
      Haptics.impactAsync(hapticStyle);
    }
    onPress?.(event);
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </Animated.View>
  );
}
