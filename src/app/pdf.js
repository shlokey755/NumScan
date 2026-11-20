import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { pickImages, pickPdfs, toJpeg } from '../lib/media';
import { readFileBytes, shareFile, writeCacheFile } from '../lib/files';
import {
  countPages,
  createPdfFromImages,
  createPdfFromText,
  mergePdfs,
  parsePageRanges,
  splitPdf,
} from '../lib/pdf';

const TABS = [
  { value: 'merge', label: 'Merge' },
  { value: 'split', label: 'Split' },
  { value: 'text', label: 'Text' },
  { value: 'images', label: 'Photos' },
];

const PDF_SHARE = (dialogTitle) => ({
  mimeType: 'application/pdf',
  UTI: 'com.adobe.pdf',
  dialogTitle,
});

// "Pages 1–3" or "Page 5", for a group of 0-based page indexes.
function describePages(pages) {
  const first = pages[0] + 1;
  const last = pages[pages.length - 1] + 1;
  if (first === last) return `Page ${first}`;
  return `Pages ${first}–${last}`;
}

// Merge, split, make a PDF from text or photos, or open one in another app.
// PDFs are made on the phone and shared from there. Nothing is uploaded.
export default function PdfScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('merge');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  const [files, setFiles] = useState([]); // merge: [{ uri, name }]
  const [source, setSource] = useState(null); // split: { uri, name, pages }
  const [ranges, setRanges] = useState('');
  const [parts, setParts] = useState([]); // split output: [{ id, label, file }]
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]); // images: [{ uri }]

  // Runs one action with a busy state and a readable message if it fails.
  const run = async (name, task) => {
    setBusy(name);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      console.error('PDF Error:', error);
      setMessage(error?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const addFiles = () =>
    run('pick', async () => {
      const picked = await pickPdfs({ multiple: true });
      setFiles((list) => [...list, ...picked.map((a) => ({ uri: a.uri, name: a.name }))]);
    });

  const removeFile = (index) => setFiles((list) => list.filter((_, i) => i !== index));

  const mergeAndShare = () =>
    run('merge', async () => {
      const bytes = [];
      for (const item of files) bytes.push(await readFileBytes(item.uri));
      const merged = await mergePdfs(bytes);
      const file = writeCacheFile('NumScan-merged.pdf', merged);
      await shareFile(file.uri, PDF_SHARE('Share merged PDF'));
    });

  const chooseSource = () =>
    run('pick', async () => {
      const [asset] = await pickPdfs();
      if (!asset) return;
      const pages = await countPages(await readFileBytes(asset.uri));
      setSource({ uri: asset.uri, name: asset.name, pages });
      setParts([]);
    });

  const splitNow = () =>
    run('split', async () => {
      const parsed = parsePageRanges(ranges, source.pages);
      if (parsed.error) {
        setMessage(parsed.error);
        return;
      }
      const outputs = await splitPdf(await readFileBytes(source.uri), parsed.groups);
      setParts(
        outputs.map((bytes, index) => ({
          id: `${index}`,
          label: describePages(parsed.groups[index]),
          file: writeCacheFile(`NumScan-part-${index + 1}.pdf`, bytes),
        }))
      );
    });

  const sharePart = (part) => run('share', () => shareFile(part.file.uri, PDF_SHARE('Share PDF')));

  const textToPdf = () =>
    run('text', async () => {
      const file = writeCacheFile('NumScan-text.pdf', await createPdfFromText(text));
      await shareFile(file.uri, PDF_SHARE('Share PDF'));
    });

  const addPhotos = () =>
    run('pick', async () => {
      const picked = await pickImages({ multiple: true });
      setPhotos((list) => [...list, ...picked.map((a) => ({ uri: a.uri }))]);
    });

  const photosToPdf = () =>
    run('photos', async () => {
      const items = [];
      for (const photo of photos) {
        // Every photo is converted to JPEG first, so the PDF can always embed it.
        const jpeg = await toJpeg(photo.uri);
        items.push({ bytes: await readFileBytes(jpeg.uri), kind: 'jpg' });
      }
      const file = writeCacheFile('NumScan-photos.pdf', await createPdfFromImages(items));
      await shareFile(file.uri, PDF_SHARE('Share PDF'));
    });

  const openOther = () =>
    run('open', async () => {
      const [asset] = await pickPdfs();
      if (asset) await shareFile(asset.uri, PDF_SHARE('Open PDF'));
    });

  const switchTab = (value) => {
    setTab(value);
    setMessage(null);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="PDF tools" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TABS} value={tab} onChange={switchTab} />

        {tab === 'merge' ? (
          <>
            <Text style={styles.hint}>Pick two or more PDFs. They join in the order shown.</Text>
            {files.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.item}>
                <Text style={styles.itemIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.itemText} numberOfLines={1}>
                  {item.name}
                </Text>
                <Button label="Remove" variant="ghost" onPress={() => removeFile(index)} />
              </View>
            ))}
            <Button label="Add PDFs" icon="add-outline" onPress={addFiles} loading={busy === 'pick'} disabled={busy !== null} />
            <Button
              label="Merge and share"
              icon="share-outline"
              variant="solid"
              onPress={mergeAndShare}
              loading={busy === 'merge'}
              disabled={busy !== null || files.length < 2}
            />
          </>
        ) : null}

        {tab === 'split' ? (
          <>
            <Text style={styles.hint}>
              Choose one PDF, then type the pages you want. Each comma-separated part becomes its own file.
            </Text>
            {source ? <Text style={styles.itemText}>{source.name} · {source.pages} pages</Text> : null}
            <Button label={source ? 'Choose another PDF' : 'Choose a PDF'} icon="document-text-outline" onPress={chooseSource} loading={busy === 'pick'} disabled={busy !== null} />
            <TextInput
              value={ranges}
              onChangeText={setRanges}
              placeholder="1-3, 5"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              editable={!!source}
              style={styles.input}
            />
            <Button
              label="Split"
              icon="cut-outline"
              variant="solid"
              onPress={splitNow}
              loading={busy === 'split'}
              disabled={busy !== null || !source}
            />
            {parts.map((part) => (
              <View key={part.id} style={styles.item}>
                <Text style={styles.itemText}>{part.label}</Text>
                <Button label="Share" icon="share-outline" onPress={() => sharePart(part)} disabled={busy !== null} />
              </View>
            ))}
          </>
        ) : null}

        {tab === 'text' ? (
          <>
            <Text style={styles.hint}>Type or paste text. It is wrapped onto A4 pages.</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type or paste the text"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.area]}
            />
            <Button
              label="Make PDF and share"
              icon="share-outline"
              variant="solid"
              onPress={textToPdf}
              loading={busy === 'text'}
              disabled={busy !== null || !text.trim()}
            />
          </>
        ) : null}

        {tab === 'images' ? (
          <>
            <Text style={styles.hint}>Each photo becomes one page, in the order chosen.</Text>
            {photos.length > 0 ? (
              <View style={styles.thumbs}>
                {photos.map((photo, index) => (
                  <Image key={`${photo.uri}-${index}`} source={{ uri: photo.uri }} style={styles.thumb} />
                ))}
              </View>
            ) : null}
            <Button label="Add photos" icon="add-outline" onPress={addPhotos} loading={busy === 'pick'} disabled={busy !== null} />
            <Button
              label={`Make PDF from ${photos.length} photo${photos.length === 1 ? '' : 's'}`}
              icon="share-outline"
              variant="solid"
              onPress={photosToPdf}
              loading={busy === 'photos'}
              disabled={busy !== null || photos.length === 0}
            />
          </>
        ) : null}

        <View style={styles.divider} />
        <Button label="Open a PDF in another app" icon="open-outline" onPress={openOther} loading={busy === 'open'} disabled={busy !== null} />

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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  itemIndex: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  itemText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  area: {
    minHeight: 220,
    paddingVertical: 12,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.line,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
  },
});
