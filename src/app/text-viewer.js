import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickAnyFiles } from '../lib/media';
import { fileSize, readFileText, shareFile, writeCacheFile } from '../lib/files';
import { cleanText, detectKind, formatJson, minifyJson, numberLines } from '../lib/textFormat';
import { sanitizeName } from '../lib/zipPack';

const MAX_BYTES = 1024 * 1024;
const MAX_LINES = 2000;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const MIME = { json: 'application/json', csv: 'text/csv', html: 'text/html' };

// 'notes.txt' becomes 'notes-clean.txt'. A name with no extension gets '-clean' at the end.
function cleanName(name) {
  const safe = sanitizeName(name);
  const dot = safe.lastIndexOf('.');
  return dot > 0 ? `${safe.slice(0, dot)}-clean${safe.slice(dot)}` : `${safe}-clean`;
}

// Cleaned text ends with one newline, so the number of newlines is the number of lines.
function countLines(text) {
  return text.split('\n').length - 1;
}

// Opens a plain-text file and shows it with line numbers. Nothing is uploaded.
export default function TextViewerScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [doc, setDoc] = useState(null); // { name, kind, text }

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('Text viewer Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  // The view is built once per file, not on every render.
  const view = useMemo(() => {
    if (!doc) return null;
    const all = numberLines(cleanText(doc.text));
    return { shown: all.slice(0, MAX_LINES), total: all.length };
  }, [doc]);

  const openFile = () =>
    run('pick', async () => {
      const [asset] = await pickAnyFiles();
      if (!asset) return;
      const size = fileSize(asset.uri);
      if (size !== null && size > MAX_BYTES) {
        setMessage('This file is larger than 1 MB. Choose a smaller one.');
        return;
      }
      const text = await readFileText(asset.uri);
      if (text.includes('\u0000')) {
        setMessage('This file is not plain text.');
        return;
      }
      setDoc({ name: asset.name, kind: detectKind(asset.name), text });
    });

  const cleanUp = () => {
    const cleaned = cleanText(doc.text);
    setDoc({ ...doc, text: cleaned });
    setMessage(`Cleaned up. ${countLines(cleaned)} lines.`);
  };

  // Applies a JSON change, or shows the parser's message when the text is not valid JSON.
  const changeJson = (change) => {
    try {
      setDoc({ ...doc, text: change(doc.text) });
      setMessage(null);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const saveAndShare = () =>
    run('share', async () => {
      const file = writeCacheFile(cleanName(doc.name), doc.text);
      await shareFile(file.uri, {
        mimeType: MIME[doc.kind] ?? 'text/plain',
        UTI: doc.kind === 'json' ? 'public.json' : 'public.plain-text',
        dialogTitle: 'Share text file',
      });
    });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Text viewer" />

      <View style={styles.controls}>
        {doc ? null : (
          <Text style={styles.hint}>
            Open a text, code, CSV, HTML or JSON file up to 1 MB. It is read on this phone only.
          </Text>
        )}
        <Button
          label={doc ? 'Open another file' : 'Open a file'}
          icon="folder-open-outline"
          variant={doc ? 'outline' : 'solid'}
          onPress={openFile}
          loading={busy === 'pick'}
          disabled={busy !== null}
        />

        {doc ? (
          <>
            <Text style={styles.fileName} numberOfLines={1}>
              {doc.name}
            </Text>
            <Button label="Clean up" icon="brush-outline" onPress={cleanUp} disabled={busy !== null} />
            {doc.kind === 'json' ? (
              <>
                <Button label="Format JSON" icon="code-outline" onPress={() => changeJson(formatJson)} disabled={busy !== null} />
                <Button label="Minify" icon="contract-outline" onPress={() => changeJson(minifyJson)} disabled={busy !== null} />
              </>
            ) : null}
            <Button
              label="Save and share"
              icon="share-outline"
              variant="solid"
              onPress={saveAndShare}
              loading={busy === 'share'}
              disabled={busy !== null}
            />
          </>
        ) : null}

        {view && view.total > MAX_LINES ? (
          <Text style={styles.hint}>
            Showing the first {MAX_LINES} of {view.total} lines.
          </Text>
        ) : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      {view ? (
        <ScrollView
          style={styles.viewer}
          contentContainerStyle={[styles.viewerContent, { paddingBottom: insets.bottom + 16 }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              {view.shown.map((line) => (
                <View key={line.no} style={styles.line}>
                  <Text style={styles.gutter}>{line.no}</Text>
                  <Text style={styles.code}>{line.text || ' '}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  fileName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  viewer: {
    flex: 1,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  viewerContent: {
    paddingTop: 8,
    paddingLeft: 12,
  },
  line: {
    flexDirection: 'row',
  },
  gutter: {
    width: 52,
    paddingRight: 12,
    textAlign: 'right',
    color: colors.muted,
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 20,
  },
  code: {
    color: colors.text,
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 20,
  },
});
