import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function ActionButton({
  label,
  onPress,
  primary = false,
  disabled = false,
  loading = false,
}) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      style={[
        styles.base,
        primary ? styles.primary : styles.secondary,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#000' : '#fff'} />
      ) : (
        <Text style={[styles.text, primary ? styles.primaryText : styles.secondaryText]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#00FF66',
  },
  secondary: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#333',
  },
  inactive: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: '#fff',
  },
});
