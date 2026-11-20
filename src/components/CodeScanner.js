import { useIsFocused } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import ResultPanel from './ResultPanel';
import ScanCamera from './ScanCamera';
import ScreenHeader, { IconButton } from './ScreenHeader';
import Toast from './Toast';
import ZoomSlider from './ZoomSlider';
import useCopyToast from './useCopyToast';
import { colors } from '../theme';
import { batchClipboardText, trackScan } from '../lib/batch';

const TYPE_LABELS = {
  qr: 'QR code',
  aztec: 'Aztec code',
  datamatrix: 'Data Matrix',
  pdf417: 'PDF417',
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code128: 'Code 128',
  code39: 'Code 39',
  code93: 'Code 93',
  itf14: 'ITF-14',
  codabar: 'Codabar',
};

// Shared by the QR and barcode screens. Every code read is copied to the clipboard.
// Single mode shows the first read and pauses until "Scan again".
// Batch mode keeps scanning, lists each code, and copies the whole batch, one per line.
export default function CodeScanner({ title, barcodeTypes, frameWidth, frameHeight, hint }) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const pausedRef = useRef(false); // single mode: ignores repeats of the code already read
  const batchRef = useRef(false); // mirrors batchOn for the scan callback
  const itemsRef = useRef([]); // mirrors items for the scan callback
  const lastRef = useRef(null); // last batch read, for repeat filtering
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [result, setResult] = useState(null);
  const [batchOn, setBatchOn] = useState(false);
  const [items, setItems] = useState([]);
  const { toast, copy } = useCopyToast();

  const scannerSettings = useMemo(() => ({ barcodeTypes }), [barcodeTypes]);

  const setBatchItems = (next) => {
    itemsRef.current = next;
    setItems(next);
  };

  const handleScanned = ({ type, data }) => {
    if (!data) return;

    if (!batchRef.current) {
      if (pausedRef.current) return;
      pausedRef.current = true;
      setResult({ id: Date.now(), type, data });
      copy(data, 'Copied to clipboard');
      return;
    }

    const { accept, last } = trackScan(lastRef.current, data, Date.now());
    lastRef.current = last;
    if (!accept) return;

    const next = [...itemsRef.current, { id: Date.now(), type, data }];
    setBatchItems(next);
    copy(batchClipboardText(next), `Copied · ${next.length} in batch`);
  };

  const scanAgain = () => {
    pausedRef.current = false;
    setResult(null);
  };

  const startBatch = () => {
    pausedRef.current = false;
    setResult(null);
    lastRef.current = null;
    batchRef.current = true;
    setBatchOn(true);
  };

  const stopBatch = () => {
    batchRef.current = false;
    setBatchOn(false);
    setBatchItems([]);
    lastRef.current = null;
  };

  const clearBatch = () => {
    setBatchItems([]);
    lastRef.current = null;
  };

  const copyBatch = () => {
    const list = itemsRef.current;
    copy(batchClipboardText(list), `Copied · ${list.length} in batch`);
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
          width={frameWidth}
          height={frameHeight}
          enableTorch={torch}
          zoom={zoom}
          barcodeScannerSettings={scannerSettings}
          onBarcodeScanned={handleScanned}
        />
        <Text style={styles.hint}>{hint}</Text>
        <View style={styles.zoom}>
          <ZoomSlider value={zoom} onChange={setZoom} />
        </View>
        <Toast toast={toast} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        {batchOn ? (
          <View style={styles.batch}>
            <View style={styles.batchHead}>
              <Text style={styles.label}>Batch · {items.length}</Text>
              <Button label="Stop batch" icon="stop-outline" variant="ghost" onPress={stopBatch} />
            </View>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {items.length === 0 ? (
                <Text style={styles.idle}>Scan codes one after another. Each one is copied.</Text>
              ) : (
                items.map((item, index) => (
                  <View key={item.id} style={styles.item}>
                    <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.itemText} numberOfLines={1}>
                      {item.data}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.buttons}>
              <Button
                label="Copy all"
                icon="copy-outline"
                variant="solid"
                onPress={copyBatch}
                disabled={items.length === 0}
                style={styles.flex}
              />
              <Button
                label="Clear"
                icon="trash-outline"
                onPress={clearBatch}
                disabled={items.length === 0}
                style={styles.flex}
              />
            </View>
          </View>
        ) : result ? (
          <ResultPanel
            key={result.id}
            label={TYPE_LABELS[result.type] ?? 'Code'}
            text={result.data}
            onDismiss={scanAgain}
          />
        ) : (
          <>
            <Text style={styles.idle}>Waiting for a code</Text>
            <Button label="Batch mode" icon="layers-outline" onPress={startBatch} />
          </>
        )}
      </View>
    </View>
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
    paddingHorizontal: 56, // equal on both sides, so the frame stays centred
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  zoom: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  footer: {
    minHeight: 170,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  idle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 12,
  },
  batch: {
    gap: 12,
  },
  batchHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  list: {
    maxHeight: 96,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  index: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  itemText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});
