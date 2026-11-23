// Over-the-air updates for JavaScript changes (expo-updates). The app checks the
// server only when the user taps the update button; it never checks on its own.
// Native changes (new modules, permissions, icons) still need a new APK.
import { missingBuild } from './nativeError';

function updates() {
  try {
    return require('expo-updates');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// Looks for a newer JavaScript bundle and downloads it. Resolves to:
// 'current'  the app already has the newest bundle,
// 'ready'    a new bundle is downloaded, and a restart will use it,
// 'disabled' this build cannot take updates (Expo Go or a development build).
// A network failure is thrown, so the caller can show it.
export async function checkForUpdate() {
  const Updates = updates();
  if (!Updates.isEnabled) return 'disabled';
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'current';
  const fetched = await Updates.fetchUpdateAsync();
  return fetched.isNew ? 'ready' : 'current';
}

// Restarts the app so the downloaded bundle is used.
export async function applyUpdate() {
  await updates().reloadAsync();
}
