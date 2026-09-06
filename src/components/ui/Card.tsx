import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';

import { getTheme } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

// A themed surface container — the app's standard card. Renders as a Pressable
// when `onPress` is given, otherwise a plain View. Reads the theme itself so
// callers don't have to thread tokens through for consistent card styling.
export function Card({ children, onPress, style, testID, accessibilityLabel, disabled }: CardProps) {
  const theme = getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: theme.spacing(4),
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={[base, style]}>
      {children}
    </View>
  );
}
