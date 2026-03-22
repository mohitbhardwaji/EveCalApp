import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Pattern color #6B8DB880 — RGB 107,141,184 + alpha 0x80/255 */
const PATH_PATTERN = '#3281e8b2';
const PATH_PATTERN_OPACITY = 0x80 / 255;

/** Off-white wash over the pattern */
const OVERLAY_OFF_WHITE = 'rgba(255, 252, 248, 0.77)';

/** ViewBox: tall narrow artboard; path centered ~x=100 */
const VB_W = 200;
const VB_H = 820;

/**
 * Vertical “path” wave — soft S through the center (same idea as Vector.png,
 * but drawn in vectors so it stays sharper on #F8F8F8 than a blurred raster).
 */
const WAVE_PATH =
  'M 100 32 C 146 168 54 268 100 410 C 146 552 54 652 100 788';

/**
 * Centered path graphic behind the Path screen.
 * Stays fixed while the card list scrolls on top.
 */
export function PathBackground() {
  const { width, height } = Dimensions.get('window');

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet">
        {/* Layered S-curve — all #3281e8b2 */}
        <Path
          d={WAVE_PATH}
          stroke={PATH_PATTERN}
          strokeOpacity={PATH_PATTERN_OPACITY}
          strokeWidth={58}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={WAVE_PATH}
          stroke={PATH_PATTERN}
          strokeOpacity={PATH_PATTERN_OPACITY}
          strokeWidth={30}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={WAVE_PATH}
          stroke={PATH_PATTERN}
          strokeOpacity={PATH_PATTERN_OPACITY}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <View style={styles.offWhiteOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offWhiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_OFF_WHITE,
  },
});
