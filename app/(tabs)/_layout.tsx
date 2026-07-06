import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { getTheme } from '../../src/theme/tokens';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.text3,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Food',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gym"
        options={{
          title: 'Gym',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
