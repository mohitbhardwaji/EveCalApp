import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ScrollView,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { TopHeader } from '../../components/TopHeader';
import type { PathStackParamList } from '../../navigation/types';
import { PathBackground } from './PathBackground';

type PathNav = NativeStackNavigationProp<PathStackParamList, 'PathHome'>;

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(190, width * 0.52);
const H_MARGIN = 24;

type CardAlignKey =
  | 'cardLeft1'
  | 'cardRight1'
  | 'cardLeft2'
  | 'cardRight2'
  | 'cardLeft3';

const CARD_ALIGN: Record<CardAlignKey, ViewStyle> = {
  cardLeft1: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
  cardRight1: { alignSelf: 'flex-end', marginRight: H_MARGIN },
  cardLeft2: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
  cardRight2: { alignSelf: 'flex-end', marginRight: H_MARGIN },
  cardLeft3: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
};

function FloatingCard({
  title,
  count,
  tint,
  icon,
  kicker,
  style,
  onPress,
}: {
  title: string;
  count: number;
  tint: string;
  icon: string;
  kicker: string;
  style: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={({ pressed }) => [
        styles.floatCard,
        Platform.OS === 'android' ? styles.floatCardAndroid : null,
        style,
        pressed && Platform.OS !== 'android' ? styles.cardPressed : null,
      ]}>
      <View style={[styles.floatIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={20} color="#fff" />
      </View>

      <Text style={styles.floatKicker}>{kicker}</Text>
      <Text style={styles.floatTitle}>{title}</Text>

      <View style={[styles.badge, { backgroundColor: tint }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </Pressable>
  );
}

const CARDS = [
  {
    id: 'social-harmony',
    title: 'Social Harmony',
    count: 3,
    tint: '#7DAFFF',
    icon: 'users',
    kicker: 'SACRED SPACE',
    styleKey: 'cardLeft1',
  },
  {
    id: 'daily-rituals',
    title: 'Daily Rituals',
    count: 5,
    tint: '#E6C9A8',
    icon: 'coffee',
    kicker: 'SUSTENANCE',
    styleKey: 'cardRight1',
  },
  {
    id: 'core-peace',
    title: 'Core Peace',
    count: 2,
    tint: '#A8D5BA',
    icon: 'leaf',
    kicker: 'SANCTUARY',
    styleKey: 'cardLeft2',
  },
  {
    id: 'home-base',
    title: 'Home Base',
    count: 7,
    tint: '#E6C9A8',
    icon: 'home',
    kicker: 'FOUNDATION',
    styleKey: 'cardRight2',
  },
  {
    id: 'growth',
    title: 'Growth',
    count: 1,
    tint: '#F4A6A6',
    icon: 'heart',
    kicker: 'EXPANSION',
    styleKey: 'cardLeft3',
  },
] as const;

export function PathScreen() {
  const navigation = useNavigation<PathNav>();

  return (
    <View style={styles.root}>
      <View style={styles.topNavShell}>
        <TopHeader backgroundColor="#F8F8F8" />
      </View>
      <View style={styles.contentWrap}>
        <PathBackground />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {CARDS.map(card => (
            <FloatingCard
              key={card.id}
              title={card.title}
              count={card.count}
              tint={card.tint}
              icon={card.icon}
              kicker={card.kicker}
              style={CARD_ALIGN[card.styleKey as CardAlignKey]}
              onPress={() =>
                navigation.navigate('TaskList', {
                  categoryId: card.id,
                  title: card.title,
                  kicker: card.kicker,
                  tint: card.tint,
                  icon: card.icon,
                  taskCount: card.count,
                })
              }
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  /** Keep path graphic from reading through the bell/profile bar */
  topNavShell: {
    zIndex: 2,
    elevation: 4,
    backgroundColor: '#F8F8F8',
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 160,
    gap: 34,
    minHeight: height * 1.15,
  },

  floatCard: {
    width: CARD_WIDTH,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
  /** Android: softer card — less elevation “outline” / pressed halo */
  floatCardAndroid: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  floatIcon: {
    height: 46,
    width: 46,
    borderRadius: 15,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatKicker: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#999',
  },
  floatTitle: {
    fontSize: 28,
    color: '#333',
  },

  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
  },
});
