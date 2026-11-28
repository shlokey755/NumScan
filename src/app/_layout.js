import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors } from '../theme';
import { checkOnLaunch } from '../lib/appUpdate';

// No native navigation bar. Each screen draws its own minimal header.
export default function RootLayout() {
  // Looks for a newer JavaScript bundle once, when the app opens. Nothing waits for it.
  useEffect(() => {
    checkOnLaunch();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}
