import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { shareFile, writeCacheFile } from '../lib/files';
import { parseTable, toCsv, toXlsxBytes } from '../lib/table';

const CELL_WIDTH = 120; // pixels, for each cell in the preview grid

const CSV_SHARE = {
  mimeType: 'text/csv',
  UTI: 'public.comma-separated-values-text',
  dialogTitle: 'Share CSV',
};

const XLSX_SHARE = {
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  UTI: 'org.openxmlformats.spreadsheetml.sheet',
  dialogTitle: 'Share spreadsheet',
};

// Turns pasted or typed rows into a CSV or Excel file and opens the share sheet.
// Files are made on the phone. Nothing is uploaded.
export default function TableScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]); // the previewed grid. Exports use only this.
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('Table Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  // Editing clears the preview, so an export never uses a grid that no longer matches the text.
  const editText = (value) => {
    setText(value);
    setRows([]);
    setMessage(null);
  };

  const paste = () =>
    run('paste', async () => {
      const clip = await Clipboard.getStringAsync();
      if (!clip) {
        setMessage('Nothing on the clipboard. Copy some cells first.');
        return;
      }
      setText(clip);
      setRows([]);
    });

  const preview = () => {
    const parsed = parseTable(text);
    setRows(parsed);
    setMessage(parsed.length === 0 ? 'Nothing to preview. Paste or type some rows first.' : null);
  };

  const saveCsv = () =>
    run('csv', async () => {
      const file = writeCacheFile('NumScan-table.csv', toCsv(rows));
      await shareFile(file.uri, CSV_SHARE);
    });

  const saveXlsx = () =>
    run('xlsx', async () => {
      const file = writeCacheFile('NumScan-table.xlsx', toXlsxBytes(rows, 'Sheet1'));
      await shareFile(file.uri, XLSX_SHARE);
    });

  const hasRows = rows.length > 0;
  const columns = hasRows ? rows[0].length : 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Table to file" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={text}
          onChangeText={editText}
          placeholder="Paste from a sheet, or type. Tabs or commas separate columns."
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Button
          label="Paste from clipboard"
          icon="clipboard-outline"
          onPress={paste}
          loading={busy === 'paste'}
          disabled={busy !== null}
        />
        <Button
          label="Preview"
          icon="eye-outline"
          variant="solid"
          onPress={preview}
          disabled={busy !== null}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {hasRows ? (
          <>
            <Text style={styles.hint}>{`${rows.length} rows · ${columns} columns`}</Text>
            <ScrollView horizontal style={styles.grid} showsHorizontalScrollIndicator>
              <View>
                {rows.map((row, r) => (
                  <View key={r} style={styles.gridRow}>
                    {row.map((cell, c) => (
                      <View key={c} style={styles.cell}>
                        <Text numberOfLines={2} style={[styles.cellText, r === 0 && styles.headText]}>
                          {cell}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        ) : null}

        <Button
          label="Save as CSV"
          icon="document-text-outline"
          onPress={saveCsv}
          loading={busy === 'csv'}
          disabled={busy !== null || !hasRows}
        />
        <Button
          label="Save as Excel"
          icon="grid-outline"
          onPress={saveXlsx}
          loading={busy === 'xlsx'}
          disabled={busy !== null || !hasRows}
        />
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
  input: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    padding: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
  // One border on the top and left; each cell adds its own right and bottom edge.
  grid: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.line,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_WIDTH,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  cellText: {
    color: colors.text,
    fontSize: 14,
  },
  headText: {
    fontWeight: '700',
  },
});
