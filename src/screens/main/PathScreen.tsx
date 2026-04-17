import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';
import { TopHeader } from '../../components/TopHeader';
import {
  loadPathCategoriesCache,
  pathCategoriesFingerprint,
  savePathCategoriesCache,
} from '../../lib/path/pathCategoriesCache';
import { getSupabase } from '../../lib/supabase/client';
import { fetchPathCategories, type PathCategorySummary } from '../../lib/supabase/tasksApi';
import type { MainTabParamList, PathStackParamList } from '../../navigation/types';
import {
  PATH_CARD_ICONS,
  PATH_CARD_KICKERS,
  PATH_CARD_TINTS,
} from '../../theme/pathCardVisuals';
import { PathBackground } from './PathBackground';

const POLL_MS = 5000;

type PathNav = NativeStackNavigationProp<PathStackParamList, 'PathHome'>;

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(190, width * 0.52);
const H_MARGIN = 24;

type CardAlignKey =
  | 'cardLeft1'
  | 'cardRight1'
  | 'cardLeft2'
  | 'cardRight2'
  | 'cardLeft3'
  | 'cardRight3';

const CARD_ALIGN: Record<CardAlignKey, ViewStyle> = {
  cardLeft1: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
  cardRight1: { alignSelf: 'flex-end', marginRight: H_MARGIN },
  cardLeft2: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
  cardRight2: { alignSelf: 'flex-end', marginRight: H_MARGIN },
  cardLeft3: { alignSelf: 'flex-start', marginLeft: H_MARGIN },
  cardRight3: { alignSelf: 'flex-end', marginRight: H_MARGIN },
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
        {
          shadowColor: tint,
          shadowOpacity: 0.24,
        },
        Platform.OS === 'android' ? styles.floatCardAndroid : null,
        style,
        pressed && Platform.OS !== 'android' ? styles.cardPressed : null,
      ]}>
      <View style={[styles.floatIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={20} color="#fff" />
      </View>

      <Text style={styles.floatKicker}>{kicker}</Text>
      <Text style={styles.floatTitle} numberOfLines={2}>
        {title}
      </Text>

      <View style={[styles.badge, { backgroundColor: tint }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </Pressable>
  );
}

const CARD_STYLE_KEYS: CardAlignKey[] = [
  'cardLeft1',
  'cardRight1',
  'cardLeft2',
  'cardRight2',
  'cardLeft3',
  'cardRight3',
];

export function PathScreen() {
  const navigation = useNavigation<PathNav>();
  const tabNavigation =
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  const [categories, setCategories] = React.useState<PathCategorySummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const lastFingerprintRef = React.useRef<string>('');
  const userIdRef = React.useRef<string | null>(null);
  const categoriesLenRef = React.useRef(0);

  React.useEffect(() => {
    categoriesLenRef.current = categories.length;
  }, [categories.length]);

  const applyFetchResult = React.useCallback(
    (result: Awaited<ReturnType<typeof fetchPathCategories>>) => {
      if (result.ok) {
        const fp = pathCategoriesFingerprint(result.categories);
        if (fp === lastFingerprintRef.current) {
          return;
        }
        lastFingerprintRef.current = fp;
        setCategories(result.categories);
        setError(null);
        const uid = userIdRef.current;
        if (uid) {
          void savePathCategoriesCache(uid, result.categories);
        }
        return;
      }

      if (categoriesLenRef.current === 0) {
        setCategories([]);
        setError(result.message);
      }
    },
    [],
  );

  const runFetch = React.useCallback(async () => {
    return fetchPathCategories();
  }, []);

  const onPullRefresh = React.useCallback(() => {
    setRefreshing(true);
    void (async () => {
      const result = await runFetch();
      applyFetchResult(result);
      setRefreshing(false);
    })();
  }, [applyFetchResult, runFetch]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      void (async () => {
        const {
          data: { user },
        } = await getSupabase().auth.getUser();
        if (cancelled) return;

        if (!user) {
          userIdRef.current = null;
          lastFingerprintRef.current = '';
          setCategories([]);
          setError('Not signed in');
          setLoading(false);
          return;
        }

        userIdRef.current = user.id;

        const cached = await loadPathCategoriesCache(user.id);
        if (cancelled) return;

        if (cached !== null) {
          const fp = pathCategoriesFingerprint(cached);
          lastFingerprintRef.current = fp;
          setCategories(cached);
          setError(null);
          setLoading(false);
        }

        const result = await runFetch();
        if (cancelled) return;
        applyFetchResult(result);
        setLoading(false);
      })();

      const poll = setInterval(() => {
        if (cancelled) return;
        void runFetch().then(result => {
          if (!cancelled) {
            applyFetchResult(result);
          }
        });
      }, POLL_MS);

      return () => {
        cancelled = true;
        clearInterval(poll);
      };
    }, [applyFetchResult, runFetch]),
  );

  const showInitialLoader = loading && categories.length === 0;
  const showCardList = categories.length > 0 && !error;
  const showTallScrollForRefresh =
    !showInitialLoader && !showCardList;

  return (
    <View style={styles.root}>
      <View style={styles.topNavShell}>
        <TopHeader backgroundColor="#F8F8F8" />
      </View>
      <View style={styles.contentWrap}>
        <PathBackground />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor="#6BA3D6"
              colors={['#6BA3D6']}
            />
          }
          contentContainerStyle={[
            styles.refreshScrollContent,
            showInitialLoader && styles.refreshScrollContentLoading,
            showCardList && styles.scrollContent,
            showTallScrollForRefresh && styles.refreshScrollContentTall,
          ]}>
          {loading && categories.length === 0 ? (
            <View style={[styles.stateCenter, styles.stateCenterCompact]}>
              <View style={styles.loaderOrb}>
                <ActivityIndicator size="large" color="#6BA3D6" />
              </View>
              <Text style={styles.stateTitle}>Gathering your paths</Text>
              <Text style={styles.stateSub}>Creating your calm workspace...</Text>
            </View>
          ) : !error && categories.length === 0 ? (
            <View style={styles.stateCenter}>
              <Text style={styles.stateTitle}>Let&apos;s get started</Text>
              <Text style={styles.stateSub}>
                Add your first capture and categories will appear here.
              </Text>
              <Pressable
                onPress={() => tabNavigation?.navigate('Capture')}
                style={({ pressed }) => [
                  styles.stateButton,
                  pressed && styles.stateButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go to capture">
                <Feather name="mic" size={16} color="#fff" />
                <Text style={styles.stateButtonText}>Go to Capture</Text>
              </Pressable>
            </View>
          ) : error ? (
            <View style={styles.stateCenter}>
              <Text style={styles.stateTitle}>Could not load paths</Text>
              <Text style={styles.stateSub}>{error}</Text>
            </View>
          ) : (
            <>
              {categories.map((card, index) => (
                <FloatingCard
                  key={card.id}
                  title={card.name}
                  count={card.taskCount}
                  tint={PATH_CARD_TINTS[index % PATH_CARD_TINTS.length]}
                  icon={PATH_CARD_ICONS[index % PATH_CARD_ICONS.length]}
                  kicker={PATH_CARD_KICKERS[index % PATH_CARD_KICKERS.length]}
                  style={
                    CARD_ALIGN[CARD_STYLE_KEYS[index % CARD_STYLE_KEYS.length]]
                  }
                  onPress={() =>
                    navigation.navigate('TaskList', {
                      categoryId: card.id,
                      title: card.name,
                      kicker: PATH_CARD_KICKERS[index % PATH_CARD_KICKERS.length],
                      tint: PATH_CARD_TINTS[index % PATH_CARD_TINTS.length],
                      icon: PATH_CARD_ICONS[index % PATH_CARD_ICONS.length],
                      taskCount: card.taskCount,
                    })
                  }
                />
              ))}
            </>
          )}
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
  refreshScrollContent: {
    flexGrow: 1,
  },
  refreshScrollContentLoading: {
    minHeight: height * 0.85,
    justifyContent: 'center',
  },
  refreshScrollContentTall: {
    minHeight: height * 0.92,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 160,
    gap: 34,
    minHeight: height * 1.15,
  },
  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    gap: 10,
  },
  stateCenterCompact: {
    flex: 0,
    alignSelf: 'center',
    marginTop: height * 0.28,
  },
  loaderOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(107,163,214,0.26)',
    shadowColor: '#6BA3D6',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 3,
  },
  stateTitle: {
    marginTop: 8,
    fontSize: 22,
    color: '#3A2D2A',
    fontFamily: 'Times New Roman',
  },
  stateSub: {
    textAlign: 'center',
    color: 'rgba(58,45,42,0.62)',
    fontSize: 14,
    lineHeight: 20,
  },
  stateButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#6BA3D6',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stateButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  stateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  floatCard: {
    width: CARD_WIDTH,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    elevation: 5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
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
    height: 54,
    width: 54,
    borderRadius: 18,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatKicker: {
    fontSize: 10,
    color: 'rgba(186,166,154,0.95)',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  floatTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(71, 59, 56, 0.81)',
    fontWeight: '500',
    lineHeight: 24,
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
