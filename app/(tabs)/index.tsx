import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { getTheme } from '../../src/theme/tokens';

export default function FoodScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');

  return (
    <View
      testID="screen-food"
      style={[
        styles.root,
        { backgroundColor: theme.colors.bg, paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5) },
      ]}
    >
      <Text style={[styles.heading, { color: theme.colors.text }]}>Food</Text>
      <Text style={[styles.subtitle, { color: theme.colors.text2, marginTop: theme.spacing(1) }]}>
        Log meals and track macros
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
});
