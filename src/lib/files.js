// Saving and sharing files. Each native module is required inside its own function,
// so it is loaded only when that feature runs.
import { missingBuild } from './nativeError';

function fileSystem() {
  try {
    return require('expo-file-system');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function sharing() {
  try {
    return require('expo-sharing');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function mediaLibrary() {
  try {
    return require('expo-media-library');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// Writes bytes into the app's cache folder. The system clears it when space runs low.
export function writeCacheFile(name, bytes) {
  const FileSystem = fileSystem();
  const file = new FileSystem.File(FileSystem.Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}

export function readFileBytes(uri) {
  const FileSystem = fileSystem();
  return new FileSystem.File(uri).bytes();
}

// Reads a whole file as text. Resolves to a string.
export function readFileText(uri) {
  const FileSystem = fileSystem();
  return new FileSystem.File(uri).text();
}

// Opens the system share sheet for a file.
export async function shareFile(uri, { mimeType, UTI, dialogTitle }) {
  const Sharing = sharing();
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle });
}

// Adds an image or video to the phone's photos. Asks for add-only access.
export async function saveToPhotos(uri) {
  const MediaLibrary = mediaLibrary();
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status !== 'granted') {
    throw new Error('Photo access is off. Allow it in your phone settings to save files.');
  }
  await MediaLibrary.Asset.create(uri);
}

// Size in bytes, or null when it can't be read.
export function fileSize(uri) {
  try {
    const FileSystem = fileSystem();
    return new FileSystem.File(uri).size ?? null;
  } catch (e) {
    return null;
  }
}
