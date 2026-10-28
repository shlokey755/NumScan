import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as Clipboard from 'expo-clipboard';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import ResultPanel from './ResultPanel';
import ScanCamera from './ScanCamera';
import ScreenHeader, { IconButton } from './ScreenHeader';
import { colors } from '../theme';
import { extractDigitGroups, getTextInsideBox } from '../lib/text';

// The scan area. Only text whose centre is inside it is read.
const FRAME_WIDTH = 260;
const FRAME_HEIGHT = 120;

// Shared by the text and number screens. Nothing is read until Capture is tapped.
export default function TextScanner({ title, mode }) {
  const isNumber = mode === 'number';
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { id, text } or { id, groups }
  const [message, setMessage] = useState(null);

  const hint = isNumber
    ? 'Put the number inside the box, then tap Capture.'
    : 'Put the text inside the box, then tap Capture.';

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Camera returned no photo.');

      const ocr = await TextRecognition.recognize(photo.uri);
      const lines = getTextInsideBox(ocr, photo, FRAME_WIDTH, FRAME_HEIGHT);
      const inside = lines.join('\n');

      if (!inside.trim()) {
        setMessage(
          (ocr?.text ?? '').trim()
            ? 'Text found, but not inside the box. Move it into the box.'
            : 'No text detected. Check the lighting and focus.'
        );
        return;
      }

      if (isNumber) {
        const groups = extractDigitGroups(inside);
        if (groups.length === 0) {
          setMessage('No numbers found inside the box.');
          return;
        }
        setResult({ id: Date.now(), groups });
      } else {
        setResult({ id: Date.now(), text: inside });
      }
    } catch (error) {
      console.error('Scanning Error:', error);
      setMessage('Something went wrong while scanning. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setMessage(null);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={title}
        right={
          <IconButton
            name={torch ? 'flash' : 'flash-off-outline'}
            label={torch ? 'Turn torch off' : 'Turn torch on'}
            onPress={() => setTorch((on) => !on)}
          />
        }
      />

      <View style={styles.stage}>
        <ScanCamera
          cameraRef={cameraRef}
          active={isFocused}
          width={FRAME_WIDTH}
          height={FRAME_HEIGHT}
          enableTorch={torch}
        />
        <Text style={styles.hint}>{hint}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        {result && !isNumber ? (
          <ResultPanel
            key={result.id}
            label="Text"
            text={result.text}
            dismissLabel="Capture again"
            onDismiss={clearResult}
          />
        ) : null}

        {result && isNumber ? (
          <ResultPanel
            key={result.id}
            label="Numbers"
            text={result.groups.join('')}
            copyLabel="Copy all"
            dismissLabel="Capture again"
            onDismiss={clearResult}
          >
            <Text style={styles.subtle}>Tap a number to copy only that one.</Text>
            <View style={styles.tiles}>
              {result.groups.map((group, index) => (
                <NumberTile key={`${result.id}-${index}`} value={group} />
              ))}
            </View>
          </ResultPanel>
        ) : null}

        {!result ? (
          <>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Button
              label="Capture"
              icon="camera-outline"
              variant="solid"
              onPress={capture}
              loading={busy}
              disabled={!isFocused}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

function NumberTile({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
    } catch (error) {
      Alert.alert('Copy failed', String(error?.message ?? error));
    }
  };

  return (
    <Pressable
      onPress={copy}
      style={({ pressed }) => [
        styles.tile,
        copied && styles.tileCopied,
        pressed && styles.tilePressed,
      ]}
    >
      <Text style={[styles.tileText, copied && styles.tileTextCopied]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    minHeight: 170,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtle: {
    color: colors.muted,
    fontSize: 13,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileCopied: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  tilePressed: {
    opacity: 0.6,
  },
  tileText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  tileTextCopied: {
    color: colors.inverse,
  },
});
