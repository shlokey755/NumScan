import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { runRegex } from '../lib/regexTester';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const FLAGS = [
  { key: 'i', hint: 'ignore case' },
  { key: 'm', hint: '^ and $ per line' },
  { key: 's', hint: 'dot matches newline' },
];

// Shows a captured value. An unmatched optional group is undefined; an empty match is ''.
const show = (value) => {
  if (value === undefined) return '(no match)';
  if (value === '') return '(empty)';
  return value;
};

// Tests a pattern against text and lists each match, with its groups.
export default function RegexScreen() {
  const insets = useSafeAreaInsets();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ i: false, m: false, s: false });
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const flagString = FLAGS.filter((f) => flags[f.key]).map((f) => f.key).join('');
  const result = useMemo(() => runRegex(pattern, flagString, text), [pattern, flagString, text]);
  const hasPattern = pattern.length > 0;

  const changePattern = (value) => {
    setPattern(value);
    setCopied(false);
  };
  const changeText = (value) => {
    setText(value);
    setCopied(false);
  };
  const toggleFlag = (key) => {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
    setCopied(false);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(result.matches.map((m) => m.match).join('\n'));
    setCopied(true);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Regex tester" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>JavaScript pattern syntax. Type the pattern without the slashes.</Text>

        <Text style={styles.label}>Pattern</Text>
        <TextInput
          value={pattern}
          onChangeText={changePattern}
          placeholder="\d{3}-\d{4}"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Pattern"
          style={[styles.input, styles.mono]}
        />

        <View style={styles.flags}>
          {FLAGS.map((flag) => {
            const on = flags[flag.key];
            return (
              <Pressable
                key={flag.key}
                onPress={() => toggleFlag(flag.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Flag ${flag.key}, ${flag.hint}`}
                style={[styles.flag, on && styles.flagOn]}
              >
                <Text style={[styles.flagKey, on && styles.inverse, styles.mono]}>{flag.key}</Text>
                <Text style={[styles.flagHint, on && styles.inverse]}>{flag.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Text to test</Text>
        <TextInput
          value={text}
          onChangeText={changeText}
          placeholder="Paste the text to search"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Text to test"
          style={[styles.area, styles.mono]}
        />

        {!hasPattern ? (
          <Text style={styles.hint}>Type a pattern above. Flags change how it matches.</Text>
        ) : null}
        {result.error ? <Text style={styles.error}>{result.error}</Text> : null}
        {hasPattern && !result.error && !text ? (
          <Text style={styles.hint}>Add some text to test the pattern against.</Text>
        ) : null}

        {hasPattern && !result.error && text ? (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryValue}>
                {result.total} {result.total === 1 ? 'match' : 'matches'}
              </Text>
              {result.total > result.matches.length ? (
                <Text style={styles.hint}>Showing the first {result.matches.length}.</Text>
              ) : null}
            </View>

            {result.total > 0 ? (
              <Button
                label={copied ? 'Copied' : 'Copy matches'}
                icon="copy-outline"
                onPress={copy}
                disabled={copied}
              />
            ) : null}

            {result.matches.map((m, i) => (
              <View key={`${m.index}-${i}`} style={styles.match}>
                <Text style={styles.meta}>
                  #{i + 1} · position {m.index}
                </Text>
                <Text style={[styles.matchText, styles.mono]} selectable>
                  {show(m.match)}
                </Text>
                {m.groups.map((group, g) => (
                  <Text key={`g${g}`} style={[styles.group, styles.mono]}>
                    group {g + 1}: {show(group)}
                  </Text>
                ))}
                {Object.entries(m.named).map(([name, value]) => (
                  <Text key={name} style={[styles.group, styles.mono]}>
                    {name}: {show(value)}
                  </Text>
                ))}
              </View>
            ))}
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
  inverse: {
    color: colors.inverse,
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
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
  },
  area: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
  },
  flags: {
    flexDirection: 'row',
    gap: 8,
  },
  flag: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  flagOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  flagKey: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  flagHint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  error: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: colors.text,
    padding: 12,
  },
  summary: {
    gap: 4,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  match: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  matchText: {
    color: colors.text,
    fontSize: 16,
  },
  group: {
    color: colors.muted,
    fontSize: 13,
  },
});
