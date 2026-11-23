import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ResultPanel from '../components/ResultPanel';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import Toast from '../components/Toast';
import useCopyToast from '../components/useCopyToast';
import { colors } from '../theme';
import { successHaptic } from '../lib/feedback';
import { rememberScan } from '../lib/history';
import { pickImages, prepareForReading, readCodes, readText, readTurned, rotateImage } from '../lib/media';
import { extractDigitGroups } from '../lib/text';

const MODES = [
  { value: 'codes', label: 'Codes' },
  { value: 'text', label: 'Text' },
  { value: 'numbers', label: 'Numbers' },
];

const MODE_LABEL = { codes: 'Codes', text: 'Text', numbers: 'Numbers' };

const EMPTY_MESSAGE = {
  codes: 'No codes found in this photo. Try a closer, sharper photo.',
  text: 'No text found in this photo. Try better light or focus.',
  numbers: 'No numbers found in this photo. Try better light or focus.',
};

// Finds codes, text or numbers in one copy of the photo. Returns the found items.
async function readItems(mode, uri) {
  if (mode === 'codes') return readCodes(uri);
  const found = await readText(uri);
  if (!found) return [];
  return mode === 'numbers' ? extractDigitGroups(found) : [found];
}

// Reads codes, text or numbers from a photo in the library. Works offline.
export default function FromPhotoScreen() {
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState(null); // { uri, width, height }
  const [mode, setMode] = useState('codes');
  const [busy, setBusy] = useState(null); // 'pick' | 'rotate' | 'read' | null
  const [result, setResult] = useState(null); // { id, label, text }
  const [message, setMessage] = useState(null);
  const { toast, copy } = useCopyToast();

  const choose = async () => {
    setBusy('pick');
    setMessage(null);
    try {
      const [asset] = await pickImages();
      if (asset) {
        setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
        setResult(null);
      }
    } catch (error) {
      setMessage(error?.message ?? 'The photo could not be opened.');
    } finally {
      setBusy(null);
    }
  };

  const rotate = async () => {
    if (!photo) return;
    setBusy('rotate');
    setMessage(null);
    try {
      const turned = await rotateImage(photo.uri, 90);
      setPhoto({ uri: turned.uri, width: turned.width, height: turned.height });
      setResult(null);
    } catch (error) {
      setMessage(error?.message ?? 'The photo could not be rotated.');
    } finally {
      setBusy(null);
    }
  };

  const read = async () => {
    if (!photo) return;
    setBusy('read');
    setMessage(null);
    setResult(null);
    try {
      // The photo is sized for reading first (large ones shrink, small ones grow). That
      // step also applies the EXIF orientation, so the pixels read below are upright.
      const prepared = await prepareForReading(photo.uri, photo.width);
      // If the photo as picked finds nothing, read turned copies before giving up.
      const { items, turn } = await readTurned(prepared.uri, {
        read: (uri) => readItems(mode, uri),
        turnCopy: async (uri, degrees) => (await rotateImage(uri, degrees)).uri,
      });
      if (items.length === 0) {
        setMessage(EMPTY_MESSAGE[mode]);
        return;
      }
      // Numbers are joined with no separator, as in the live Numbers scanner. Codes and text keep one item per line.
      const text = mode === 'numbers' ? items.join('') : items.join('\n');

      const label = MODE_LABEL[mode];
      setResult({ id: Date.now(), label, text });
      if (turn) setMessage(`Read after turning the photo ${turn}°.`);
      successHaptic();
      copy(text, 'Copied to clipboard');
      rememberScan(`Photo · ${label}`, text);
    } catch (error) {
      console.error('Photo Read Error:', error);
      setMessage(error?.message ?? 'This photo could not be read. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Read a photo" />

      <View style={styles.body}>
        <Toast toast={toast} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {photo ? (
            <View style={styles.previewFrame}>
              <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
            </View>
          ) : (
            <Button
              label="Choose a photo"
              icon="images-outline"
              variant="solid"
              onPress={choose}
              loading={busy === 'pick'}
              disabled={busy !== null}
            />
          )}

          {photo ? (
            <>
              <Segmented options={MODES} value={mode} onChange={setMode} />

              <View style={styles.row}>
                <Button
                  label="Rotate"
                  icon="refresh-outline"
                  onPress={rotate}
                  loading={busy === 'rotate'}
                  disabled={busy !== null}
                  style={styles.flex}
                />
                <Button
                  label="Other photo"
                  icon="images-outline"
                  onPress={choose}
                  disabled={busy !== null}
                  style={styles.flex}
                />
              </View>

              <Button
                label="Read photo"
                icon="scan-outline"
                variant="solid"
                onPress={read}
                loading={busy === 'read'}
                disabled={busy !== null}
              />
            </>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {result ? (
            <ResultPanel
              key={result.id}
              label={result.label}
              text={result.text}
              dismissLabel="Read again"
              onDismiss={() => setResult(null)}
            />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  previewFrame: {
    height: 320,
    borderWidth: 1,
    borderColor: colors.line,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
});
