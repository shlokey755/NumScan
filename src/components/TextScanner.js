import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as Clipboard from 'expo-clipboard';
import { useIsFocused } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionButton from './ActionButton';
import ResultCard from './ResultCard';
import ScanCamera from './ScanCamera';
import { extractDigitGroups, getTextInsideBox } from '../lib/text';

// The scan box. Only text whose centre is inside it is read.
const FRAME_WIDTH = 260;
const FRAME_HEIGHT = 120;

// Shared by the text and number screens. Nothing is read until "Capture" is tapped.
export default function TextScanner({ mode }) {
  const isNumber = mode === 'number';
  const isFocused = useIsFocused();
  const cameraRef = useRef(null);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { id, text } or { id, groups }
  const [message, setMessage] = useState(null);

  const hint = isNumber
    ? 'Line up the number inside the box, then tap Capture.'
    : 'Line up the text inside the box, then tap Capture.';

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
        setResult(null);
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
          setResult(null);
          setMessage('No numbers found inside the box.');
          return;
        }
        setResult({ id: Date.now(), groups });
      } else {
        setResult({ id: Date.now(), text: inside });
      }
    } catch (error) {
      console.error('Scanning Error:', error);
      setResult(null);
      setMessage('Something went wrong while scanning. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const clearResult = () => setResult(null);

  return (
    <View style={styles.screen}>
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

      <View style={styles.panel}>
        {result && !isNumber ? (
          <ResultCard
            key={result.id}
            title="Text"
            text={result.text}
            copyLabel="Copy text"
            dismissLabel="Clear"
            onDismiss={clearResult}
          />
        ) : null}

        {result && isNumber ? (
          <ResultCard
            key={result.id}
            title="Numbers"
            text={result.groups.join('')}
            copyLabel="Copy all"
            dismissLabel="Clear"
            onDismiss={clearResult}
          >
            <Text style={styles.subtle}>Tap a number to copy only that one.</Text>
            <View style={styles.chips}>
              {result.groups.map((group, index) => (
                <NumberChip key={`${result.id}-${index}`} value={group} />
              ))}
            </View>
          </ResultCard>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.row}>
          <ActionButton
            label={torch ? 'Torch off' : 'Torch on'}
            onPress={() => setTorch((on) => !on)}
          />
          <ActionButton
            label="Capture"
            primary
            loading={busy}
            disabled={!isFocused}
            onPress={capture}
          />
        </View>
      </View>
    </View>
  );
}

function NumberChip({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
  };

  return (
    <TouchableOpacity
      onPress={copy}
      activeOpacity={0.8}
      style={[styles.chip, copied && styles.chipCopied]}
    >
      <Text style={[styles.chipText, copied && styles.chipTextCopied]}>
        {copied ? `${value} copied` : value}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hint: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 18,
  },
  panel: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  message: {
    color: '#ffb347',
    fontSize: 14,
    textAlign: 'center',
  },
  subtle: {
    color: '#888',
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#00FF66',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipCopied: {
    backgroundColor: '#00FF66',
  },
  chipText: {
    color: '#00FF66',
    fontSize: 16,
    fontWeight: '600',
  },
  chipTextCopied: {
    color: '#000',
  },
});
