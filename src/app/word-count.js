import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme';
import { pickAnyFiles } from '../lib/media';
import { readFileText } from '../lib/files';
import { textStats } from '../lib/wordCount';

// Counts words, characters, sentences and paragraphs. Handy for essays with a word limit.
export default function WordCountScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState(null);
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const stats = textStats(text);
  const goal = Number(target);
  const hasGoal = target.trim() !== '' && Number.isFinite(goal) && goal > 0;
  const progress = hasGoal ? Math.min(1, stats.words / goal) : 0;

  const chooseFile = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const [asset] = await pickAnyFiles();
      if (!asset) return;
      setText(await readFileText(asset.uri));
      setFileName(asset.name);
    } catch (error) {
      console.error('Word count Error:', error);
      setMessage(error?.message ?? 'That file could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    ['Words', stats.words],
    ['Characters, with spaces', stats.characters],
    ['Characters, no spaces', stats.charactersNoSpaces],
    ['Sentences', stats.sentences],
    ['Paragraphs', stats.paragraphs],
    ['Reading time', stats.words ? `about ${stats.readingMinutes} min` : '0 min'],
    ['Average word length', stats.words ? `${stats.averageWordLength.toFixed(1)} letters` : '0'],
  ];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Word counter" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>Paste your text, or choose a .txt or .md file. Nothing is uploaded.</Text>

        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setFileName(null);
          }}
          placeholder="Paste or type your text"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Text to count"
          style={styles.area}
        />

        <View style={styles.actions}>
          <View style={styles.grow}>
            <Button label="Choose a file" icon="folder-open-outline" onPress={chooseFile} loading={busy} disabled={busy} />
          </View>
          {text ? (
            <View style={styles.grow}>
              <Button
                label="Clear"
                icon="trash-outline"
                onPress={() => {
                  setText('');
                  setFileName(null);
                }}
              />
            </View>
          ) : null}
        </View>

        {fileName ? <Text style={styles.meta}>{fileName}</Text> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}

        <View style={styles.stats}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.statRow}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Word target (optional)</Text>
        <TextInput
          value={target}
          onChangeText={setTarget}
          placeholder="For example 1500"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          accessibilityLabel="Word target"
          style={styles.input}
        />
        {hasGoal ? (
          <View style={styles.goal}>
            <Text style={styles.meta}>
              {stats.words} of {goal} words
              {stats.words >= goal ? ' · target reached' : ` · ${goal - stats.words} to go`}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
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
  area: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    padding: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
  stats: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 15,
  },
  statValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
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
  goal: {
    gap: 8,
  },
  track: {
    height: 10,
    borderWidth: 1,
    borderColor: colors.text,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.text,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  error: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
