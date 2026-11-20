// Picking, reading and converting photos, PDFs and videos. Each native module is
// required inside its own function, so it is loaded only when that feature runs.
import { missingBuild } from './nativeError';

function imagePicker() {
  try {
    return require('expo-image-picker');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function documentPicker() {
  try {
    return require('expo-document-picker');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function imageManipulator() {
  try {
    return require('expo-image-manipulator');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function barcodeScanner() {
  try {
    const mod = require('@react-native-ml-kit/barcode-scanning');
    return mod.default ?? mod;
  } catch (cause) {
    throw missingBuild(cause);
  }
}

function videoCompressor() {
  try {
    return require('react-native-compressor');
  } catch (cause) {
    throw missingBuild(cause);
  }
}

// Returns the picked photos, or [] if the user cancelled.
export async function pickImages({ multiple = false } = {}) {
  const ImagePicker = imagePicker();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 1,
  });
  return result.canceled ? [] : result.assets;
}

export async function pickVideo() {
  const ImagePicker = imagePicker();
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
  return result.canceled ? null : result.assets[0];
}

// Returns the picked PDFs, or [] if the user cancelled.
export async function pickPdfs({ multiple = false } = {}) {
  const DocumentPicker = documentPicker();
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple,
    copyToCacheDirectory: true,
  });
  return result.canceled ? [] : result.assets;
}

// Returns the picked files of any type, or [] if the user cancelled.
export async function pickAnyFiles({ multiple = false } = {}) {
  const DocumentPicker = documentPicker();
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple,
    copyToCacheDirectory: true,
  });
  return result.canceled ? [] : result.assets;
}

// Re-encodes an image through the image manipulator. Returns { uri, width, height }.
async function manipulate(uri, actions, format = 'JPEG') {
  const Manipulator = imageManipulator();
  return Manipulator.manipulateAsync(uri, actions, {
    format: Manipulator.SaveFormat[format],
    compress: 0.92,
  });
}

export function rotateImage(uri, degrees) {
  return manipulate(uri, [{ rotate: degrees }]);
}

export function toJpeg(uri) {
  return manipulate(uri, []);
}

// Converts an image to 'JPEG', 'PNG' or 'WEBP'.
export function convertImage(uri, format) {
  return manipulate(uri, [], format);
}

// Sizes a photo for text and code reading. Large photos are shrunk to 2000 px wide.
// Small ones are enlarged to 1000 px, because the reader works better with bigger text.
export function prepareForReading(uri, width) {
  const target = width > 2000 ? 2000 : width > 0 && width < 1000 ? 1000 : null;
  return manipulate(uri, target ? [{ resize: { width: target } }] : []);
}

// Reads every barcode and QR code in a photo. Returns the unique values.
export async function readCodes(uri) {
  const scanner = barcodeScanner();
  const barcodes = await scanner.scan(uri);
  return [...new Set(barcodes.map((barcode) => barcode.value).filter(Boolean))];
}

// Re-encodes a video as a smaller MP4. `onProgress` gets a number from 0 to 1.
export async function compressVideo(uri, onProgress) {
  const { Video } = videoCompressor();
  const output = await Video.compress(uri, {}, onProgress);
  return output.startsWith('file://') ? output : `file://${output}`;
}
