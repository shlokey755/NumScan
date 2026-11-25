import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { percentChange, percentOf, whatPercent } from '../lib/percentCalc';

const MODES = [
  { value: 'of', label: '% of' },
  { value: 'part', label: 'Part of whole' },
  { value: 'change', label: '% change' },
];

// The two boxes for each mode, with example values shown as placeholders.
const FIELDS = {
  of: { first: 'Percent', second: 'Of this number', examples: ['15', '80'] },
  part: { first: 'Part', second: 'Whole', examples: ['12', '80'] },
  change: { first: 'From', second: 'To', examples: ['80', '100'] },
};

// Reads a typed number. A blank box gives null. Commas are ignored.
function readNumber(text) {
  if (text.trim() === '') return null;
  const value = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(value)) throw new Error('Type a number, such as 12 or 3.5.');
  return value;
}

// The answer for the chosen mode: a headline, and a sentence that states it in full.
function answer(mode, a, b) {
  if (mode === 'of') {
    const r = percentOf(a, b);
    return { headline: `${r}`, sentence: `${a}% of ${b} is ${r}` };
  }
  if (mode === 'part') {
    const r = whatPercent(a, b);
    return { headline: `${r}%`, sentence: `${a} is ${r}% of ${b}` };
  }
  const r = percentChange(a, b);
  if (r === 0) return { headline: '0%', sentence: `No change from ${a} to ${b}` };
  return {
    headline: `${r > 0 ? '+' : ''}${r}%`,
    sentence: `From ${a} to ${b} is a ${r > 0 ? 'rise' : 'fall'} of ${Math.abs(r)}%`,
  };
}

// Percent of a number, what percent one number is of another, and percent change.
export default function PercentScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('of');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const fields = FIELDS[mode];

  let result = null;
  let error = null;
  try {
    const a = readNumber(first);
    const b = readNumber(second);
    if (a !== null && b !== null) result = answer(mode, a, b);
  } catch (e) {
    error = e.message;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Percentages" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={MODES} value={mode} onChange={setMode} />

        <Text style={styles.label}>{fields.first}</Text>
        <TextInput
          value={first}
          onChangeText={setFirst}
          placeholder={fields.examples[0]}
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel={fields.first}
          style={styles.input}
        />

        <Text style={styles.label}>{fields.second}</Text>
        <TextInput
          value={second}
          onChangeText={setSecond}
          placeholder={fields.examples[1]}
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel={fields.second}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {result ? (
          <View style={styles.result}>
            <Text style={styles.headline} selectable>
              {result.headline}
            </Text>
            <Text style={styles.sentence} selectable>
              {result.sentence}
            </Text>
          </View>
        ) : null}
        {!result && !error ? <Text style={styles.hint}>Fill in both boxes to see the answer.</Text> : null}
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
  result: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
  },
  headline: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
  },
  sentence: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
