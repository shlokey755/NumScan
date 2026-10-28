import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import TextRecognition from '@react-native-ml-kit/text-recognition';

// Scan box: the camera itself is this size, so the preview only exists inside it
const BOX_WIDTH = 260;
const BOX_HEIGHT = 120;
const BOX_TOP = 120; // distance from top of screen
const BOX_BORDER = 2;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const { width: screenWidth } = useWindowDimensions();
  const cameraRef = useRef(null);

  const boxLeft = (screenWidth - BOX_WIDTH) / 2;

  const extractNumbers = (rawText) => {
    const matches = rawText.match(/\d+/g);
    return matches ? matches.join('') : null;
  }

  // The camera fills the box ("cover" style), so only the centre part of the
  // photo is visible inside it. Work out that part in photo pixels, then keep
  // only the text whose centre falls inside it.
  const getTextInsideBox = (result, photo) => {
    const scale = Math.max(BOX_WIDTH / photo.width, BOX_HEIGHT / photo.height);
    const visibleW = BOX_WIDTH / scale;
    const visibleH = BOX_HEIGHT / scale;
    const box = {
      left: (photo.width - visibleW) / 2,
      top: (photo.height - visibleH) / 2,
      right: (photo.width + visibleW) / 2,
      bottom: (photo.height + visibleH) / 2,
    };

    const parts = [];
    for (const block of result?.blocks ?? []) {
      for (const line of block.lines ?? []) {
        const pieces = line.elements?.length ? line.elements : [line];
        for (const piece of pieces) {
          const f = piece.frame;
          if (!f) continue;
          const cx = f.left + f.width / 2;
          const cy = f.top + f.height / 2;
          if (cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom) {
            parts.push(piece.text);
          }
        }
      }
    }

    return parts.join(' ');
  };

  const handleScan = async () => {
    if (cameraRef.current && cameraReady && !loading) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

        if (!photo || !photo.uri) {
          throw new Error('Failed to capture image.');
        }

        const result = await TextRecognition.recognize(photo.uri);
        const rawText = getTextInsideBox(result, photo);
        const foundAnywhere = (result?.text || '').trim().length > 0;

        if (rawText.trim().length > 0) {
          const scannedNumbers = extractNumbers(rawText);

          if (scannedNumbers) {
            await Clipboard.setStringAsync(scannedNumbers);
            Alert.alert('Success!', `Copied to clipboard:\n${scannedNumbers}`);
          } else {
            Alert.alert(
              'No Numbers Found',
              `Detected text:\n"${rawText}"\n\nCould not find any numbers.`
            );
          }
        } else if (foundAnywhere) {
          Alert.alert(
            'Text Outside Box',
            'Text was found, but not inside the box. Move the number into the box and try again.'
          );
        } else {
          Alert.alert('No Text Detected', 'Make sure lighting is good and the number is in focus.');
        }
      } catch (error) {
        console.error('Scanning Error:', error);
        Alert.alert('Error', 'An error occurred while scanning text.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Need permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* The camera is only as big as the box and sits exactly on it.
          Nothing is layered above it, so it is not covered by anything. */}
      <CameraView
        style={[styles.camera, { left: boxLeft, top: BOX_TOP }]}
        ref={cameraRef}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(e) => setCameraError(e?.message ?? 'Camera failed to start.')}
      />

      {/* Green box outline */}
      <View pointerEvents="none" style={[styles.outline, { left: boxLeft, top: BOX_TOP }]} />

      {/* Status message inside the box until the camera reports ready */}
      {!cameraReady && (
        <View pointerEvents="none" style={[styles.statusBox, { left: boxLeft, top: BOX_TOP }]}>
          <Text style={styles.statusText}>{cameraError ?? 'Starting camera...'}</Text>
        </View>
      )}

      <View style={styles.buttonWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.scanButton, (!cameraReady || loading) && styles.disabledButton]}
          onPress={handleScan}
          disabled={loading || !cameraReady}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.scanButtonText}>
              {cameraReady ? 'SCAN NUMBER' : 'STARTING CAMERA...'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    position: 'absolute',
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  },
  outline: {
    position: 'absolute',
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderWidth: BOX_BORDER,
    borderColor: '#00FF66',
  },
  statusBox: {
    position: 'absolute',
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanButton: {
    backgroundColor: '#00FF66',
    paddingHorizontal: 35,
    paddingVertical: 16,
    borderRadius: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});