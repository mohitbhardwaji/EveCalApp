import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Four-point sparkle with a small “+” at the upper-right (matches Eve&Cal premium mock).
 */
export function PremiumSparkleIcon({
  size = 44,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  const vb = 48;
  return (
    <View style={{ width: size, height: size }} accessibilityIgnoresInvertColors>
      <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
        {/* Eight-point compass star reads as a soft 4-ray sparkle */}
        <Path
          fill={color}
          d="M24 4 L27.2 19.5 L41 24 L27.2 28.5 L24 44 L20.8 28.5 L7 24 L20.8 19.5 Z"
        />
        {/* Small plus by the top-right ray */}
        <Rect x={35} y={9} width={2.2} height={9} rx={0.6} fill={color} />
        <Rect x={31.4} y={12.4} width={9.2} height={2.2} rx={0.6} fill={color} />
      </Svg>
    </View>
  );
}
