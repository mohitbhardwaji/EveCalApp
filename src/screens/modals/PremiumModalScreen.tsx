import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { PremiumSparkleIcon } from '../../components/premium/PremiumSparkleIcon';
import { useAuth } from '../../state/auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

/** Mock: Playfair-style headlines on iOS via Georgia; Android generic serif. Sans = system (SF / Roboto). */
const FONT_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

/** System UI font (SF Pro / Roboto) — omit custom family */
const FONT_SANS = undefined as string | undefined;

/** Premium paywall — colors from design (#5A4D41 / #A69689 / #F9F8F7) */
const C = {
  screenBg: '#F9F8F7',
  text: '#5A4D41',
  textTaupe: '#A69689',
  brown: '#5A4D41',
  brownMid: '#5A4D41',
  cta: '#9B8A7F',
  sage: '#C1CDC1',
  checkIcon: '#4A4540',
  card: '#FFFFFF',
  radioBorder: '#D4C9C2',
  cardBorderSelected: 'rgba(90, 77, 65, 0.28)',
};

const FEATURES = [
  'Unlimited voice tasks',
  'Smart auto-assignment',
  'Daily Focus Card',
  'Context attachments (photos & files)',
  'Mission Card sharing',
  'Priority support',
];

function PremiumHeroIcon() {
  return (
    <View style={styles.heroOuter}>
      <LinearGradient
        colors={['#E5DDD6', '#B5A69C', '#8E7F76']}
        locations={[0, 0.42, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGradient}>
        <View style={styles.heroIconInner}>
          <PremiumSparkleIcon size={46} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </View>
  );
}

function PlanCard({
  title,
  price,
  unit,
  selected,
  badge,
  onPress,
}: {
  title: string;
  price: string;
  unit: string;
  selected: boolean;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.planWrap, badge ? styles.planWrapBadge : null]}>
      {badge ? (
        <View style={styles.saveBadge} pointerEvents="none">
          <Text style={styles.saveBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.planCard,
          selected && styles.planCardSelected,
          pressed && styles.planCardPressed,
        ]}>
        <View style={styles.planLeft}>
          <Text style={styles.planTitle}>{title}</Text>
          <View style={styles.planPriceRow}>
            <Text style={styles.planPrice}>{price}</Text>
            <Text style={styles.planUnit}>/{unit}</Text>
          </View>
        </View>
        <View style={styles.radioSlot}>
          {selected ? (
            <View style={styles.radioSelected}>
              <Feather name="check" size={15} color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.radioUnselected} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

function FeatureRow({ label, isLast }: { label: string; isLast?: boolean }) {
  return (
    <View style={[styles.featureRow, isLast && styles.featureRowLast]}>
      <View style={styles.featureIcon}>
        <Feather name="check" size={14} color={C.checkIcon} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

export function PremiumModalScreen({ navigation }: Props) {
  const { markPremiumSeen } = useAuth();
  const [plan, setPlan] = React.useState<'monthly' | 'yearly'>('yearly');

  const dismiss = React.useCallback(async () => {
    await markPremiumSeen();
    navigation.goBack();
  }, [markPremiumSeen, navigation]);

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
      <SafeAreaView style={styles.sheetSafe} edges={['top', 'bottom']}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.headerBrand}>Eve&Cal Premium</Text>
            <Pressable
              onPress={dismiss}
              hitSlop={14}
              style={styles.headerClose}
              accessibilityRole="button"
              accessibilityLabel="Close">
              <Feather name="x" size={24} color={C.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <PremiumHeroIcon />

            <Text style={styles.headline}>
              Your peace of mind, fully supported.
            </Text>
            <Text style={styles.subhead}>
              Less mental load, more presence.
            </Text>

            <View style={styles.plansBlock}>
              <PlanCard
                title="Monthly"
                price="$4.99"
                unit="month"
                selected={plan === 'monthly'}
                onPress={() => setPlan('monthly')}
              />
              <PlanCard
                title="Yearly"
                price="$39.99"
                unit="year"
                selected={plan === 'yearly'}
                badge="Save 33%"
                onPress={() => setPlan('yearly')}
              />
            </View>

            <View style={styles.includedCard}>
              <Text style={styles.includedTitle}>What&apos;s included:</Text>
              {FEATURES.map((f, i) => (
                <FeatureRow
                  key={f}
                  label={f}
                  isLast={i === FEATURES.length - 1}
                />
              ))}
            </View>

            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.ctaBtn,
                pressed && styles.ctaBtnPressed,
              ]}>
              <Text style={styles.ctaText}>Start Free Trial</Text>
            </Pressable>

            <Text style={styles.finePrint}>
              7-day free trial • Cancel anytime
            </Text>
            <Text style={styles.finePrintLegal}>
              By subscribing, you support women reducing their mental load.
              Subscription renews automatically. Terms apply.
            </Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(58, 45, 42, 0.22)',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sheetSafe: {
    width: '100%',
    maxHeight: '94%',
    flexShrink: 1,
  },
  sheet: {
    backgroundColor: C.screenBg,
    borderRadius: 26,
    maxHeight: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerBrand: {
    flex: 1,
    fontFamily: FONT_SERIF,
    fontSize: 17,
    fontWeight: '500',
    color: C.text,
    letterSpacing: 0.15,
  },
  headerClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  heroOuter: {
    alignSelf: 'center',
    marginBottom: 22,
    marginTop: 4,
  },
  heroGradient: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(58,45,42,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  heroIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
  },
  headline: {
    textAlign: 'center',
    fontFamily: FONT_SERIF,
    fontSize: 26,
    lineHeight: 34,
    color: C.text,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
  },
  subhead: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 26,
    fontSize: 15,
    lineHeight: 22,
    color: C.textTaupe,
    fontWeight: '400',
    paddingHorizontal: 12,
    fontFamily: FONT_SANS,
  },
  plansBlock: {
    marginBottom: 22,
  },
  planWrap: {
    position: 'relative',
  },
  planWrapBadge: {
    marginTop: 14,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 77, 65, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: C.cardBorderSelected,
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  planCardPressed: {
    opacity: 0.96,
  },
  planLeft: {
    flex: 1,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textTaupe,
    marginBottom: 6,
    letterSpacing: 0.15,
    fontFamily: FONT_SANS,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontFamily: FONT_SERIF,
    fontSize: 32,
    color: C.text,
    letterSpacing: -0.5,
  },
  planUnit: {
    fontSize: 13,
    color: C.textTaupe,
    fontWeight: '400',
    marginLeft: 2,
    fontFamily: FONT_SANS,
  },
  radioSlot: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  radioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.radioBorder,
    backgroundColor: 'transparent',
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.brownMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBadge: {
    position: 'absolute',
    top: -11,
    right: 20,
    zIndex: 10,
    backgroundColor: C.brown,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.25,
    fontFamily: FONT_SANS,
  },
  includedCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(90, 77, 65, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  includedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textTaupe,
    marginBottom: 18,
    letterSpacing: 0.12,
    fontFamily: FONT_SANS,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  featureRowLast: {
    marginBottom: 0,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: C.text,
    fontWeight: '400',
    fontFamily: FONT_SANS,
  },
  ctaBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: C.cta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: 'rgba(92, 74, 66, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
  ctaBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: FONT_SANS,
  },
  finePrint: {
    textAlign: 'center',
    fontSize: 13,
    color: C.textTaupe,
    marginBottom: 10,
    fontWeight: '400',
    fontFamily: FONT_SANS,
  },
  finePrintLegal: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(90, 77, 65, 0.42)',
    paddingHorizontal: 8,
    fontWeight: '400',
    fontFamily: FONT_SANS,
  },
});
