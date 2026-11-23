import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { pickAnyFiles, pickPdfs } from '../lib/media';
import { readFileBytes, readFileText, shareFile, writeCacheFile } from '../lib/files';
import { markdownToPdf, pdfToMarkdown } from '../lib/markdown';

const TABS = [
  { value: 'md', label: 'To Markdown' },
  { value: 'pdf', label: 'To PDF' },
];

const PREVIEW_CHARS = 6000;

const MD_SHARE = {
  mimeType: 'text/markdown',
  UTI: 'net.daringfireball.markdown',
  dialogTitle: 'Share Markdown',
};

const PDF_SHARE = {
  mimeType: 'application/pdf',
  UTI: 'com.adobe.pdf',
  dialogTitle: 'Share PDF',
};

// "report.pdf" -> "report", so the saved file keeps the same name.
function stemOf(name) {
  return (name ?? '').replace(/\.[^.]+$/, '') || 'NumScan';
}

// Converts a PDF to Markdown, or Markdown to a PDF. Everything runs on the phone.
export default function PdfMarkdownScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('md');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  // To Markdown
  const [pdfName, setPdfName] = useState(null);
  const [converted, setConverted] = useState(null); // { markdown, pageCount, failedPages, hasText }

  // To PDF
  const [source, setSource] = useState('');
  const [sourceName, setSourceName] = useState(null);

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('PDF Markdown Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const choosePdf = () =>
    run('pick', async () => {
      const [asset] = await pickPdfs();
      if (!asset) return;
      const result = await pdfToMarkdown(await readFileBytes(asset.uri));
      setPdfName(asset.name);
      setConverted(result);
      if (!result.hasText) {
        setMessage('No text was found. This PDF may be a scan, and scanned pages cannot be converted yet.');
      } else if (result.failedPages > 0) {
        setMessage(`${result.failedPages} page${result.failedPages === 1 ? '' : 's'} could not be read. The rest is shown.`);
      }
    });

  const shareMarkdown = () =>
    run('share', async () => {
      const file = writeCacheFile(`${stemOf(pdfName)}.md`, converted.markdown);
      await shareFile(file.uri, MD_SHARE);
    });

  const chooseMarkdown = () =>
    run('pick', async () => {
      const [asset] = await pickAnyFiles();
      if (!asset) return;
      setSource(await readFileText(asset.uri));
      setSourceName(asset.name);
    });

  const makePdf = () =>
    run('make', async () => {
      const file = writeCacheFile(`${stemOf(sourceName)}.pdf`, await markdownToPdf(source));
      await shareFile(file.uri, PDF_SHARE);
    });

  const switchTab = (value) => {
    setTab(value);
    setMessage(null);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="PDF and Markdown" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TABS} value={tab} onChange={switchTab} />

        {tab === 'md' ? (
          <>
            <Text style={styles.hint}>
              Pick a PDF. Headings, lists, code blocks and paragraphs are kept. Nothing is uploaded.
            </Text>
            <Button
              label={converted ? 'Choose another PDF' : 'Choose a PDF'}
              icon="document-text-outline"
              variant="solid"
              onPress={choosePdf}
              loading={busy === 'pick'}
              disabled={busy !== null}
            />

            {converted ? (
              <>
                <Text style={styles.meta}>
                  {pdfName} · {converted.pageCount} page{converted.pageCount === 1 ? '' : 's'}
                </Text>
                {converted.hasText ? (
                  <>
                    <View style={styles.preview}>
                      <Text style={styles.previewText} selectable>
                        {converted.markdown.slice(0, PREVIEW_CHARS)}
                        {converted.markdown.length > PREVIEW_CHARS ? '\n\n… preview only. The file has all of it.' : ''}
                      </Text>
                    </View>
                    <Button
                      label="Save and share as .md"
                      icon="share-outline"
                      onPress={shareMarkdown}
                      loading={busy === 'share'}
                      disabled={busy !== null}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'pdf' ? (
          <>
            <Text style={styles.hint}>
              Pick a .md or .txt file, or paste Markdown. Headings, lists and code blocks become a PDF.
            </Text>
            <Button
              label="Choose a .md or .txt file"
              icon="folder-open-outline"
              onPress={chooseMarkdown}
              loading={busy === 'pick'}
              disabled={busy !== null}
            />
            {sourceName ? <Text style={styles.meta}>{sourceName}</Text> : null}
            <TextInput
              value={source}
              onChangeText={(text) => {
                setSource(text);
                setSourceName(null);
              }}
              placeholder="# Title&#10;&#10;Paste or type Markdown here"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.area]}
            />
            <Button
              label="Make PDF and share"
              icon="share-outline"
              variant="solid"
              onPress={makePdf}
              loading={busy === 'make'}
              disabled={busy !== null || !source.trim()}
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
  meta: {
    color: colors.text,
    fontSize: 14,
  },
  preview: {
    maxHeight: 360,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  previewText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'monospace',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    fontFamily: 'monospace',
  },
  area: {
    minHeight: 220,
    paddingVertical: 12,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
