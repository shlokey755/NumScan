// Over-the-air updates for JavaScript changes (expo-updates). The app checks the server
// once on each launch and downloads a newer bundle quietly; the update button checks on demand.
// Native changes (new modules, permissions, icons) still need a new APK.
import { missingBuild } from './nativeError';

function updates() {
  try {
    return require('expo-updates');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// True once a newer bundle is downloaded in this session. A restart then uses it.
let readyToRestart = false;

// Looks for a newer JavaScript bundle and downloads it. Resolves to:
// 'current'  the app already has the newest bundle,
// 'ready'    a new bundle is downloaded, and a restart will use it,
// 'disabled' this build cannot take updates (Expo Go or a development build).
// A network failure is thrown, so the caller can show it.
export async function checkForUpdate(Updates = updates()) {
  if (!Updates.isEnabled) return 'disabled';
  if (readyToRestart) return 'ready';
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return 'current';
  const fetched = await Updates.fetchUpdateAsync();
  if (fetched.isNew) readyToRestart = true;
  return readyToRestart ? 'ready' : 'current';
}

// Runs once when the app opens. The download is silent, and the new bundle is used the next
// time the app starts. Errors are ignored, because the app works fine without updates.
export function checkOnLaunch() {
  checkForUpdate().catch(() => {});
}

// Restarts the app so the downloaded bundle is used.
export async function applyUpdate(Updates = updates()) {
  await Updates.reloadAsync();
}
