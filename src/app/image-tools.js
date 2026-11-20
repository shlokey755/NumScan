import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { convertImage, pickImages } from '../lib/media';
import { saveToPhotos, shareFile } from '../lib/files';

const ZOOMS = [
  { value: 1, label: 'Fit' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];

const FORMATS = [
  { value: 'JPEG', label: 'JPEG' },
  { value: 'PNG', label: 'PNG' },
  { value: 'WEBP', label: 'WEBP' },
];

const MIME = { JPEG: 'image/jpeg', PNG: 'image/png', WEBP: 'image/webp' };
const UTI = { JPEG: 'public.jpeg', PNG: 'public.png', WEBP: 'org.webmproject.webp' };

// Views any photo in the library, zoomed in or out, and converts it to another format.
export default function ImageToolsScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [image, setImage] = useState(null); // { uri, width, height }
  const [zoom, setZoom] = useState(1);
  const [format, setFormat] = useState('JPEG');
  const [busy, setBusy] = useState(null); // 'pick' | 'save' | 'share' | null
  const [note, setNote] = useState(null);

  const run = async (name, task) => {
    setBusy(name);
    setNote(null);
    try {
      await task();
    } catch (error) {
      console.error('Image Error:', error);
      setNote(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const choose = () =>
    run('pick', async () => {
      const [asset] = await pickImages();
      if (asset) {
        setImage({ uri: asset.uri, width: asset.width, height: asset.height });
        setZoom(1);
      }
    });

  const saveCopy = () =>
    run('save', async () => {
      const out = await convertImage(image.uri, format);
      await saveToPhotos(out.uri);
      setNote(`Saved as ${format} to your photos.`);
    });

  const shareCopy = () =>
    run('share', async () => {
      const out = await convertImage(image.uri, format);
      await shareFile(out.uri, {
        mimeType: MIME[format],
        UTI: UTI[format],
        dialogTitle: 'Share image',
      });
    });

  // Fit fills the width of the screen. The zoom levels make the image wider than it.
  const viewWidth = screenWidth - 40;
  const shownWidth = viewWidth * zoom;
  const aspect = image && image.width > 0 ? image.height / image.width : 1;
  const shownHeight = shownWidth * aspect;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Image tools" />

      <View style={styles.body}>
        {image ? (
          <View style={styles.viewer}>
            <ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: shownWidth, height: shownHeight }}
                  resizeMode="contain"
                />
              </ScrollView>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.hint}>Choose any photo to view it, then convert or save it.</Text>
          </View>
        )}

        <ScrollView
          style={styles.controls}
          contentContainerStyle={[styles.controlsContent, { paddingBottom: insets.bottom + 24 }]}
        >
          <Button
            label={image ? 'Choose another image' : 'Choose an image'}
            icon="images-outline"
            variant={image ? undefined : 'solid'}
            onPress={choose}
            loading={busy === 'pick'}
            disabled={busy !== null}
          />

          {image ? (
            <>
              <Text style={styles.label}>Zoom</Text>
              <Segmented options={ZOOMS} value={zoom} onChange={setZoom} />

              <Text style={styles.label}>Convert to</Text>
              <Segmented options={FORMATS} value={format} onChange={setFormat} />

              <View style={styles.row}>
                <Button
                  label="Save to photos"
                  icon="download-outline"
                  variant="solid"
                  onPress={saveCopy}
                  loading={busy === 'save'}
                  disabled={busy !== null}
                  style={styles.flex}
                />
                <Button
                  label="Share"
                  icon="share-outline"
                  onPress={shareCopy}
                  loading={busy === 'share'}
                  disabled={busy !== null}
                  style={styles.flex}
                />
              </View>
            </>
          ) : null}

          {note ? <Text style={styles.note}>{note}</Text> : null}
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
  viewer: {
    flex: 1,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  controls: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  controlsContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  note: {
    color: colors.muted,
    fontSize: 14,
  },
});
