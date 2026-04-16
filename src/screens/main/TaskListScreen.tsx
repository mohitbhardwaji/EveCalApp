import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import { fetchTasksForCategory, type PathTaskItem } from '../../lib/supabase/tasksApi';
import type { MainTabParamList, PathStackParamList } from '../../navigation/types';
import { setCaptureCategoryIntent } from '../../state/capture/captureIntent';
import { PathBackground } from './PathBackground';
import { PATH_CARD_ICONS, PATH_CARD_TINTS } from '../../theme/pathCardVisuals';
import { EveCalTheme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(240, width * 0.62);
const H_MARGIN = 22;

type Nav = NativeStackNavigationProp<PathStackParamList, 'TaskList'>;
type R = RouteProp<PathStackParamList, 'TaskList'>;

function TaskCard({
  task,
  onPress,
}: {
  task: PathTaskItem & {
    align: 'left' | 'right';
    metaLeft: string;
    metaRight: string;
    icon: string;
    tint: string;
  };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={({ pressed }) => [
        styles.taskCard,
        {
          shadowColor: task.tint,
          shadowOpacity: 0.24,
        },
        task.align === 'left'
          ? { alignSelf: 'flex-start', marginLeft: H_MARGIN }
          : { alignSelf: 'flex-end', marginRight: H_MARGIN },
        pressed && styles.taskCardPressed,
      ]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWrapOuter, { shadowColor: task.tint }]}>
          <View style={[styles.iconWrap, { backgroundColor: task.tint }]}>
            <Feather name={task.icon} size={20} color="#fff" />
          </View>
        </View>
        <View style={styles.cardTextCol}>
          <View style={styles.metaRow}>
            <Text style={styles.taskMeta}>{task.metaLeft}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.taskMeta}>{task.metaRight}</Text>
          </View>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.title}
          </Text>
        </View>
        {task.isCompleted ? (
          <View style={styles.completedBadge}>
            <Feather name="check" size={13} color="#fff" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function dueMetaParts(dueDate: string | null): { left: string; right: string } {
  if (!dueDate) {
    return { left: 'No due date', right: 'Anytime' };
  }
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return { left: 'No due date', right: 'Anytime' };
  }
  return {
    left: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    right: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

export function TaskListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { categoryId, title, kicker, tint, icon } = route.params;
  const categoryTint = tint || PATH_CARD_TINTS[0];
  const categoryIcon = icon || PATH_CARD_ICONS[0];

  const tabNavigation =
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();

  const goToCaptureWithCategory = () => {
    setCaptureCategoryIntent({
      categoryId,
      categoryTitle: title,
      kicker,
      tint: categoryTint,
      icon: categoryIcon,
    });
    tabNavigation?.navigate('Capture');
  };
  const [tasks, setTasks] = React.useState<
    Array<
      PathTaskItem & {
        align: 'left' | 'right';
        metaLeft: string;
        metaRight: string;
        icon: string;
        tint: string;
      }
    >
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const fabBottom = Math.max(insets.bottom, 12) + 68;

  React.useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoading(true);
      const result = await fetchTasksForCategory(categoryId);
      if (!mounted) {
        return;
      }
      if (result.ok) {
        setTasks(
          result.tasks.map((task, index) => {
            const meta = dueMetaParts(task.dueDate);
            return {
              ...task,
              align: index % 2 === 0 ? 'left' : 'right',
              metaLeft: meta.left,
              metaRight: meta.right,
              icon: categoryIcon,
              tint: categoryTint,
            };
          }),
        );
        setError(null);
      } else {
        setTasks([]);
        setError(result.message);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [categoryId, categoryIcon, categoryTint]);

  const openTask = (task: PathTaskItem) => {
    navigation.navigate('TaskDetail', {
      categoryId,
      taskId: task.id,
      categoryTitle: title,
      kicker,
      tint: categoryTint,
      icon: categoryIcon,
    });
  };

  return (
    <View style={styles.root}>
      <PathBackground />
      {/* <View pointerEvents="none" style={styles.bgOverlay} /> */}

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Feather name="arrow-left" size={22} color="rgba(58,45,42,0.75)" />
          </Pressable>
          <Text style={styles.headerTitle}>Task List</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.stateCenter}>
            <View style={styles.loaderOrb}>
              <ActivityIndicator size="large" color="#6BA3D6" />
            </View>
            <Text style={styles.stateTitle}>Loading tasks</Text>
            <Text style={styles.stateSub}>Organizing your to-dos...</Text>
          </View>
        ) : !error && tasks.length === 0 ? (
          <View style={styles.stateCenter}>
            <Text style={styles.stateTitle}>Let&apos;s get started</Text>
            <Text style={styles.stateSub}>
              No tasks yet in this category. Add one from Capture.
            </Text>
            <Pressable
              onPress={goToCaptureWithCategory}
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
            <Text style={styles.stateTitle}>Could not load tasks</Text>
            <Text style={styles.stateSub}>{error}</Text>
          </View>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} onPress={() => openTask(task)} />
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={goToCaptureWithCategory}
        style={[styles.fab, { bottom: fabBottom }]}
        accessibilityRole="button"
        accessibilityLabel="Add in Capture for this category">
        <Feather name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.80)',
  },
  safe: {
    backgroundColor: '#F8F8F8',
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    color: EveCalTheme.colors.text,
    fontFamily: EveCalTheme.typography.serif,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
    gap: 26,
    minHeight: height * 1.05,
  },
  stateCenter: {
    minHeight: height * 0.62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
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
    fontFamily: EveCalTheme.typography.serif,
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
  taskCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 5,
  },
  taskCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardRow: {
    position: 'relative',
  },
  iconWrapOuter: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  iconWrap: {
    height: 54,
    width: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  metaDot: {
    color: 'rgba(186,166,154,0.8)',
    fontSize: 12,
    marginTop: -1,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2F8D77',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#2F8D77',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    position: 'absolute',
    top: 4,
    right: 0,
  },
  taskMeta: {
    fontSize: 10,
    color: 'rgba(186,166,154,0.95)',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(71, 59, 56, 0.81)',
    fontWeight: '500',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6BA3D6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
});
