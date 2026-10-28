import { CameraView } from 'expo-camera';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Viewfinder from './Viewfinder';
import { colors } from '../theme';

// The camera is exactly the size of the scan area, so only what is inside the
// corner brackets is shown and read. It unmounts when its screen loses focus,
// so only one camera is ever active.
export default function ScanCamera({
  cameraRef,
  active,
  width,
  height,
  enableTorch = false,
  barcodeScannerSettings,
  onBarcodeScanned,
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) {
      setReady(false);
      setError(null);
    }
  }, [active]);

  const size = { width, height };

  if (!active) {
    return <View style={size} />;
  }

  return (
    <View style={[styles.frame, size]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={enableTorch}
        barcodeScannerSettings={barcodeScannerSettings}
        onBarcodeScanned={onBarcodeScanned}
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setError(e?.message ?? 'Camera failed to start.')}
      />
      <Viewfinder width={width} height={height} />
      {!ready ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.status]}>
          <Text style={styles.statusText}>{error ?? 'Starting camera'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#000',
  },
  status: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  statusText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});
