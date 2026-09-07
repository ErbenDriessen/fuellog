import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps {
  size: number; // outer diameter in px
  stroke: number; // ring thickness
  pct: number; // 0..1 (already clamped by computeDayProgress)
  color: string; // progress arc color
  trackColor: string; // background track color
  children?: React.ReactNode; // centered content
  testID?: string;
  animate?: boolean; // when true, the arc grows from empty to `pct` on mount / change
  duration?: number; // animation length in ms (default 600)
}

// Reusable circular progress ring: a background track plus a colored arc
// filling `pct` of the circle, starting at 12 o'clock. `children` are
// centered absolutely over the SVG (e.g. numeric labels). With `animate`, the
// arc is driven by an Animated value so it grows smoothly without churning
// React state each frame.
export function Ring({
  size,
  stroke,
  pct,
  color,
  trackColor,
  children,
  testID,
  animate = false,
  duration = 600,
}: RingProps): React.JSX.Element {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;
  const offset = circumference * (1 - pct);

  // Skip the timer-driven animation under Jest — it would schedule Animated
  // updates after a test settles and trip act() warnings without adding value.
  const shouldAnimate = animate && process.env.NODE_ENV !== 'test';

  // Starts empty (full offset) and animates to the target offset. Only used
  // when `shouldAnimate` is set; harmless otherwise.
  const animOffset = useRef(new Animated.Value(circumference)).current;
  useEffect(() => {
    if (!shouldAnimate) return;
    const anim = Animated.timing(animOffset, {
      toValue: offset,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [shouldAnimate, offset, duration, animOffset]);

  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <G rotation={-90} origin={`${center}, ${center}`}>
          {shouldAnimate ? (
            <AnimatedCircle
              testID="ring-progress"
              cx={center}
              cy={center}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animOffset}
              fill="none"
            />
          ) : (
            <Circle
              testID="ring-progress"
              cx={center}
              cy={center}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              fill="none"
            />
          )}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
