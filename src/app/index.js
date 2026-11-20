import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { TOOLS, searchTools } from '../lib/tools';

// The scanner modes, in a bar along the bottom of the home screen.
const MODES = [
  { href: '/scan-qr', icon: 'qr-code-outline', label: 'QR' },
  { href: '/scan-barcode', icon: 'barcode-outline', label: 'Barcode' },
  { href: '/scan-number', icon: 'keypad-outline', label: 'Numbers' },
  { href: '/scan-text', icon: 'text-outline', label: 'Text' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = searchTools(query, TOOLS);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 36,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <View style={styles.brand}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.logo} />
          <Text style={styles.wordmark}>NumScan</Text>
        </View>
        <Text style={styles.tagline}>Point at it. Paste it anywhere.</Text>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search tools"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-outline" size={22} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.list}>
          {results.map((tool) => (
            <Pressable
              key={tool.href}
              onPress={() => router.push(tool.href)}
              android_ripple={{ color: 'rgba(128,128,128,0.2)' }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Ionicons name={tool.icon} size={26} color={colors.text} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{tool.title}</Text>
                <Text style={styles.rowDetail}>{tool.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
          {results.length === 0 ? (
            <Text style={styles.empty}>No tools match "{query.trim()}".</Text>
          ) : null}
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
  scroll: {
    flex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 52,
    height: 50,
    resizeMode: 'contain',
  },
  wordmark: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 14,
  },
  search: {
    marginTop: 28,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontSize: 16,
  },
  list: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  rowDetail: {
    color: colors.muted,
    fontSize: 14,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    paddingVertical: 20,
  },
  modes: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
