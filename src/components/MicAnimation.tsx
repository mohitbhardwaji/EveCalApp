import React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type Props = {
  isSpeaking: boolean;
  isPulsing?: boolean;
  color: string;
};

export function MicAnimation({ isSpeaking, isPulsing, color }: Props) {
  const pulseOn = isPulsing ?? isSpeaking;
  const pulse = React.useRef(new Animated.Value(0)).current;
  const breathe = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!pulseOn) {
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
  }, [breathe, pulse, pulseOn]);

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
      {pulseOn ? (
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
        <View style={[styles.micCircle, { borderColor: 'rgba(58,45,42,0.06)' }]}>
          <Feather name="mic" size={52} color={color} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 4,
  },
  micCircle: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
});
