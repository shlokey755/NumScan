import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

// solid: filled, for the one main action on a screen
// outline: thin border, for secondary actions
// ghost: text only, for low-emphasis actions
const VARIANTS = {
  solid: { box: { backgroundColor: colors.text }, content: colors.inverse },
  outline: { box: { borderWidth: 1, borderColor: colors.line }, content: colors.text },
  ghost: { box: {}, content: colors.muted },
};

export default function Button({
  label,
  icon,
  onPress,
  variant = 'outline',
  disabled = false,
  loading = false,
  style,
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      android_ripple={{ color: 'rgba(128,128,128,0.25)' }}
      style={({ pressed }) => [
        styles.base,
        v.box,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.content} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.content} /> : null}
          <Text style={[styles.label, { color: v.content }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  inactive: {
    opacity: 0.4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
