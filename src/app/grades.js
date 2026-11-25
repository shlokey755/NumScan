import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { gpa, neededScore, weightedAverage } from '../lib/grades';

const TABS = [
  { value: 'average', label: 'Average' },
  { value: 'needed', label: 'Needed' },
  { value: 'gpa', label: 'GPA' },
];

// Converts a typed value to a number. An empty field becomes null and is left out.
const toNumber = (text) => (text.trim() === '' ? null : Number(text));

// Editable rows of number fields, with add and remove.
function RowEditor({ rows, fields, onChange, onAdd, onRemove }) {
  return (
    <View style={styles.rows}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {fields.map((field) => (
            <TextInput
              key={field.key}
              value={row[field.key]}
              onChangeText={(text) => onChange(index, field.key, text)}
              placeholder={field.label}
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel={field.label}
              style={[styles.input, styles.inputGrow]}
            />
          ))}
          <Pressable
            onPress={() => onRemove(index)}
            accessibilityRole="button"
            accessibilityLabel="Remove row"
            hitSlop={8}
            style={styles.remove}
          >
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        </View>
      ))}
      <Button label="Add row" icon="add-outline" onPress={onAdd} />
    </View>
  );
}

// Weighted averages, the mark needed on what is left, and GPA. Everything runs on the phone.
export default function GradesScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('average');

  // Average: score and weight, both in %.
  const [averageRows, setAverageRows] = useState([{ score: '', weight: '' }]);

  // Needed: work already done, the target, and the weight still to come.
  const [doneRows, setDoneRows] = useState([{ score: '', weight: '' }]);
  const [target, setTarget] = useState('');
  const [remaining, setRemaining] = useState('');

  // GPA: grade points and credits.
  const [gpaRows, setGpaRows] = useState([{ points: '', credits: '' }]);

  const edit = (setRows) => (index, key, text) =>
    setRows((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: text } : row)));
  const remove = (setRows) => (index) =>
    setRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  // Results for the Average tab.
  let average = null;
  let averageError = null;
  try {
    const rows = averageRows
      .filter((r) => r.score.trim() || r.weight.trim())
      .map((r) => ({ score: toNumber(r.score), weight: toNumber(r.weight) }));
    if (rows.length > 0) average = weightedAverage(rows);
  } catch (e) {
    averageError = e.message;
  }

  // Results for the Needed tab.
  let needed = null;
  let neededError = null;
  try {
    const done = doneRows
      .filter((r) => r.score.trim() || r.weight.trim())
      .map((r) => ({ score: toNumber(r.score), weight: toNumber(r.weight) }));
    if (target.trim() && remaining.trim() && done.length > 0) {
      needed = neededScore({
        done,
        targetPercent: toNumber(target),
        remainingWeight: toNumber(remaining),
      });
    }
  } catch (e) {
    neededError = e.message;
  }

  // Results for the GPA tab.
  let gpaResult = null;
  let gpaError = null;
  try {
    const rows = gpaRows
      .filter((r) => r.points.trim() || r.credits.trim())
      .map((r) => ({ points: toNumber(r.points), credits: toNumber(r.credits) }));
    if (rows.length > 0) gpaResult = gpa(rows);
  } catch (e) {
    gpaError = e.message;
  }

  const totalWeight = averageRows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Grades and GPA" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={TABS} value={tab} onChange={setTab} />

        {tab === 'average' ? (
          <>
            <Text style={styles.hint}>Score and weight are both in %. For example, a 60% exam worth 40% of the course.</Text>
            <RowEditor
              rows={averageRows}
              fields={[
                { key: 'score', label: 'Score %' },
                { key: 'weight', label: 'Weight %' },
              ]}
              onChange={edit(setAverageRows)}
              onAdd={() => setAverageRows((rows) => [...rows, { score: '', weight: '' }])}
              onRemove={remove(setAverageRows)}
            />
            {averageError ? <Text style={styles.error}>{averageError}</Text> : null}
            {average ? (
              <View style={styles.result}>
                <Text style={styles.resultValue}>{average.average.toFixed(2)}%</Text>
                <Text style={styles.resultLabel}>weighted average</Text>
                {totalWeight !== 100 ? (
                  <Text style={styles.hint}>Total weight is {totalWeight}%. A full course usually adds to 100%.</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {tab === 'needed' ? (
          <>
            <Text style={styles.hint}>Add the work you have done. Then set the target and the weight still to come.</Text>
            <RowEditor
              rows={doneRows}
              fields={[
                { key: 'score', label: 'Score %' },
                { key: 'weight', label: 'Weight %' },
              ]}
              onChange={edit(setDoneRows)}
              onAdd={() => setDoneRows((rows) => [...rows, { score: '', weight: '' }])}
              onRemove={remove(setDoneRows)}
            />
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="Target course %, such as 70"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel="Target percentage"
              style={styles.input}
            />
            <TextInput
              value={remaining}
              onChangeText={setRemaining}
              placeholder="Weight still to come %, such as 60"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel="Remaining weight percentage"
              style={styles.input}
            />
            {neededError ? <Text style={styles.error}>{neededError}</Text> : null}
            {needed ? (
              <View style={styles.result}>
                {needed.possible ? (
                  <>
                    <Text style={styles.resultValue}>{needed.required.toFixed(2)}%</Text>
                    <Text style={styles.resultLabel}>needed on the remaining work</Text>
                  </>
                ) : (
                  <Text style={styles.error}>
                    Not possible. You would need {needed.required.toFixed(2)}% on the remaining work.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {tab === 'gpa' ? (
          <>
            <Text style={styles.hint}>
              Enter grade points the way your college uses them, for example on a 10-point or a 4-point scale.
            </Text>
            <RowEditor
              rows={gpaRows}
              fields={[
                { key: 'points', label: 'Grade points' },
                { key: 'credits', label: 'Credits' },
              ]}
              onChange={edit(setGpaRows)}
              onAdd={() => setGpaRows((rows) => [...rows, { points: '', credits: '' }])}
              onRemove={remove(setGpaRows)}
            />
            {gpaError ? <Text style={styles.error}>{gpaError}</Text> : null}
            {gpaResult ? (
              <View style={styles.result}>
                <Text style={styles.resultValue}>{gpaResult.gpa.toFixed(2)}</Text>
                <Text style={styles.resultLabel}>GPA over {gpaResult.credits} credits</Text>
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
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputGrow: {
    flex: 1,
  },
  remove: {
    width: 36,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.muted,
    fontSize: 24,
  },
  result: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 4,
  },
  resultValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
