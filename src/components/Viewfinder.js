import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const ARM = 26; // length of each corner bracket
const STROKE = 3;

// Four corner brackets marking the scan area. They are drawn over the camera
// so the frame itself is never a rounded shape.
export default function Viewfinder({ width, height }) {
  const i = STROKE / 2;
  const a = ARM;
  const d = [
    `M${i} ${a + i} L${i} ${i} L${a + i} ${i}`,
    `M${width - a - i} ${i} L${width - i} ${i} L${width - i} ${a + i}`,
    `M${width - i} ${height - a - i} L${width - i} ${height - i} L${width - a - i} ${height - i}`,
    `M${a + i} ${height - i} L${i} ${height - i} L${i} ${height - a - i}`,
  ].join(' ');

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          stroke={colors.text}
          strokeWidth={STROKE}
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
      </Svg>
    </View>
  );
}
