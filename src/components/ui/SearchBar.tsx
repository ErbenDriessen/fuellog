import { StyleProp, StyleSheet, TextInput, useColorScheme, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getTheme } from '../../theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
}

// A themed search input row (icon + field) used across list screens.
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  testID,
  style,
  autoFocus,
}: SearchBarProps) {
  const theme = getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface2, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(3) },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.text3} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text3}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={[styles.input, { color: theme.colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
});
