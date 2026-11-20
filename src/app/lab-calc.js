import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import {
  convertUnits,
  linearFit,
  parseNumbers,
  percentError,
  solveDilution,
  summarize,
} from '../lib/labcalc';

const TABS = [
  { value: 'convert', label: 'Convert' },
  { value: 'dilution', label: 'Dilution' },
  { value: 'error', label: 'Error' },
  { value: 'stats', label: 'Stats' },
];

const UNITS =
  'Length: m cm mm um nm km in ft · Mass: kg g mg ug lb oz · Volume: L mL uL · Temperature: C F K';

// Blank means "not given". Anything else is read as a number, NaN if it is not one.
function numberOrNull(text) {
  return text.trim() === '' ? null : Number(text);
}

// Four significant digits for display.
function fmt(value) {
  if (value === null || value === undefined) return '—';
  return Number.isFinite(value) ? value.toPrecision(4) : String(value);
}

// Each view function returns { lines: [{ label, value }], notes: [string] }.
// Errors from the lib become notes, so a bad input shows a message and never throws.
function convertView(valueText, from, to) {
  const f = from.trim();
  const t = to.trim();
  if (!valueText.trim() || !f || !t) return { notes: ['Enter a value and both units.'] };
  try {
    const result = convertUnits(Number(valueText), f, t);
    return { lines: [{ label: 'Result', value: `${fmt(result)} ${t}` }] };
  } catch (error) {
    return { notes: [error.message] };
  }
}

function dilutionView(fields) {
  const input = {
    c1: numberOrNull(fields.c1),
    v1: numberOrNull(fields.v1),
    c2: numberOrNull(fields.c2),
    v2: numberOrNull(fields.v2),
  };
  if (Object.values(input).every((v) => v === null)) {
    return { notes: ['Fill in three fields. Leave the one you want blank.'] };
  }
  try {
    const { field, value } = solveDilution(input);
    return { lines: [{ label: `Solved for ${field}`, value: fmt(value) }] };
  } catch (error) {
    return { notes: [error.message] };
  }
}

function errorView(measured, accepted) {
  if (!measured.trim() || !accepted.trim()) {
    return { notes: ['Enter the measured and the accepted value.'] };
  }
  try {
    const pct = percentError(Number(measured), Number(accepted));
    return { lines: [{ label: 'Percent error', value: `${fmt(pct)}%` }] };
  } catch (error) {
    return { notes: [error.message] };
  }
}

function statsView(text) {
  const { values, bad } = parseNumbers(text);
  const notes = bad.length > 0 ? [`Not read: ${bad.join(', ')}`] : [];
  if (values.length === 0) {
    if (bad.length === 0) {
      notes.push('Enter numbers. Spaces, commas, semicolons or new lines separate them.');
    }
    return { notes };
  }
  const s = summarize(values);
  if (s.n < 2) notes.push('SD and SEM need at least two values.');
  return {
    lines: [
      { label: 'n', value: String(s.n) },
      { label: 'Mean', value: fmt(s.mean) },
      { label: 'Median', value: fmt(s.median) },
      { label: 'Min', value: fmt(s.min) },
      { label: 'Max', value: fmt(s.max) },
      { label: 'Sample SD', value: fmt(s.sampleSd) },
      { label: 'SEM', value: fmt(s.sem) },
    ],
    notes,
  };
}

function fitView(xText, yText) {
  if (!xText.trim() || !yText.trim()) {
    return { notes: ['Enter both X and Y to fit a line.'] };
  }
  const x = parseNumbers(xText);
  const y = parseNumbers(yText);
  const notes = [];
  if (x.bad.length > 0) notes.push(`X not read: ${x.bad.join(', ')}`);
  if (y.bad.length > 0) notes.push(`Y not read: ${y.bad.join(', ')}`);
  if (x.values.length !== y.values.length) {
    notes.push(`X has ${x.values.length} numbers and Y has ${y.values.length}. They must match.`);
    return { notes };
  }
  try {
    const fit = linearFit(x.values, y.values);
    return {
      lines: [
        { label: 'Slope', value: fmt(fit.slope) },
        { label: 'Intercept', value: fmt(fit.intercept) },
        { label: 'r²', value: fmt(fit.r2) },
      ],
      notes,
    };
  } catch (error) {
    return { notes: [...notes, error.message] };
  }
}

// A labelled input. `area` makes it a multiline box.
function Field({ label, area = false, style, ...input }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        multiline={area}
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, area && styles.area]}
        {...input}
      />
    </View>
  );
}

// Result lines with a rule between them, then any notes or error messages.
function Output({ view }) {
  const { lines = [], notes = [] } = view;
  return (
    <View style={styles.output}>
      {lines.map((line) => (
        <View key={line.label} style={styles.line}>
          <Text style={styles.lineLabel}>{line.label}</Text>
          <Text style={styles.lineValue}>{line.value}</Text>
        </View>
      ))}
      {notes.map((note) => (
        <Text key={note} style={styles.note}>
          {note}
        </Text>
      ))}
    </View>
  );
}

// Unit conversion, dilution, percent error and descriptive statistics for the bench.
// Results update as you type. Nothing is saved or sent anywhere.
export default function LabCalcScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('convert');

  const [value, setValue] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [dilution, setDilution] = useState({ c1: '', v1: '', c2: '', v2: '' });
  const setDil = (key) => (text) => setDilution((d) => ({ ...d, [key]: text }));

  const [measured, setMeasured] = useState('');
  const [accepted, setAccepted] = useState('');

  const [values, setValues] = useState('');
  const [xs, setXs] = useState('');
  const [ys, setYs] = useState('');

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Lab calculator" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'convert' ? (
          <>
            <Field
              label="Value"
              value={value}
              onChangeText={setValue}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 2.5"
            />
            <View style={styles.row}>
              <Field label="From" value={from} onChangeText={setFrom} placeholder="m" style={styles.flex} />
              <Field label="To" value={to} onChangeText={setTo} placeholder="ft" style={styles.flex} />
            </View>
            <Text style={styles.hint}>{UNITS}</Text>
            <Output view={convertView(value, from, to)} />
          </>
        ) : null}

        {tab === 'dilution' ? (
          <>
            <Text style={styles.hint}>Fill in three fields. Leave the one you want blank.</Text>
            <View style={styles.row}>
              <Field label="C1" value={dilution.c1} onChangeText={setDil('c1')} keyboardType="numbers-and-punctuation" style={styles.flex} />
              <Field label="V1" value={dilution.v1} onChangeText={setDil('v1')} keyboardType="numbers-and-punctuation" style={styles.flex} />
            </View>
            <View style={styles.row}>
              <Field label="C2" value={dilution.c2} onChangeText={setDil('c2')} keyboardType="numbers-and-punctuation" style={styles.flex} />
              <Field label="V2" value={dilution.v2} onChangeText={setDil('v2')} keyboardType="numbers-and-punctuation" style={styles.flex} />
            </View>
            <Output view={dilutionView(dilution)} />
          </>
        ) : null}

        {tab === 'error' ? (
          <>
            <Field
              label="Measured"
              value={measured}
              onChangeText={setMeasured}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 9.8"
            />
            <Field
              label="Accepted"
              value={accepted}
              onChangeText={setAccepted}
              keyboardType="numbers-and-punctuation"
              placeholder="e.g. 10.0"
            />
            <Output view={errorView(measured, accepted)} />
          </>
        ) : null}

        {tab === 'stats' ? (
          <>
            <Field
              label="Values"
              area
              value={values}
              onChangeText={setValues}
              placeholder="4.1, 3.9 4.0"
            />
            <Output view={statsView(values)} />

            <Text style={styles.hint}>Optional: enter X and Y to fit a straight line.</Text>
            <Field label="X" area value={xs} onChangeText={setXs} placeholder="1, 2, 3" />
            <Field label="Y" area value={ys} onChangeText={setYs} placeholder="2.1, 3.9, 6.2" />
            <Output view={fitView(xs, ys)} />
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
  field: {
    gap: 6,
  },
  label: {
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
    fontSize: 16,
    paddingHorizontal: 14,
  },
  area: {
    minHeight: 120,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  output: {
    gap: 10,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
