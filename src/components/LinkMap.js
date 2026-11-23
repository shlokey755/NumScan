// The home screen's link map: numbered heads, each with its related tools linked under it.
// Motion uses React Native's built-in Animated API. Opacity and transforms run on the
// native driver, so the animation stays smooth while the list is busy.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { slotOf } from '../lib/tools';

// Words that scroll across the top of the map. The copy is measured, then looped without a seam.
export function Ticker({ text }) {
  const x = useRef(new Animated.Value(0)).current;
  const [segment, setSegment] = useState(0);

  useEffect(() => {
    if (!segment) return undefined;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: -segment,
        duration: segment * 30,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [segment, x]);

  return (
    <View style={styles.ticker}>
      <Animated.View style={[styles.tickerRow, { transform: [{ translateX: x }] }]}>
        <Text style={styles.tickerText} numberOfLines={1} onLayout={(e) => setSegment(e.nativeEvent.layout.width)}>
          {text}
        </Text>
        <Text style={styles.tickerText} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

// A block cursor that blinks after the wordmark.
export function Cursor() {
  const on = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(on, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(on, { toValue: 1, duration: 420, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [on]);
  return <Animated.View style={[styles.cursor, { opacity: on }]} />;
}

// One tool, linked under its head. It slides in when first shown and shrinks a little when pressed.
function ToolNode({ tool, label, delay }) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, delay]);

  const springTo = (value) =>
    Animated.spring(press, { toValue: value, speed: 40, bounciness: 0, useNativeDriver: true }).start();
  const ink = pressed ? colors.inverse : colors.text;
  const soft = pressed ? colors.inverse : colors.muted;

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        {
          opacity: enter,
          transform: [
            { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
            { scale: press },
          ],
        },
      ]}
    >
      <View style={styles.nodeDot} />
      <Pressable
        onPress={() => router.push(tool.href)}
        onPressIn={() => {
          setPressed(true);
          springTo(0.975);
        }}
        onPressOut={() => {
          setPressed(false);
          springTo(1);
        }}
        accessibilityRole="button"
        accessibilityLabel={tool.title}
        style={[styles.node, pressed && styles.nodeInk]}
      >
        <View style={styles.nodeTop}>
          <Text style={[styles.nodeLabel, { color: soft }]}>{label}</Text>
          <Text style={[styles.nodeKey, { color: soft }]}>#{slotOf(tool.href)}</Text>
        </View>
        <View style={styles.nodeMain}>
          <Ionicons name={tool.icon} size={24} color={ink} />
          <View style={styles.nodeText}>
            <Text style={[styles.nodeTitle, { color: ink }]}>{tool.title}</Text>
            <Text style={[styles.nodeDetail, { color: soft }]}>{tool.detail}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={ink} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// A head: a numbered block with its tools linked beneath. Tap to fold or open it.
export function HeadSection({ head, open, onToggle, firstDelay }) {
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };
  const count = String(head.tools.length).padStart(2, '0');

  return (
    <View style={styles.head}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.headRow, pressed && styles.nodeInk]}
      >
        <View style={styles.headNumber}>
          <Text style={styles.headNumberText}>{head.number}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>{head.title}</Text>
          <Text style={styles.headHint}>
            {head.hint} · {count} keys
          </Text>
        </View>
        <Ionicons name={open ? 'remove-outline' : 'add-outline'} size={26} color={colors.text} />
      </Pressable>

      {open ? (
        <View style={styles.rail}>
          {head.tools.map((tool, i) => (
            <ToolNode
              key={tool.href}
              tool={tool}
              label={`${head.number}.${String(i + 1).padStart(2, '0')}`}
              delay={firstDelay + Math.min(i * 60, 600)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ticker: {
    overflow: 'hidden',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.text,
    paddingVertical: 8,
  },
  tickerRow: {
    flexDirection: 'row',
  },
  tickerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingRight: 24,
  },
  cursor: {
    width: 16,
    height: 36,
    backgroundColor: colors.text,
    marginLeft: 6,
  },
  head: {
    borderTopWidth: 3,
    borderColor: colors.text,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  headNumber: {
    backgroundColor: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headNumberText: {
    color: colors.inverse,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  headTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headHint: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rail: {
    marginLeft: 22,
    paddingLeft: 26,
    paddingBottom: 14,
    borderLeftWidth: 2,
    borderColor: colors.text,
    gap: 12,
  },
  nodeWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  nodeDot: {
    position: 'absolute',
    left: -34,
    top: 22,
    width: 10,
    height: 10,
    backgroundColor: colors.text,
  },
  node: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  nodeInk: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  nodeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  nodeKey: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  nodeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nodeText: {
    flex: 1,
    gap: 3,
  },
  nodeTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  nodeDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
});
