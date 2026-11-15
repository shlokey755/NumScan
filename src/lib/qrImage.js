// expo-file-system, expo-media-library and expo-sharing are native modules. A development
// build made before they were added doesn't contain them. Importing one at the top of
// this file would crash every screen that loads it, so each one is loaded only when the
// user taps Save or Share. If the build doesn't have it, the user gets a clear message.

const FILE_NAME = 'numscan-qr.png';

const REBUILD_MESSAGE =
  'This build of NumScan does not include saving and sharing yet. Build a new development build to turn them on.';

function missingNativeModule(cause) {
  const error = new Error(REBUILD_MESSAGE);
  error.cause = cause;
  return error;
}

// Writes the base64 PNG into the app's cache folder and returns the file.
// The cache is cleared by the system when space runs low, so old copies don't build up.
function writeQrPng(base64) {
  let FileSystem;
  try {
    FileSystem = require('expo-file-system');
  } catch (e) {
    throw missingNativeModule(e);
  }
  if (!FileSystem?.File || !FileSystem?.Paths) {
    throw missingNativeModule(null);
  }
  const file = new FileSystem.File(FileSystem.Paths.cache, FILE_NAME);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file;
}

// Saves the QR code to the phone's photos. Android puts it in Pictures.
// Asks for add-only access, so NumScan never reads the user's existing photos.
export async function saveQrToPhotos(base64) {
  let MediaLibrary;
  try {
    MediaLibrary = require('expo-media-library');
  } catch (e) {
    throw missingNativeModule(e);
  }
  if (typeof MediaLibrary?.requestPermissionsAsync !== 'function') {
    throw missingNativeModule(null);
  }

  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status !== 'granted') {
    throw new Error('Photo access is off. Allow it in your phone settings to save QR codes.');
  }
  const file = writeQrPng(base64);
  await MediaLibrary.Asset.create(file.uri);
}

// Opens the system share sheet with the QR code as a PNG image.
export async function shareQrImage(base64) {
  const file = writeQrPng(base64);

  let Sharing;
  try {
    Sharing = require('expo-sharing');
  } catch (e) {
    throw missingNativeModule(e);
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share QR code',
  });
}
