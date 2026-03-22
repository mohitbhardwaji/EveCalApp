import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../theme/theme';

type Props = {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconName?: string;
};

export function GradientButton({ title, onPress, style, iconName }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.wrap, style]}>
      <LinearGradient
        colors={[EveCalTheme.colors.accent1, EveCalTheme.colors.accent2]}
        start={{ x: 0.5, y: 0 }}   // top
        end={{ x: 0.5, y: 1 }}     // bottom
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {iconName ? (
          <Feather
            name={iconName}
            size={22}
            color="#fff"
            style={styles.icon}
          />
        ) : null}
        <Text style={styles.text}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
