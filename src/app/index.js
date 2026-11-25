import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cursor, HeadSection, Ticker } from '../components/LinkMap';
import UpdateButton from '../components/UpdateButton';
import { colors } from '../theme';
import { HEADS, TOOLS, groupTools, searchTools } from '../lib/tools';

// The home screen: a link map of the tools. Each head groups closely related tools,
// and tapping a head folds it away. Search shows only the matching tools, under their heads.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [folded, setFolded] = useState({}); // head number -> true when folded away
  const focus = useRef(new Animated.Value(0)).current;

  // The search box turns from black to white while it has focus.
  useEffect(() => {
    Animated.timing(focus, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [focused, focus]);

  const searching = query.trim().length > 0;
  const groups = groupTools(searchTools(query, TOOLS));

  // Each head starts animating after the one above it, so the map builds down the page.
  let delay = 0;
  const plan = groups.map((head) => {
    const first = delay;
    delay += Math.min(head.tools.length * 60, 600) + 80;
    return { head, first };
  });

  const boxColor = focus.interpolate({ inputRange: [0, 1], outputRange: [colors.bg, colors.text] });
  const inkColor = focus.interpolate({ inputRange: [0, 1], outputRange: [colors.text, colors.inverse] });
  const toggleHead = (number) => setFolded((list) => ({ ...list, [number]: !list[number] }));

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.masthead}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logo} />
        <View style={styles.wordRow}>
          <Text style={styles.wordmark}>NUMSCAN</Text>
          <Cursor />
        </View>
        <Text style={styles.tagline}>Point at it. Paste it anywhere.</Text>
        <Text style={styles.count}>
          {TOOLS.length} keys · {HEADS.length} heads
        </Text>
      </View>

      <Ticker text={`${HEADS.map((head) => head.title).join('  /  ')}  /  `} />

      <View style={styles.searchWrap}>
        <Animated.View style={[styles.search, { backgroundColor: boxColor }]}>
          <Ionicons name="search" size={22} color={focused ? colors.inverse : colors.text} />
          <Animated.TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search the map"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search tools"
            style={[styles.input, { color: inkColor }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close" size={24} color={focused ? colors.inverse : colors.text} />
            </Pressable>
          ) : null}
        </Animated.View>
      </View>

      <View style={styles.map}>
        {plan.length === 0 ? (
          <Text style={styles.empty}>No tool matches "{query.trim()}".</Text>
        ) : (
          plan.map(({ head, first }) => (
            <HeadSection
              key={head.number}
              head={head}
              open={searching || !folded[head.number]}
              onToggle={() => toggleHead(head.number)}
              firstDelay={first}
            />
          ))
        )}
      </View>

      <UpdateButton />

      <Text style={styles.footer}>Everything runs on your phone. Nothing is uploaded.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  masthead: {
    paddingHorizontal: 20,
    gap: 6,
  },
  logo: {
    width: 44,
    height: 42,
    resizeMode: 'contain',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    color: colors.text,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tagline: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  count: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  searchWrap: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: colors.text,
  },
  input: {
    flex: 1,
    height: 58,
    fontSize: 17,
    fontWeight: '700',
  },
  map: {
    marginTop: 22,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    borderColor: colors.text,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    paddingVertical: 28,
  },
  footer: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
  },
});
