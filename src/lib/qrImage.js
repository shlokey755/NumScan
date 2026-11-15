import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const FILE_NAME = 'numscan-qr.png';

// Writes the base64 PNG into the app's cache folder and returns the file.
// The cache is cleared by the system when space runs low, so old copies don't build up.
function writeQrPng(base64) {
  const file = new File(Paths.cache, FILE_NAME);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file;
}

// Saves the QR code to the phone's photos. Android puts it in Pictures.
// Asks for add-only access, so NumScan never reads the user's existing photos.
export async function saveQrToPhotos(base64) {
  const { status } = await requestPermissionsAsync(true);
  if (status !== 'granted') {
    throw new Error('Photo access is off. Allow it in your phone settings to save QR codes.');
  }
  const file = writeQrPng(base64);
  await Asset.create(file.uri);
}

// Opens the system share sheet with the QR code as a PNG image.
export async function shareQrImage(base64) {
  const file = writeQrPng(base64);
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
