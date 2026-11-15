import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { toQrLink } from '../lib/qr';
import { saveQrToPhotos, shareQrImage } from '../lib/qrImage';

const QUIET_ZONE = 16; // blank margin around the code, which scanners need
const EXPORT_SIZE = 1024; // size of the saved and shared PNG, in pixels

// Turns a link into a QR code. Save and Share send the code as an image,
// so the QR itself is what leaves the app.
export default function MakeQrScreen() {
  const insets = useSafeAreaInsets();
  const svgRef = useRef(null);
  const [input, setInput] = useState('');
  const [link, setLink] = useState(null); // the link the QR code encodes
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'share' | null

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text?.trim()) {
        setError('Nothing to paste. Copy a link first.');
        return;
      }
      setInput(text.trim());
      setError(null);
    } catch (e) {
      Alert.alert('Paste failed', String(e?.message ?? e));
    }
  };

  const make = () => {
    const result = toQrLink(input);
    if (result.error) {
      setLink(null);
      setError(result.error);
      return;
    }
    setError(null);
    setCopied(false);
    setLink(result.link);
  };

  const newLink = () => {
    setLink(null);
    setError(null);
    setCopied(false);
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(link);
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
        <Text style={styles.label}>Link</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (error) setError(null);
            }}
            onSubmitEditing={make}
            placeholder="https://example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="url"
            returnKeyType="done"
            style={styles.input}
          />
          <Button label="Paste" icon="clipboard-outline" onPress={paste} style={styles.pasteButton} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Make QR code"
          icon="qr-code-outline"
          variant="solid"
          onPress={make}
          disabled={!input.trim()}
        />

        {link ? (
          <View style={styles.result}>
            <View style={styles.codeTile}>
              <QRCode
                value={link}
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

            <Text style={styles.label}>Opens</Text>
            <Text selectable style={styles.link}>
              {link}
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
                label={copied ? 'Copied' : 'Copy link'}
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={copyLink}
                disabled={busy !== null}
                style={styles.flex}
              />
            </View>

            <Button label="New link" icon="create-outline" variant="ghost" onPress={newLink} />
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
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  pasteButton: {
    minWidth: 96,
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
  link: {
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
