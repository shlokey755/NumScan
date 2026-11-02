import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import {
  THUMB_SIZE,
  TRACK_LENGTH,
  fillTop,
  thumbTop,
  zoomFromDrag,
} from '../lib/zoom';

// Vertical zoom slider for the right edge of a scan screen.
// Bottom = 0 (normal view). Drag up to zoom in. The top icon is a hint only;
// tapping the bottom icon resets to normal view.
export default function ZoomSlider({ value, onChange }) {
  // PanResponder is created once, so it reads the latest values through refs.
  const valueRef = useRef(value);
  const startRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = valueRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const next = zoomFromDrag(startRef.current, gesture.dy);
          valueRef.current = next;
          onChangeRef.current(next);
        },
      }),
    []
  );

  return (
    <View style={styles.column}>
      <View style={styles.icon} pointerEvents="none">
        <Ionicons name="add-outline" size={18} color={colors.muted} />
      </View>

      <View style={styles.touch} {...responder.panHandlers}>
        <View style={styles.rail} />
        <View style={[styles.fill, { top: fillTop(value) }]} />
        <View style={[styles.thumb, { top: thumbTop(value) }]} />
      </View>

      <Pressable
        onPress={() => onChangeRef.current(0)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Reset zoom to normal"
        style={styles.icon}
      >
        <Ionicons name="remove-outline" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 40,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touch: {
    width: 40,
    height: TRACK_LENGTH,
    alignItems: 'center',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.line,
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    backgroundColor: colors.text,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: colors.text,
  },
});
