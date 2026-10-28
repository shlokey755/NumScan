import { useIsFocused } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ActionButton from './ActionButton';
import ResultCard from './ResultCard';
import ScanCamera from './ScanCamera';

const TYPE_LABELS = {
  qr: 'QR code',
  aztec: 'Aztec code',
  datamatrix: 'Data Matrix',
  pdf417: 'PDF417',
  ean13: 'EAN-13 barcode',
  ean8: 'EAN-8 barcode',
  upc_a: 'UPC-A barcode',
  upc_e: 'UPC-E barcode',
  code128: 'Code 128 barcode',
  code39: 'Code 39 barcode',
  code93: 'Code 93 barcode',
  itf14: 'ITF-14 barcode',
  codabar: 'Codabar barcode',
};

// Shared by the QR and barcode screens. Codes are read automatically;
// the first read is shown and scanning pauses until "Scan again".
export default function CodeScanner({ barcodeTypes, frameWidth, frameHeight, hint }) {
  const isFocused = useIsFocused();
  const cameraRef = useRef(null);
  const pausedRef = useRef(false); // ignores repeat events for the code already read
  const [torch, setTorch] = useState(false);
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
      <View style={styles.stage}>
        <ScanCamera
          cameraRef={cameraRef}
          active={isFocused}
          width={frameWidth}
          height={frameHeight}
          enableTorch={torch}
          barcodeScannerSettings={scannerSettings}
          onBarcodeScanned={handleScanned}
        />
        <Text style={styles.hint}>{hint}</Text>
      </View>

      <View style={styles.panel}>
        {result ? (
          <ResultCard
            key={result.id}
            title={TYPE_LABELS[result.type] ?? 'Code'}
            text={result.data}
            copyLabel="Copy"
            dismissLabel="Scan again"
            onDismiss={scanAgain}
          />
        ) : null}
        <View style={styles.row}>
          <ActionButton
            label={torch ? 'Torch off' : 'Torch on'}
            onPress={() => setTorch((on) => !on)}
          />
        </View>
      </View>
    </View>
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
});
