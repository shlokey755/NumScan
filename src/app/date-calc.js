import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import {
  addDays,
  addWorkingDays,
  daysBetween,
  formatDate,
  parseDate,
  todayMs,
  toIso,
  workingDaysBetween,
} from '../lib/dateCalc';

const TABS = [
  { value: 'between', label: 'Days between' },
  { value: 'add', label: 'Add days' },
];

const MODES = [
  { value: 'calendar', label: 'Calendar days' },
  { value: 'working', label: 'Working days' },
];

// Due dates and deadlines. Dates are typed as 2026-03-31; "Today" fills the device's date.
export default function DateCalcScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('between');

  const [fromText, setFromText] = useState(() => toIso(todayMs()));
  const [toText, setToText] = useState('');

  const [startText, setStartText] = useState(() => toIso(todayMs()));
  const [amount, setAmount] = useState('14');
  const [mode, setMode] = useState('calendar');

  // Days between: calendar days, and working days (Mon to Fri) after the start date.
  let between = null;
  let betweenError = null;
  try {
    if (fromText.trim() && toText.trim()) {
      const a = parseDate(fromText);
      const b = parseDate(toText);
      between = { calendar: daysBetween(a, b), working: workingDaysBetween(a, b) };
    }
  } catch (e) {
    betweenError = e.message;
  }

  // Add days: move a date by a whole number of calendar or working days.
  let added = null;
  let addError = null;
  try {
    if (startText.trim() && amount.trim()) {
      const start = parseDate(startText);
      const n = Number(amount);
      if (!Number.isInteger(n)) throw new Error('Type a whole number of days, such as 14 or -7.');
      added = mode === 'working' ? addWorkingDays(start, n) : addDays(start, n);
    }
  } catch (e) {
    addError = e.message;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Date calculator" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'between' ? (
          <>
            <Text style={styles.label}>From</Text>
            <TextInput
              value={fromText}
              onChangeText={setFromText}
              placeholder="2026-03-31"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="From date"
              style={styles.input}
            />
            <Text style={styles.label}>To</Text>
            <TextInput
              value={toText}
              onChangeText={setToText}
              placeholder="2026-04-15"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="To date"
              style={styles.input}
            />
            <Button label="Use today as the To date" icon="today-outline" onPress={() => setToText(toIso(todayMs()))} />

            {betweenError ? <Text style={styles.error}>{betweenError}</Text> : null}
            {between ? (
              <View style={styles.result}>
                <Text style={styles.resultValue}>{between.calendar} calendar days</Text>
                <Text style={styles.resultLabel}>{between.working} working days (Mon to Fri, not counting the From date)</Text>
                {between.calendar < 0 ? (
                  <Text style={styles.hint}>The To date is earlier than the From date, so the numbers are negative.</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {tab === 'add' ? (
          <>
            <Text style={styles.label}>Start date</Text>
            <TextInput
              value={startText}
              onChangeText={setStartText}
              placeholder="2026-03-31"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Start date"
              style={styles.input}
            />
            <Text style={styles.label}>Days (use a minus sign to go back)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="14"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Number of days"
              style={styles.input}
            />
            <Segmented options={MODES} value={mode} onChange={setMode} />

            {addError ? <Text style={styles.error}>{addError}</Text> : null}
            {added !== null ? (
              <View style={styles.result}>
                <Text style={styles.resultValue}>{formatDate(added)}</Text>
                <Text style={styles.resultLabel}>
                  {mode === 'working' ? 'after working days only' : 'after calendar days'}
                </Text>
              </View>
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
    fontSize: 16,
    paddingHorizontal: 14,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 4,
  },
  resultValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
