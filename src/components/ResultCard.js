import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';
import ActionButton from './ActionButton';
import { isUrl, normalizeUrl } from '../lib/text';

export default function ResultCard({
  title,
  text,
  copyLabel = 'Copy',
  dismissLabel = 'Scan again',
  onDismiss,
  children,
}) {
  const [copied, setCopied] = useState(false);
  const url = isUrl(text) ? normalizeUrl(text) : null;

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
    } catch (error) {
      Alert.alert('Copy failed', String(error?.message ?? error));
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: text });
    } catch (error) {
      Alert.alert('Share failed', String(error?.message ?? error));
    }
  };

  const open = async () => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', url);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children ?? <Text selectable style={styles.text}>{text}</Text>}
      <View style={styles.row}>
        <ActionButton label={copied ? 'Copied' : copyLabel} onPress={copy} primary />
        <ActionButton label="Share" onPress={share} />
        {url ? <ActionButton label="Open link" onPress={open} /> : null}
        <ActionButton label={dismissLabel} onPress={onDismiss} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#00FF66',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  text: {
    color: '#fff',
    fontSize: 17,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
