import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickImages, prepareForReading, toJpeg } from '../lib/media';
import { readFileBytes, saveToPhotos, shareFile, writeCacheFile } from '../lib/files';
import { cleanJpegToPng } from '../lib/scanClean';

const PNG_SHARE = { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share cleaned scan' };

// Turns one photo of a page into black ink on white paper. Runs entirely on the phone.
export default function CleanScanScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [file, setFile] = useState(null); // the cleaned PNG, in the cache folder

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('Scan Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const pickAndClean = () =>
    run('pick', async () => {
      const [photo] = await pickImages();
      if (!photo) return;

      setFile(null);
      setBusy('clean');
      // Let the busy message appear before the slow pixel work starts.
      await new Promise((resolve) => setTimeout(resolve, 0));

      const sized = await prepareForReading(photo.uri, photo.width);
      const jpeg = await toJpeg(sized.uri);
      const bytes = await readFileBytes(jpeg.uri);
      setFile(writeCacheFile('NumScan-clean.png', cleanJpegToPng(bytes)));
    });

  const saveToLibrary = () =>
    run('save', async () => {
      await saveToPhotos(file.uri);
      setMessage('Saved to photos.');
    });

  const share = () => run('share', () => shareFile(file.uri, PNG_SHARE));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Clean a scan" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>Makes black ink on white paper and evens out shadows.</Text>

        <Button
          label={file ? 'Pick another photo' : 'Pick a photo'}
          icon="image-outline"
          variant={file ? 'outline' : 'solid'}
          onPress={pickAndClean}
          loading={busy === 'pick'}
          disabled={busy !== null}
        />

        {busy === 'clean' ? <Text style={styles.hint}>Cleaning the scan. This takes a moment.</Text> : null}

        {file ? (
          <>
            <View style={styles.frame}>
              <Image source={{ uri: file.uri }} resizeMode="contain" style={styles.image} />
            </View>
            <Button
              label="Save to photos"
              icon="save-outline"
              onPress={saveToLibrary}
              loading={busy === 'save'}
              disabled={busy !== null}
            />
            <Button
              label="Share"
              icon="share-outline"
              variant="solid"
              onPress={share}
              loading={busy === 'share'}
              disabled={busy !== null}
            />
          </>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  frame: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.text,
  },
  image: {
    width: '100%',
    height: 420,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
});
