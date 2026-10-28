import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';

// The camera is exactly the size of the scan box, so only what is inside the box
// is ever shown or read. It is unmounted when the screen is not focused, so only
// one camera is ever active.
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
    return <View style={[styles.frame, size]} />;
  }

  return (
    <View style={[styles.frame, size]}>
      <CameraView
        ref={cameraRef}
        style={[styles.camera, size]}
        facing="back"
        enableTorch={enableTorch}
        barcodeScannerSettings={barcodeScannerSettings}
        onBarcodeScanned={onBarcodeScanned}
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setError(e?.message ?? 'Camera failed to start.')}
      />
      <View pointerEvents="none" style={styles.outline} />
      {!ready ? (
        <View pointerEvents="none" style={styles.status}>
          <Text style={styles.statusText}>{error ?? 'Starting camera...'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  outline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#00FF66',
  },
  status: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
