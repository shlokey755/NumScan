import { useIsFocused } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResultPanel from './ResultPanel';
import ScanCamera from './ScanCamera';
import ScreenHeader, { IconButton } from './ScreenHeader';
import ZoomSlider from './ZoomSlider';
import { colors } from '../theme';

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

// Shared by the QR and barcode screens. Codes are read automatically. The first
// read is shown and scanning pauses until "Scan again".
export default function CodeScanner({ title, barcodeTypes, frameWidth, frameHeight, hint }) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const pausedRef = useRef(false); // ignores repeat events for the code already read
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [result, setResult] = useState(null);

  const scannerSettings = useMemo(() => ({ barcodeTypes }), [barcodeTypes]);

  const handleScanned = ({ type, data }) => {
    if (pausedRef.current || !data) return;
    pausedRef.current = true;
    setResult({ id: Date.now(), type, data });
  };

  const scanAgain = () => {
    pausedRef.current = false;
    setResult(null);
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
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        {result ? (
          <ResultPanel
            key={result.id}
            label={TYPE_LABELS[result.type] ?? 'Code'}
            text={result.data}
            onDismiss={scanAgain}
          />
        ) : (
          <Text style={styles.idle}>Waiting for a code</Text>
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
  },
  idle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
