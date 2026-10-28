import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

// A bare icon with no background or border.
export function IconButton({ name, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.side}
    >
      <Ionicons name={name} size={24} color={colors.text} />
    </Pressable>
  );
}

// Plain top row: back icon, centred title, optional right-hand control.
// No background, so it reads as text on the screen rather than a navigation bar.
export default function ScreenHeader({ title, right = null }) {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack?.()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <IconButton name="chevron-back" label="Back" onPress={goBack} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  side: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
