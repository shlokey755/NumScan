import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { bitwise, groupBinary, parseInBase, toBases, toTwosComplement } from '../lib/numberBases';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const BASE_OPTIONS = [
  { value: 2, label: 'Binary 2' },
  { value: 8, label: 'Octal 8' },
  { value: 10, label: 'Decimal 10' },
  { value: 16, label: 'Hex 16' },
];

const WIDTH_OPTIONS = [8, 16, 32, 64].map((bits) => ({ value: bits, label: String(bits) }));

// Reads the typed number. Returns null when the box is blank, { value } or { error }.
function readNumber(text, base) {
  if (text.trim() === '') return null;
  try {
    return { value: parseInBase(text, base) };
  } catch (error) {
    return { error: error.message };
  }
}

// Runs a builder and turns a thrown message into an error view, so nothing throws on screen.
function tryView(build) {
  try {
    return { rows: build() };
  } catch (error) {
    return { error: error.message };
  }
}

function baseView(entry) {
  if (!entry) return { hint: 'Type a number to see it in every base.' };
  if (entry.error) return { error: entry.error };
  const { binary, octal, decimal, hex } = toBases(entry.value);
  return {
    rows: [
      { label: 'Binary', value: binary },
      { label: 'Octal', value: octal },
      { label: 'Decimal', value: decimal },
      { label: 'Hex', value: hex },
    ],
  };
}

// The two's-complement pattern in a width, shown as grouped binary and as hex.
function widthView(entry, bits) {
  if (!entry) return { hint: 'Type a number first.' };
  if (entry.error) return { error: entry.error };
  return tryView(() => {
    const pattern = toTwosComplement(entry.value, bits);
    return [
      { label: 'Binary', value: groupBinary(pattern.toString(2).padStart(bits, '0')) },
      { label: 'Hex', value: pattern.toString(16).toUpperCase().padStart(bits / 4, '0') },
    ];
  });
}

// AND, OR and XOR of the two numbers in a width. Each result shows hex, then binary.
function bitwiseView(first, second, bits) {
  if (!first || !second) return { hint: 'Type a second number to combine it with the first.' };
  if (first.error || second.error) return { error: first.error ?? second.error };
  return tryView(() =>
    ['AND', 'OR', 'XOR'].map((op) => {
      const result = bitwise(first.value, second.value, op, bits);
      return {
        label: op,
        value: result.toString(16).toUpperCase().padStart(bits / 4, '0'),
        sub: groupBinary(result.toString(2).padStart(bits, '0')),
      };
    }),
  );
}

// Labelled values, one under another. `sub` is an extra muted line under a value.
function Lines({ rows }) {
  return (
    <View style={styles.output}>
      {rows.map((row) => (
        <View key={row.label} style={styles.line}>
          <Text style={styles.lineLabel}>{row.label}</Text>
          <Text style={styles.lineValue} selectable>
            {row.value}
          </Text>
          {row.sub ? (
            <Text style={styles.lineSub} selectable>
              {row.sub}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// Shows a section's result: its rows, a muted error, or a muted hint.
function Body({ view }) {
  if (view.error) return <Text style={styles.note}>{view.error}</Text>;
  if (view.rows) return <Lines rows={view.rows} />;
  return <Text style={styles.note}>{view.hint}</Text>;
}

// Converts a number between binary, octal, decimal and hex. Shows two's-complement
// patterns for a bit width, and AND, OR and XOR. Results update as you type.
// Nothing is saved or sent anywhere.
export default function NumberBasesScreen() {
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState(10);
  const [text, setText] = useState('');
  const [width, setWidth] = useState(8);
  const [second, setSecond] = useState('');

  const first = readNumber(text, base);
  const other = readNumber(second, base);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Number bases" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Input base</Text>
        <Segmented options={BASE_OPTIONS} value={base} onChange={setBase} />
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType={base === 16 ? 'default' : 'numbers-and-punctuation'}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Type a number"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Number"
        />
        <Text style={styles.hint}>Spaces and underscores are ignored. A leading minus is allowed.</Text>

        <Text style={styles.heading}>In every base</Text>
        <Body view={baseView(first)} />

        <Text style={styles.heading}>Bit width</Text>
        <Segmented options={WIDTH_OPTIONS} value={width} onChange={setWidth} />
        <Text style={styles.hint}>Two's-complement pattern for this width.</Text>
        <Body view={widthView(first, width)} />

        <Text style={styles.heading}>Bitwise</Text>
        <TextInput
          value={second}
          onChangeText={setSecond}
          keyboardType={base === 16 ? 'default' : 'numbers-and-punctuation'}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Second number, same base"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Second number"
        />
        <Body view={bitwiseView(first, other, width)} />
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
  heading: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontFamily: MONO,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  output: {
    gap: 2,
  },
  line: {
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lineLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  lineValue: {
    color: colors.text,
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '600',
  },
  lineSub: {
    color: colors.muted,
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 20,
  },
});
