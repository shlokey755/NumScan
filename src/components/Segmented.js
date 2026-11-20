import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// A row of choices where exactly one is active. Used for modes and formats.
// `options` is [{ value, label }].
export default function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.option,
              active && styles.active,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  active: {
    backgroundColor: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.inverse,
  },
});
