import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type Props = {
  isSpeaking: boolean;
  color: string;
};

export function MicAnimation({ isSpeaking, color }: Props) {
  const pulse = React.useRef(new Animated.Value(0)).current;
  const breathe = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!isSpeaking) {
      pulse.stopAnimation();
      breathe.stopAnimation();
      pulse.setValue(0);
      breathe.setValue(1);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    breathLoop.start();
    return () => {
      pulseLoop.stop();
      breathLoop.stop();
    };
  }, [breathe, isSpeaking, pulse]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  return (
    <View style={styles.stage}>
      {isSpeaking ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              borderColor: color,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      ) : null}
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <View style={[styles.micCircle, { borderColor: color }]}>
          <Feather name="mic" size={34} color={color} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
  },
  micCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
