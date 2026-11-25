import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { truthTable } from '../lib/truthTable';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

// Tap keys add text to the expression. CLEAR empties it.
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', '&', '|', '^', '!', '(', ')', '1', '0'];

// A logic table: every combination of the variables, and the result for each.
export default function TruthTableScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  let table = null;
  let error = null;
  if (text.trim()) {
    try {
      table = truthTable(text);
    } catch (e) {
      error = e.message;
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Truth table" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          & means AND, | means OR, ^ means XOR, ! means NOT. Use brackets to group. Letters are variables.
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="A & (B | !C)"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Logic expression"
          style={styles.input}
        />

        <View style={styles.keys}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setText((t) => t + key)}
              accessibilityRole="button"
              accessibilityLabel={key}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            style={({ pressed }) => [styles.key, styles.clear, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyText}>CLEAR</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {table ? (
          <>
            <Text style={styles.meta}>
              {table.rows.length} rows · {table.variables.length} variable{table.variables.length === 1 ? '' : 's'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={[styles.line, styles.headLine]}>
                  {[...table.variables, 'Result'].map((heading) => (
                    <Text key={heading} style={[styles.cell, styles.head]}>
                      {heading}
                    </Text>
                  ))}
                </View>
                {table.rows.map((row, index) => (
                  <View key={index} style={styles.line}>
                    {table.variables.map((name) => (
                      <Text key={name} style={styles.cell}>
                        {row.values[name] ? '1' : '0'}
                      </Text>
                    ))}
                    <Text style={[styles.cell, styles.result]}>{row.result ? '1' : '0'}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
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
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 14,
    fontFamily: MONO,
  },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  key: {
    minWidth: 46,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  keyPressed: {
    backgroundColor: colors.line,
  },
  clear: {
    flexGrow: 1,
  },
  keyText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: MONO,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  line: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headLine: {
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },
  cell: {
    width: 64,
    paddingVertical: 8,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontFamily: MONO,
  },
  head: {
    fontWeight: '700',
  },
  result: {
    fontWeight: '700',
  },
});
