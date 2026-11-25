import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import Segmented from '../components/Segmented';
import { colors } from '../theme';
import { evaluate, formatResult } from '../lib/scientificCalc';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const ANGLE = [
  { value: 'deg', label: 'DEG' },
  { value: 'rad', label: 'RAD' },
];

// Each key adds its text to the end. DEL removes the last character, CLEAR empties it.
const KEYS = [
  ['sin(', 'cos(', 'tan(', '^'],
  ['asin(', 'acos(', 'atan(', '!'],
  ['ln(', 'log(', 'sqrt(', 'abs('],
  ['pi', 'e', '(', ')'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', 'DEL', '+'],
];

export default function ScientificCalcScreen() {
  const insets = useSafeAreaInsets();
  const [expression, setExpression] = useState('');
  const [angle, setAngle] = useState('deg');
  const [copied, setCopied] = useState(false);

  let result = null;
  let error = null;
  if (expression.trim()) {
    try {
      result = formatResult(evaluate(expression, { angle }));
    } catch (e) {
      error = e.message;
    }
  }

  const changeExpression = (text) => {
    setExpression(text);
    setCopied(false);
  };

  const press = (key) => {
    if (key === 'DEL') changeExpression(expression.slice(0, -1));
    else changeExpression(expression + key);
  };

  const copy = async () => {
    await Clipboard.setStringAsync(result);
    setCopied(true);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Scientific calculator" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented options={ANGLE} value={angle} onChange={setAngle} />

        <TextInput
          value={expression}
          onChangeText={changeExpression}
          placeholder="Type, such as 2^3 + sin(30)"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Expression"
          style={styles.input}
        />

        <View style={styles.resultBox}>
          {result !== null ? (
            <Text style={styles.result} selectable>
              {result}
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!expression.trim() ? (
            <Text style={styles.hint}>Brackets group. ^ is a power. ! is a factorial. Angles are in {angle.toUpperCase()}.</Text>
          ) : null}
        </View>

        {result !== null ? (
          <Button
            label={copied ? 'Copied' : 'Copy result'}
            icon="copy-outline"
            onPress={copy}
            disabled={copied}
          />
        ) : null}

        <View style={styles.keypad}>
          {KEYS.map((row) => (
            <View key={row.join('|')} style={styles.row}>
              {row.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => press(key)}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Pressable
            onPress={() => changeExpression('')}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            style={({ pressed }) => [styles.key, styles.clear, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyText}>CLEAR</Text>
          </Pressable>
        </View>
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
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    fontFamily: MONO,
  },
  resultBox: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    justifyContent: 'center',
    gap: 6,
  },
  result: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: MONO,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  keypad: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: colors.line,
  },
  clear: {
    minHeight: 46,
  },
  keyText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: MONO,
  },
});
