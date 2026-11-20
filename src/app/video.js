import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { compressVideo, pickVideo } from '../lib/media';
import { fileSize, saveToPhotos, shareFile } from '../lib/files';

const VIDEO_SHARE = { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: 'Share video' };

function formatSize(bytes) {
  if (bytes == null) return 'size unknown';
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

// Shows the chosen video with the phone's own controls.
function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

// Play a video, or make a smaller MP4 copy. Compression runs on the phone.
// GIF conversion is not included: it needs a video library that is still maintained.
export default function VideoScreen() {
  const insets = useSafeAreaInsets();
  const [video, setVideo] = useState(null); // { uri, size }
  const [smaller, setSmaller] = useState(null); // { uri, size }
  const [progress, setProgress] = useState(null); // 0-100 while compressing
  const [busy, setBusy] = useState(null); // 'pick' | 'compress' | 'save' | 'share' | null
  const [note, setNote] = useState(null);

  const run = async (name, task) => {
    setBusy(name);
    setNote(null);
    try {
      await task();
    } catch (error) {
      console.error('Video Error:', error);
      setNote(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const choose = () =>
    run('pick', async () => {
      const asset = await pickVideo();
      if (asset) {
        setVideo({ uri: asset.uri, size: fileSize(asset.uri) });
        setSmaller(null);
      }
    });

  const compress = () =>
    run('compress', async () => {
      const out = await compressVideo(video.uri, (value) => setProgress(Math.round(value * 100)));
      setSmaller({ uri: out, size: fileSize(out) });
    });

  const saveSmaller = () =>
    run('save', async () => {
      await saveToPhotos(smaller.uri);
      setNote('Saved the smaller video to your photos.');
    });

  const shareSmaller = () => run('share', () => shareFile(smaller.uri, VIDEO_SHARE));

  const percentSaved =
    video?.size && smaller?.size ? Math.round((1 - smaller.size / video.size) * 100) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Video" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {video ? (
          <View style={styles.frame}>
            <VideoPreview uri={video.uri} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.hint}>Choose a video to play it, or make a smaller copy.</Text>
          </View>
        )}

        {video ? <Text style={styles.meta}>Original · {formatSize(video.size)}</Text> : null}

        <Button
          label={video ? 'Choose another video' : 'Choose a video'}
          icon="videocam-outline"
          variant={video ? undefined : 'solid'}
          onPress={choose}
          loading={busy === 'pick'}
          disabled={busy !== null}
        />

        {video ? (
          <>
            <Button
              label={busy === 'compress' && progress != null ? `Compressing… ${progress}%` : 'Make smaller copy'}
              icon="contract-outline"
              variant="solid"
              onPress={compress}
              loading={busy === 'compress'}
              disabled={busy !== null}
            />

            {smaller ? (
              <>
                <Text style={styles.meta}>
                  Smaller copy · {formatSize(smaller.size)}
                  {percentSaved != null && percentSaved > 0 ? ` · ${percentSaved}% smaller` : ''}
                </Text>
                <View style={styles.row}>
                  <Button
                    label="Save to photos"
                    icon="download-outline"
                    onPress={saveSmaller}
                    loading={busy === 'save'}
                    disabled={busy !== null}
                    style={styles.flex}
                  />
                  <Button
                    label="Share"
                    icon="share-outline"
                    onPress={shareSmaller}
                    loading={busy === 'share'}
                    disabled={busy !== null}
                    style={styles.flex}
                  />
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {note ? <Text style={styles.note}>{note}</Text> : null}
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
  frame: {
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  empty: {
    height: 200,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 24,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
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
