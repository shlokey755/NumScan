import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { CASE_STYLES, convertCase } from '../lib/textCase';

// Every style is shown at once, so the one you need is a tap away. Tap a row to copy it.
export default function TextCaseScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(null);

  const copy = async (style, output) => {
    await Clipboard.setStringAsync(output);
    setCopied(style);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Text case" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setCopied(null);
          }}
          placeholder="Type or paste text, such as a variable name"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Text to convert"
          style={styles.area}
        />

        {text === '' ? <Text style={styles.hint}>Every style updates as you type. Tap one to copy it.</Text> : null}

        {CASE_STYLES.map((style) => {
          const output = convertCase(text, style.value);
          return (
            <Pressable
              key={style.value}
              onPress={() => copy(style.value, output)}
              disabled={text === ''}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${style.label}`}
              style={({ pressed }) => [styles.row, pressed && text !== '' && styles.rowPressed]}
            >
              <View style={styles.head}>
                <Text style={styles.styleLabel}>{style.label}</Text>
                {copied === style.value ? <Text style={styles.copied}>Copied</Text> : null}
              </View>
              {text !== '' ? (
                <Text style={styles.output} numberOfLines={3}>
                  {output}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
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
    gap: 10,
  },
  area: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    padding: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  rowPressed: {
    backgroundColor: colors.line,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleLabel: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  copied: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  output: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
