import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickPdfs } from '../lib/media';
import { readFileBytes, shareFile, writeCacheFile } from '../lib/files';
import { countPages, editPages } from '../lib/pdf';

const PDF_SHARE = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share edited PDF' };

// "turned 90°, kept" or "not turned, removed", for one page row.
function pageState(row) {
  const turn = row.turn ? `turned ${row.turn}°` : 'not turned';
  return `${turn}, ${row.keep ? 'kept' : 'removed'}`;
}

// Reorder, turn, or remove the pages of one PDF, then share the result.
// There are no page previews, so pages are identified by their number.
export default function PdfEditScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [file, setFile] = useState(null); // { uri, name }
  const [rows, setRows] = useState([]); // [{ index, turn, keep }] in output order

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('PDF Edit Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const choosePdf = () =>
    run('pick', async () => {
      const [asset] = await pickPdfs();
      if (!asset) return;
      const count = await countPages(await readFileBytes(asset.uri));
      setFile({ uri: asset.uri, name: asset.name });
      setRows(Array.from({ length: count }, (_, index) => ({ index, turn: 0, keep: true })));
    });

  const movePage = (from, to) =>
    setRows((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = list.slice();
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  const changePage = (position, change) =>
    setRows((list) => list.map((row, i) => (i === position ? change(row) : row)));

  const turnPage = (position) =>
    changePage(position, (row) => ({ ...row, turn: (row.turn + 90) % 360 }));

  const toggleKeep = (position) =>
    changePage(position, (row) => ({ ...row, keep: !row.keep }));

  const keptCount = rows.filter((row) => row.keep).length;

  const saveAndShare = () =>
    run('save', async () => {
      const bytes = await readFileBytes(file.uri);
      const edited = await editPages(
        bytes,
        rows.map((row) => ({ index: row.index, rotation: row.turn, keep: row.keep }))
      );
      const out = writeCacheFile('NumScan-edited.pdf', edited);
      await shareFile(out.uri, PDF_SHARE);
    });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Edit PDF pages" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <Text style={styles.hint}>
          There are no page previews, so pages are identified by their number.
        </Text>

        <Button
          label={file ? 'Choose another PDF' : 'Choose a PDF'}
          icon="document-text-outline"
          variant={file ? 'outline' : 'solid'}
          onPress={choosePdf}
          loading={busy === 'pick'}
          disabled={busy !== null}
        />

        {file ? (
          <>
            <Text style={styles.itemText} numberOfLines={1}>
              {file.name} · {rows.length} pages
            </Text>

            {rows.map((row, position) => (
              <View key={row.index} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={[styles.pageLabel, !row.keep && styles.removed]}>
                    Page {row.index + 1}
                  </Text>
                  <Text style={styles.state}>{pageState(row)}</Text>
                </View>
                <View style={styles.actions}>
                  <Button
                    label="Up"
                    style={styles.action}
                    onPress={() => movePage(position, position - 1)}
                    disabled={busy !== null || position === 0}
                  />
                  <Button
                    label="Down"
                    style={styles.action}
                    onPress={() => movePage(position, position + 1)}
                    disabled={busy !== null || position === rows.length - 1}
                  />
                  <Button
                    label="Turn"
                    style={styles.action}
                    onPress={() => turnPage(position)}
                    disabled={busy !== null}
                  />
                  <Button
                    label={row.keep ? 'Remove' : 'Keep'}
                    style={styles.action}
                    onPress={() => toggleKeep(position)}
                    disabled={busy !== null}
                  />
                </View>
              </View>
            ))}

            <Text style={styles.hint}>
              {keptCount} of {rows.length} pages will be saved.
            </Text>
            <Button
              label="Save and share"
              icon="share-outline"
              variant="solid"
              onPress={saveAndShare}
              loading={busy === 'save'}
              disabled={busy !== null || keptCount === 0}
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
  itemText: {
    color: colors.text,
    fontSize: 15,
  },
  row: {
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  removed: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  state: {
    color: colors.muted,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  action: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 4,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
});
