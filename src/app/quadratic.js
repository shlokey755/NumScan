import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { solveQuadratic } from '../lib/quadratic';

const FIELDS = [
  { key: 'a', label: 'a, the number in front of x²' },
  { key: 'b', label: 'b, the number in front of x' },
  { key: 'c', label: 'c, the number on its own' },
];

// Reads a typed number. A blank box gives null.
function readNumber(text) {
  if (text.trim() === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error('Type a number, such as -3 or 2.5.');
  return value;
}

// A signed term for the equation preview: "− 3x" or "+ 2".
const term = (n, suffix) => (n < 0 ? `− ${Math.abs(n)}${suffix}` : `+ ${n}${suffix}`);

// The headline and note for each kind of answer.
function describe(solved) {
  const { roots } = solved;
  switch (solved.kind) {
    case 'two':
      return { headline: `x = ${roots[0]}  or  x = ${roots[1]}`, note: 'Two different real roots.' };
    case 'one':
      return { headline: `x = ${roots[0]}`, note: 'One repeated real root.' };
    case 'complex':
      return {
        headline: `x = ${roots[0].real} ± ${roots[0].imag}i`,
        note: 'No real roots. The two roots are complex.',
      };
    case 'linear':
      return { headline: `x = ${roots[0]}`, note: 'a is 0, so this is a linear equation, not a quadratic.' };
    case 'every':
      return { headline: 'Every x works', note: 'a, b and c are all 0.' };
    default:
      return { headline: 'No solution', note: 'With a and b at 0, the equation 0 = c is false when c is not 0.' };
  }
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

// Roots, vertex and discriminant of a x² + b x + c = 0. Results update as you type.
export default function QuadraticScreen() {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState({ a: '1', b: '-3', c: '2' });

  let result = null;
  let error = null;
  try {
    const a = readNumber(values.a);
    const b = readNumber(values.b);
    const c = readNumber(values.c);
    if (a !== null && b !== null && c !== null) {
      result = { a, b, c, solved: solveQuadratic(a, b, c) };
    }
  } catch (e) {
    error = e.message;
  }
  const text = result ? describe(result.solved) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Quadratic solver" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>Solves a x² + b x + c = 0. Type the three numbers.</Text>

        {FIELDS.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={values[field.key]}
              onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={field.label}
              style={styles.input}
            />
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <>
            <Text style={styles.equation} selectable>
              {`${result.a}x² ${term(result.b, 'x')} ${term(result.c, '')} = 0`}
            </Text>
            <View style={styles.result}>
              <Text style={styles.headline} selectable>
                {text.headline}
              </Text>
              <Text style={styles.note}>{text.note}</Text>
            </View>
            {result.solved.vertex ? (
              <Row label="Vertex (x, y)" value={`(${result.solved.vertex.x}, ${result.solved.vertex.y})`} />
            ) : null}
            {result.solved.discriminant !== undefined ? (
              <Row label="Discriminant, b² − 4ac" value={`${result.solved.discriminant}`} />
            ) : null}
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
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
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
  equation: {
    color: colors.muted,
    fontSize: 15,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
  },
  headline: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 15,
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
