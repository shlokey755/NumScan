import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { toQrLink } from '../lib/qr';

// Turns a link into a QR code. Scanning it with the QR screen, or any camera app,
// opens the link.
export default function MakeQrScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [link, setLink] = useState(null); // the link the QR code encodes
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const shareLink = async () => {
    try {
      await Share.share({ message: link });
    } catch (e) {
      Alert.alert('Share failed', String(e?.message ?? e));
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
              <QRCode value={link} size={230} ecl="M" color="#000" backgroundColor="#fff" />
            </View>

            <Text style={styles.label}>Opens</Text>
            <Text selectable style={styles.link}>
              {link}
            </Text>

            <View style={styles.row}>
              <Button
                label={copied ? 'Copied' : 'Copy link'}
                icon={copied ? 'checkmark' : 'copy-outline'}
                onPress={copyLink}
                style={styles.flex}
              />
              <Button label="Share" icon="share-outline" onPress={shareLink} style={styles.flex} />
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
  codeTile: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 16,
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
