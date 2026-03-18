import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Syringe geometry constants
const SVG_WIDTH = 200;
const SVG_HEIGHT_DEFAULT = 300;

const BARREL_X = 40;
const BARREL_WIDTH = 80;
const BARREL_TOP = 30;
const BARREL_BOTTOM = 240;
const BARREL_HEIGHT = BARREL_BOTTOM - BARREL_TOP;

const NOZZLE_X = BARREL_X + BARREL_WIDTH / 2 - 6;
const NOZZLE_WIDTH = 12;
const NOZZLE_TOP = BARREL_BOTTOM;
const NOZZLE_BOTTOM = 270;

const NEEDLE_X = BARREL_X + BARREL_WIDTH / 2 - 1.5;
const NEEDLE_WIDTH = 3;
const NEEDLE_TOP = NOZZLE_BOTTOM;
const NEEDLE_BOTTOM = 290;

const PLUNGER_HANDLE_Y = 10;
const PLUNGER_HANDLE_HEIGHT = 20;
const PLUNGER_ROD_X = BARREL_X + BARREL_WIDTH / 2 - 3;
const PLUNGER_ROD_WIDTH = 6;

const NUM_TICKS = 10;

type Props = {
  fillPercent: number; // 0..1
  label: string;
  accentColor: string;
  height?: number;
};

export default function SyringeSVG({ fillPercent, label, accentColor, height = SVG_HEIGHT_DEFAULT }: Props) {
  const clampedFill = Math.max(0, Math.min(1, fillPercent));
  const fillShared = useSharedValue(clampedFill);

  useEffect(() => {
    fillShared.value = withSpring(Math.max(0, Math.min(1, fillPercent)), {
      damping: 15,
      stiffness: 120,
    });
  }, [fillPercent]);

  const animatedFillProps = useAnimatedProps(() => {
    const fillHeight = fillShared.value * BARREL_HEIGHT;
    return {
      y: BARREL_BOTTOM - fillHeight,
      height: fillHeight,
    };
  });

  const scale = height / SVG_HEIGHT_DEFAULT;
  const svgWidth = SVG_WIDTH * scale;

  const tickInterval = BARREL_HEIGHT / NUM_TICKS;
  const ticks = Array.from({ length: NUM_TICKS + 1 }, (_, i) => i);

  // Line Y for dashed marker at fill level
  const fillY = BARREL_BOTTOM - clampedFill * BARREL_HEIGHT;

  return (
    <View style={styles.container}>
      <Svg width={svgWidth} height={height} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT_DEFAULT}`}>
        {/* Barrel fill (animated) */}
        <AnimatedRect
          x={BARREL_X + 1}
          width={BARREL_WIDTH - 2}
          fill={accentColor + '50'}
          animatedProps={animatedFillProps}
        />

        {/* Barrel outline */}
        <Rect
          x={BARREL_X}
          y={BARREL_TOP}
          width={BARREL_WIDTH}
          height={BARREL_HEIGHT}
          rx={4}
          ry={4}
          stroke={accentColor}
          strokeWidth={2}
          fill="none"
        />

        {/* Plunger handle */}
        <Rect
          x={BARREL_X - 16}
          y={PLUNGER_HANDLE_Y}
          width={BARREL_WIDTH + 32}
          height={PLUNGER_HANDLE_HEIGHT}
          rx={4}
          ry={4}
          fill={accentColor}
        />

        {/* Plunger rod */}
        <Rect
          x={PLUNGER_ROD_X}
          y={PLUNGER_HANDLE_Y + PLUNGER_HANDLE_HEIGHT}
          width={PLUNGER_ROD_WIDTH}
          height={BARREL_TOP - PLUNGER_HANDLE_Y - PLUNGER_HANDLE_HEIGHT}
          fill={accentColor}
        />

        {/* Nozzle */}
        <Rect
          x={NOZZLE_X}
          y={NOZZLE_TOP}
          width={NOZZLE_WIDTH}
          height={NOZZLE_BOTTOM - NOZZLE_TOP}
          fill={accentColor}
        />

        {/* Needle */}
        <Path
          d={`M ${NEEDLE_X} ${NEEDLE_TOP} L ${NEEDLE_X + NEEDLE_WIDTH} ${NEEDLE_TOP} L ${NEEDLE_X + NEEDLE_WIDTH / 2} ${NEEDLE_BOTTOM} Z`}
          fill={accentColor}
        />

        {/* Graduation ticks */}
        {ticks.map((i) => {
          const tickY = BARREL_BOTTOM - i * tickInterval;
          const isMajor = i % 5 === 0;
          const tickLen = isMajor ? 16 : 8;
          return (
            <Line
              key={i}
              x1={BARREL_X + BARREL_WIDTH}
              y1={tickY}
              x2={BARREL_X + BARREL_WIDTH + tickLen}
              y2={tickY}
              stroke={accentColor}
              strokeWidth={isMajor ? 1.5 : 1}
              opacity={0.6}
            />
          );
        })}

        {/* Dashed fill level indicator */}
        {clampedFill > 0.02 && (
          <Line
            x1={BARREL_X - 10}
            y1={fillY}
            x2={BARREL_X + BARREL_WIDTH + 28}
            y2={fillY}
            stroke={accentColor}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
        )}
      </Svg>

      {/* Label positioned to the right of the tick area */}
      {clampedFill > 0.02 && (
        <View
          style={[
            styles.labelContainer,
            {
              top: PLUNGER_HANDLE_Y + (fillY - PLUNGER_HANDLE_Y) * scale - 10,
              left: svgWidth + 4,
            },
          ]}
        >
          <Text style={[styles.labelText, { color: accentColor }]}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'flex-start',
  },
  labelContainer: {
    position: 'absolute',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
