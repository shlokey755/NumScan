import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { MAX_QR_BYTES, toQrText, utf8Length } from '../lib/qr';
import { saveQrToPhotos, shareQrImage } from '../lib/qrImage';

const QUIET_ZONE = 16; // blank margin around the code, which scanners need
const EXPORT_SIZE = 1024; // size of the saved and shared PNG, in pixels

// Turns any text into a QR code. Save and Share send the code as an image.
export default function MakeQrScreen() {
  const insets = useSafeAreaInsets();
  const svgRef = useRef(null);
  const [input, setInput] = useState('');
  const [text, setText] = useState(null); // the exact text the QR code encodes
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'share' | null

  const paste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!clip) {
        setError('Nothing to paste. Copy some text first.');
        return;
      }
      setInput(clip);
      setError(null);
    } catch (e) {
      Alert.alert('Paste failed', String(e?.message ?? e));
    }
  };

  const make = () => {
    const result = toQrText(input);
    if (result.error) {
      setText(null);
      setError(result.error);
      return;
    }
    setError(null);
    setCopied(false);
    setText(result.text);
  };

  const newCode = () => {
    setText(null);
    setError(null);
    setCopied(false);
  };

  const copyText = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
    } catch (e) {
      Alert.alert('Copy failed', String(e?.message ?? e));
    }
  };

  // Renders the on-screen QR as a base64 PNG at full export size.
  const exportPng = () =>
    new Promise((resolve, reject) => {
      const svg = svgRef.current;
      if (!svg?.toDataURL) {
        reject(new Error('The QR code is not ready yet. Try again.'));
        return;
      }
      svg.toDataURL(
        (base64) => (base64 ? resolve(base64) : reject(new Error('Could not draw the QR code.'))),
        { width: EXPORT_SIZE, height: EXPORT_SIZE }
      );
    });

  const saveImage = async () => {
    setBusy('save');
    try {
      const base64 = await exportPng();
      await saveQrToPhotos(base64);
      Alert.alert('Saved', 'The QR code is in your photos.');
    } catch (e) {
      Alert.alert('Could not save', String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const shareImage = async () => {
    setBusy('share');
    try {
      const base64 = await exportPng();
      await shareQrImage(base64);
    } catch (e) {
      Alert.alert('Could not share', String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Make QR code" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Text</Text>
        <TextInput
          value={input}
          onChangeText={(value) => {
            setInput(value);
            if (error) setError(null);
          }}
          placeholder="Type or paste anything: a link, a note, a code"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          style={styles.input}
        />
        <Button label="Paste" icon="clipboard-outline" onPress={paste} style={styles.outlineButton} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Make QR code"
          icon="qr-code-outline"
          variant="solid"
          onPress={make}
          disabled={!input.trim()}
        />

        {text ? (
          <View style={styles.result}>
            <View style={styles.codeTile}>
              <QRCode
                value={text}
                size={230}
                ecl="M"
                quietZone={QUIET_ZONE}
                color="#000"
                backgroundColor="#fff"
                getRef={(c) => {
                  svgRef.current = c;
                }}
              />
            </View>

            <Text style={styles.label}>
              Encodes · {utf8Length(text)} of {MAX_QR_BYTES} bytes
            </Text>
            <Text selectable style={styles.encoded}>
              {text}
            </Text>

            <Button
              label="Save image"
              icon="download-outline"
              variant="solid"
              onPress={saveImage}
              loading={busy === 'save'}
              disabled={busy !== null}
            />

            <View style={styles.row}>
              <Button
                label="Share QR"
                icon="share-outline"
                onPress={shareImage}
                loading={busy === 'share'}
                disabled={busy !== null}
                style={styles.flex}
              />
              <Button
                label={copied ? 'Copied' : 'Copy text'}
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={copyText}
                disabled={busy !== null}
                style={styles.flex}
              />
            </View>

            <Button label="New code" icon="create-outline" variant="ghost" onPress={newCode} />
          </View>
        ) : null}
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
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    padding: 14,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
  },
  result: {
    gap: 14,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 20,
  },
  // QR codes need dark-on-light to scan, so the code sits on a white square.
  // The quiet zone inside the code provides the white margin.
  codeTile: {
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  encoded: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});
