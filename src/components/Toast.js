import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const SHOW_MS = 1800;

// Brief message shown over the top of the scan stage. `toast` is
// { id, message, icon? } or null. It hides itself, and a new toast replaces the old one.
export default function Toast({ toast }) {
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    setShown(toast);
    const timer = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!shown) return null;

  return (
    <View pointerEvents="none" style={styles.toast}>
      <Ionicons name={shown.icon ?? 'checkmark'} size={18} color={colors.inverse} />
      <Text style={styles.text} numberOfLines={1}>
        {shown.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 8,
    left: 56,
    right: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    color: colors.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
