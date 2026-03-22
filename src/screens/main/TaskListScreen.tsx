import React from 'react';
import {
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
import type { MainTabParamList, PathStackParamList } from '../../navigation/types';
import { setCaptureCategoryIntent } from '../../state/capture/captureIntent';
import { PathBackground } from './PathBackground';
import { EveCalTheme } from '../../theme/theme';
import {
  getTasksForCategory,
  type TaskListItem,
} from '../../data/pathTasks';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(240, width * 0.62);
const H_MARGIN = 22;

type Nav = NativeStackNavigationProp<PathStackParamList, 'TaskList'>;
type R = RouteProp<PathStackParamList, 'TaskList'>;

function TaskCard({
  task,
  onPress,
}: {
  task: TaskListItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={({ pressed }) => [
        styles.taskCard,
        task.align === 'left'
          ? { alignSelf: 'flex-start', marginLeft: H_MARGIN }
          : { alignSelf: 'flex-end', marginRight: H_MARGIN },
        pressed && styles.taskCardPressed,
      ]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWrap, { backgroundColor: task.tint }]}>
          <Feather name={task.icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardTextCol}>
          <Text style={styles.taskMeta}>{task.meta}</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TaskListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { categoryId, title, kicker, tint, icon } = route.params;

  const tabNavigation =
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();

  const goToCaptureWithCategory = () => {
    setCaptureCategoryIntent({
      categoryId,
      categoryTitle: title,
      kicker,
      tint,
      icon,
    });
    tabNavigation?.navigate('Capture');
  };
  const tasks = getTasksForCategory(categoryId, tint);
  const fabBottom = Math.max(insets.bottom, 12) + 68;

  const openTask = (task: TaskListItem) => {
    navigation.navigate('TaskDetail', {
      categoryId,
      taskId: task.id,
      categoryTitle: title,
      kicker,
      tint: task.tint,
      icon: task.icon,
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
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onPress={() => openTask(task)} />
        ))}
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
  taskCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 26,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  taskCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconWrap: {
    height: 46,
    width: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    paddingTop: 2,
  },
  taskMeta: {
    fontSize: 12,
    color: 'rgba(58,45,42,0.42)',
    marginBottom: 8,
    lineHeight: 16,
  },
  taskTitle: {
    fontSize: 17,
    color: 'rgba(58,45,42,0.88)',
    fontWeight: '500',
    lineHeight: 22,
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
