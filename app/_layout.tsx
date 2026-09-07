import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import {
  NunitoSans_400Regular,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';

import { DatabaseProvider } from '../src/db/DatabaseProvider';
import { SettingsProvider } from '../src/settings/SettingsProvider';

// Hold the native splash until the app's fonts have loaded so the first paint
// already uses Newsreader / Nunito Sans rather than flashing the system font.
// Guarded so a dev client built before expo-splash-screen was added still runs.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    NunitoSans_400Regular,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    // Reveal the app once fonts are ready — or if they failed, so a font CDN
    // problem can never leave the user stuck on the splash forever.
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <DatabaseProvider>
      <SettingsProvider>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="gym-day" />
        <Stack.Screen name="build-meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-targets" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipes" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scan-label" options={{ presentation: 'modal' }} />
        </Stack>
      </SettingsProvider>
    </DatabaseProvider>
  );
}
