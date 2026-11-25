import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { fromBase64, fromUrl, toBase64, toUrl } from '../lib/encoding';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const FORMATS = [
  { value: 'base64', label: 'Base64' },
  { value: 'url', label: 'URL' },
];

const DIRECTIONS = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
];

const CONVERT = {
  base64: { encode: toBase64, decode: fromBase64 },
  url: { encode: toUrl, decode: fromUrl },
};

const NOTES = {
  base64: 'Base64 turns text into letters, digits, + and /. Accents and emoji are handled as UTF-8.',
  url: 'URL encoding escapes spaces and symbols, so a space becomes %20.',
};

// Base64 and URL encoding, in both directions. Nothing is sent anywhere.
export default function EncodingScreen() {
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState('base64');
  const [direction, setDirection] = useState('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  let output = '';
  let error = null;
  if (input !== '') {
    try {
      output = CONVERT[format][direction](input);
    } catch (e) {
      error = e.message;
    }
  }
  const ready = input !== '' && !error;

  const changeInput = (value) => {
    setInput(value);
    setCopied(false);
  };
  const changeFormat = (value) => {
    setFormat(value);
    setCopied(false);
  };
  const changeDirection = (value) => {
    setDirection(value);
    setCopied(false);
  };
  const copy = async () => {
    await Clipboard.setStringAsync(output);
    setCopied(true);
  };
  // Feeds the result back in and flips the direction, to check a round trip.
  const useAsInput = () => {
    setInput(output);
    setDirection(direction === 'encode' ? 'decode' : 'encode');
    setCopied(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Base64 and URL" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={FORMATS} value={format} onChange={changeFormat} />
        <Segmented options={DIRECTIONS} value={direction} onChange={changeDirection} />
        <Text style={styles.hint}>{NOTES[format]}</Text>

        <Text style={styles.label}>{direction === 'encode' ? 'Text' : 'Encoded text'}</Text>
        <TextInput
          value={input}
          onChangeText={changeInput}
          placeholder={direction === 'encode' ? 'Type or paste text' : 'Paste encoded text'}
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Input"
          style={[styles.area, styles.mono]}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {ready ? (
          <>
            <Text style={styles.label}>{direction === 'encode' ? 'Encoded' : 'Text'}</Text>
            <View style={styles.result}>
              <Text style={[styles.resultText, styles.mono]} selectable>
                {output}
              </Text>
            </View>
            <Button label={copied ? 'Copied' : 'Copy result'} icon="copy-outline" onPress={copy} disabled={copied} />
            <Button
              label={direction === 'encode' ? 'Decode the result' : 'Encode the result'}
              icon="swap-vertical-outline"
              onPress={useAsInput}
            />
          </>
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
  mono: {
    fontFamily: MONO,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  area: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  resultText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
