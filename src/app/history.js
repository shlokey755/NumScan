import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader, { IconButton } from '../components/ScreenHeader';
import Toast from '../components/Toast';
import useCopyToast from '../components/useCopyToast';
import { colors } from '../theme';
import { clearHistory, deleteHistoryEntry, getHistory } from '../lib/history';

function formatTime(at) {
  return new Date(at).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The last 50 things NumScan copied. Tap a row to copy it again.
export default function HistoryScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(null);
  const { toast, copy } = useCopyToast();

  // Reloads each time the screen is shown, so new scans appear straight away.
  useEffect(() => {
    if (!isFocused) return;
    getHistory()
      .then((list) => {
        setEntries(list);
        setMessage(null);
      })
      .catch((error) => {
        console.error('History Error:', error);
        setMessage('History could not be loaded on this build.');
      })
      .finally(() => setLoaded(true));
  }, [isFocused]);

  const remove = async (id) => {
    try {
      setEntries(await deleteHistoryEntry(id));
    } catch (error) {
      setMessage('That item could not be deleted. Try again.');
    }
  };

  const confirmClear = () => {
    Alert.alert('Clear history?', 'This removes every saved copy from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            setEntries(await clearHistory());
          } catch (error) {
            setMessage('History could not be cleared. Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="History"
        right={
          entries.length > 0 ? (
            <IconButton name="trash-outline" label="Clear history" onPress={confirmClear} />
          ) : null
        }
      />

      <View style={styles.body}>
        <Toast toast={toast} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {loaded && entries.length === 0 ? (
          <Text style={styles.empty}>
            Nothing copied yet. Scans and captures appear here, up to the last 50.
          </Text>
        ) : null}

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() => copy(item.text, 'Copied to clipboard')}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
              >
                <Text style={styles.label}>
                  {item.label} · {formatTime(item.at)}
                </Text>
                <Text style={styles.text} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => remove(item.id)}
                accessibilityLabel="Delete"
                hitSlop={10}
                style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.muted} />
              </Pressable>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  main: {
    flex: 1,
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  delete: {
    padding: 8,
  },
});
