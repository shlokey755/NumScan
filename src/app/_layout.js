import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'NumScan' }} />
        <Stack.Screen name="scan-qr" options={{ title: 'QR Code' }} />
        <Stack.Screen name="scan-barcode" options={{ title: 'Barcode' }} />
        <Stack.Screen name="scan-text" options={{ title: 'Text to Clipboard' }} />
        <Stack.Screen name="scan-number" options={{ title: 'Number to Clipboard' }} />
      </Stack>
    </>
  );
}
