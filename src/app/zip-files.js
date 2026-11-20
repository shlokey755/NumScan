import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickAnyFiles } from '../lib/media';
import { readFileBytes, shareFile, writeCacheFile } from '../lib/files';
import { previewNames } from '../lib/rename';
import { zipFiles } from '../lib/zipPack';

const DEFAULT_TEMPLATE = '{name}_{nnn}';
const TOKEN_HINT =
  'Tokens: {n} number, {nn} number with 2 digits, {nnn} number with 3 digits, {name} original name without extension, {ext} extension.';

// Renames picked files with a template and shares them as one ZIP. Nothing is uploaded.
export default function ZipFilesScreen() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [files, setFiles] = useState([]); // [{ uri, name }]
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('Rename and zip Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  // The same names are used for the preview and the ZIP entries.
  const preview = useMemo(
    () => previewNames(template, files.map((file) => file.name)),
    [template, files]
  );

  const pick = () =>
    run('pick', async () => {
      const picked = await pickAnyFiles({ multiple: true });
      if (picked.length > 0) {
        setFiles(picked.map((asset) => ({ uri: asset.uri, name: asset.name })));
      }
    });

  const shareZip = () =>
    run('zip', async () => {
      const entries = [];
      for (let i = 0; i < files.length; i += 1) {
        entries.push({ name: preview[i], bytes: await readFileBytes(files[i].uri) });
      }
      const file = writeCacheFile('NumScan-files.zip', zipFiles(entries));
      await shareFile(file.uri, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'Share ZIP',
      });
    });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Rename and zip" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Button label="Pick files" icon="add-outline" onPress={pick} loading={busy === 'pick'} disabled={busy !== null} />

        {files.length === 0 ? (
          <Text style={styles.hint}>Pick the files to rename. They are zipped on this phone.</Text>
        ) : null}
        {files.map((file, index) => (
          <View key={`${file.uri}-${index}`} style={styles.item}>
            <Text style={styles.original} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={styles.renamed} numberOfLines={1}>
              {preview[index]}
            </Text>
          </View>
        ))}

        <Text style={styles.label}>Name template</Text>
        <TextInput
          value={template}
          onChangeText={setTemplate}
          placeholder={DEFAULT_TEMPLATE}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.hint}>{TOKEN_HINT}</Text>

        <Button
          label="Share as ZIP"
          icon="share-outline"
          variant="solid"
          onPress={shareZip}
          loading={busy === 'zip'}
          disabled={busy !== null || files.length === 0}
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
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  item: {
    gap: 2,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  original: {
    color: colors.muted,
    fontSize: 13,
  },
  renamed: {
    color: colors.text,
    fontSize: 15,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
