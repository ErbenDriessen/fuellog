import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export interface RingProps {
  size: number; // outer diameter in px
  stroke: number; // ring thickness
  pct: number; // 0..1 (already clamped by computeDayProgress)
  color: string; // progress arc color
  trackColor: string; // background track color
  children?: React.ReactNode; // centered content
  testID?: string;
}

// Reusable circular progress ring: a background track plus a colored arc
// filling `pct` of the circle, starting at 12 o'clock. `children` are
// centered absolutely over the SVG (e.g. numeric labels).
export function Ring({ size, stroke, pct, color, trackColor, children, testID }: RingProps): React.JSX.Element {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            fill="none"
          />
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
