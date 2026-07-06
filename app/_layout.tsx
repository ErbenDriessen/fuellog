import { Stack } from 'expo-router';
import { DatabaseProvider } from '../src/db/DatabaseProvider';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="build-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-targets" options={{ presentation: 'modal' }} />
      </Stack>
    </DatabaseProvider>
  );
}
