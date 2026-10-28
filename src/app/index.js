import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const OPTIONS = [
  {
    href: '/scan-qr',
    icon: 'qr-code-outline',
    title: 'QR code',
    detail: 'Read a code. Links open in one tap.',
  },
  {
    href: '/scan-barcode',
    icon: 'barcode-outline',
    title: 'Barcode',
    detail: 'Product and shipping barcodes.',
  },
  {
    href: '/scan-text',
    icon: 'text-outline',
    title: 'Text',
    detail: 'Copy the text inside the box.',
  },
  {
    href: '/scan-number',
    icon: 'keypad-outline',
    title: 'Numbers',
    detail: 'Pick out digits. Copy one or all.',
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
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

      <View style={styles.list}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.href}
            onPress={() => router.push(option.href)}
            android_ripple={{ color: 'rgba(128,128,128,0.2)' }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Ionicons name={option.icon} size={26} color={colors.text} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{option.title}</Text>
              <Text style={styles.rowDetail}>{option.detail}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.footnote}>Scanning runs on your phone.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
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
  list: {
    marginTop: 40,
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
  footnote: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 28,
  },
});
