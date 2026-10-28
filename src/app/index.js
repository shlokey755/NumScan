import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

const OPTIONS = [
  {
    href: '/scan-qr',
    title: 'QR code',
    subtitle: 'Read a QR code. Links can be opened straight away.',
  },
  {
    href: '/scan-barcode',
    title: 'Barcode',
    subtitle: 'Product barcodes such as EAN, UPC and Code 128.',
  },
  {
    href: '/scan-text',
    title: 'Text to clipboard',
    subtitle: 'Capture the text inside the box and copy it.',
  },
  {
    href: '/scan-number',
    title: 'Number to clipboard',
    subtitle: 'Pick out numbers from the box and copy one or all.',
  },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>What do you want to scan?</Text>
      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.href}
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push(option.href)}
        >
          <Text style={styles.cardTitle}>{option.title}</Text>
          <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  heading: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 18,
    gap: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#00FF66',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#aaa',
    fontSize: 14,
  },
});
