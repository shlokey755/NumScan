import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { pickPdfs } from '../lib/media';
import { readFileBytes, shareFile, writeCacheFile } from '../lib/files';
import { stampPdf } from '../lib/pdf';

const PDF_SHARE = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share stamped PDF' };

const PAGES = [
  { value: 'all', label: 'Every page' },
  { value: 'last', label: 'Last page' },
];

// The signature pad is 300 x 140, narrower on small phones so it fits inside the gutters.
const PAD_HEIGHT = 140;
const PAD_WIDTH = Math.min(300, Dimensions.get('window').width - 42);

// Strokes in pad coordinates -> one SVG path string. A single tap becomes a short dot.
function toPath(strokes) {
  return strokes
    .map((stroke) => {
      const points = stroke.length === 1 ? [stroke[0], stroke[0]] : stroke;
      return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
    })
    .join(' ');
}

// Adds an optional stamp, header and signature to one PDF, then shares it.
// Everything is drawn on the phone. Nothing is uploaded.
export default function PdfStampScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [file, setFile] = useState(null); // { uri, name }
  const [stamp, setStamp] = useState('');
  const [header, setHeader] = useState('');
  const [pages, setPages] = useState('all');
  const [strokes, setStrokes] = useState([]); // [[{ x, y }]] in pad coordinates
  const [drawing, setDrawing] = useState(false);

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('PDF Stamp Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const choosePdf = () =>
    run('pick', async () => {
      const [asset] = await pickPdfs();
      if (asset) setFile({ uri: asset.uri, name: asset.name });
    });

  // Touch handling for the pad. locationX and locationY are relative to the pad itself.
  const startStroke = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setDrawing(true);
    setStrokes((list) => [...list, [{ x: locationX, y: locationY }]]);
  };

  const extendStroke = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setStrokes((list) => {
      if (list.length === 0) return list;
      const last = list[list.length - 1];
      return [...list.slice(0, -1), [...last, { x: locationX, y: locationY }]];
    });
  };

  const endStroke = () => setDrawing(false);

  const hasStamp = stamp.trim().length > 0;
  const hasHeader = header.trim().length > 0;
  const hasSignature = strokes.length > 0;
  const nothingToAdd = !hasStamp && !hasHeader && !hasSignature;

  const saveAndShare = () =>
    run('save', async () => {
      const signature = hasSignature
        ? { path: toPath(strokes), width: PAD_WIDTH, height: PAD_HEIGHT }
        : null;
      const bytes = await readFileBytes(file.uri);
      const stamped = await stampPdf(bytes, {
        stamp: hasStamp ? stamp.trim() : '',
        header: hasHeader ? header.trim() : '',
        signature,
        pages,
      });
      const out = writeCacheFile('NumScan-stamped.pdf', stamped);
      await shareFile(out.uri, PDF_SHARE);
    });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Stamp and sign PDF" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!drawing}
      >
        <Text style={styles.hint}>
          Choose a PDF, then add any of these. Leave a field blank to skip it.
        </Text>

        <Button
          label={file ? 'Choose another PDF' : 'Choose a PDF'}
          icon="document-text-outline"
          variant={file ? 'outline' : 'solid'}
          onPress={choosePdf}
          loading={busy === 'pick'}
          disabled={busy !== null}
        />
        {file ? <Text style={styles.itemText} numberOfLines={1}>{file.name}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Stamp</Text>
          <TextInput
            value={stamp}
            onChangeText={setStamp}
            placeholder="DRAFT"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Header</Text>
          <TextInput
            value={header}
            onChangeText={setHeader}
            placeholder="Name · Roll no · Practical"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Pages</Text>
          <Segmented options={PAGES} value={pages} onChange={setPages} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Signature</Text>
          <View style={styles.frame}>
            <View
              style={styles.pad}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={startStroke}
              onResponderMove={extendStroke}
              onResponderRelease={endStroke}
              onResponderTerminate={endStroke}
            >
              <Svg width={PAD_WIDTH} height={PAD_HEIGHT} style={styles.passThrough}>
                <Path
                  d={toPath(strokes)}
                  stroke={colors.text}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              {hasSignature ? null : (
                <View style={[styles.passThrough, styles.center]}>
                  <Text style={styles.placeholder}>Sign here</Text>
                </View>
              )}
            </View>
          </View>
          <Button
            label="Clear signature"
            icon="trash-outline"
            variant="ghost"
            onPress={() => setStrokes([])}
            disabled={busy !== null || !hasSignature}
          />
        </View>

        <Button
          label="Save and share"
          icon="share-outline"
          variant="solid"
          onPress={saveAndShare}
          loading={busy === 'save'}
          disabled={busy !== null || !file || nothingToAdd}
        />

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
  itemText: {
    color: colors.text,
    fontSize: 15,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  frame: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  pad: {
    width: PAD_WIDTH,
    height: PAD_HEIGHT,
  },
  // Touches pass through the drawing and placeholder to the pad underneath.
  passThrough: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: colors.muted,
    fontSize: 14,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
});
