import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors } from '../theme';
import { isUrl, normalizeUrl } from '../lib/text';

// Shown under the scanner once something has been read. A thin rule separates it
// from the camera; there is no card or background.
export default function ResultPanel({
  label,
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
    <View style={styles.panel}>
      <Text style={styles.label}>{label}</Text>
      {children ?? (
        <Text selectable style={styles.text}>
          {text}
        </Text>
      )}

      <Button
        label={copied ? 'Copied' : copyLabel}
        icon={copied ? 'checkmark' : 'copy-outline'}
        variant="solid"
        onPress={copy}
      />

      <View style={styles.row}>
        <Button label="Share" icon="share-outline" onPress={share} style={styles.flex} />
        {url ? (
          <Button label="Open link" icon="open-outline" onPress={open} style={styles.flex} />
        ) : null}
      </View>

      <Button label={dismissLabel} icon="refresh-outline" variant="ghost" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
    gap: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  text: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});
