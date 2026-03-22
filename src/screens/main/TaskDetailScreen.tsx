import React from 'react';
import {
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Feather from 'react-native-vector-icons/Feather';
import type { PathStackParamList } from '../../navigation/types';
import {
  findTaskListItem,
  getTaskDetail,
} from '../../data/pathTasks';
import { EveCalTheme } from '../../theme/theme';

const C = {
  pageBg: '#E1E9ED',
  headerBg: '#FFFFFF',
  card: '#FFFFFF',
  title: '#7C746B',
  body: '#4A4A4A',
  muted: '#9B9B9B',
};

type Nav = NativeStackNavigationProp<PathStackParamList, 'TaskDetail'>;
type R = RouteProp<PathStackParamList, 'TaskDetail'>;

function MetaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaRow}>
      <Feather name={icon} size={18} color={C.muted} style={styles.metaIcon} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

export function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { categoryId, taskId, categoryTitle, tint, icon } = route.params;

  const listItem = findTaskListItem(categoryId, taskId, tint);
  const title = listItem?.title ?? 'Task';
  const taskTint = listItem?.tint ?? tint;
  const taskIcon = listItem?.icon ?? icon;

  const detail = listItem
    ? getTaskDetail(categoryId, taskId, listItem, categoryTitle)
    : {
        room: categoryTitle,
        description: 'No additional details yet.',
        whenLabel: '—',
        repeatLabel: '—',
        tagLabel: categoryTitle,
        notes: '',
      };

  const onComplete = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Feather name="arrow-left" size={22} color={C.title} />
          </Pressable>
          <Text style={styles.headerTitle}>Task Details</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(28, insets.bottom + 24) },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Main task card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.titleIcon, { backgroundColor: taskTint }]}>
              <View style={styles.titleIconDot} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.taskTitle}>{title}</Text>
              <Text style={styles.roomLabel}>{detail.room}</Text>
            </View>
          </View>
          <Text style={styles.description}>{detail.description}</Text>
          <View style={styles.metaBlock}>
            <MetaRow icon="calendar" label={detail.whenLabel} />
            <MetaRow icon="refresh-cw" label={detail.repeatLabel} />
            <MetaRow icon="tag" label={detail.tagLabel} />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <Text style={styles.notesBody}>
            {detail.notes.trim()
              ? detail.notes
              : 'No notes yet — tap Capture from the list to voice a thought.'}
          </Text>
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <View style={styles.photosHeader}>
            <Text style={styles.sectionLabelPhotos}>PHOTOS</Text>
            <Feather name="camera" size={18} color={C.muted} />
          </View>
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>No photos yet</Text>
          </View>
        </View>

        <Pressable
          onPress={onComplete}
          style={({ pressed }) => [
            styles.btnPrimary,
            { backgroundColor: taskTint },
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mark as complete">
          <Text style={styles.btnPrimaryText}>Mark as Complete</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to path">
          <Text style={styles.btnSecondaryText}>Back to Path</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.pageBg,
  },
  headerSafe: {
    backgroundColor: C.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 48,
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
    color: C.title,
    fontFamily: EveCalTheme.typography.serif,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  cardHeaderText: {
    flex: 1,
    paddingTop: 2,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.body,
    marginBottom: 4,
  },
  roomLabel: {
    fontSize: 14,
    color: C.muted,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: C.body,
    marginBottom: 18,
  },
  metaBlock: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIcon: {
    width: 22,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    color: C.muted,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.muted,
    marginBottom: 10,
  },
  sectionLabelPhotos: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.muted,
  },
  notesBody: {
    fontSize: 15,
    lineHeight: 22,
    color: C.body,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoPlaceholder: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: C.muted,
  },
  btnPrimary: {
    marginTop: 4,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  btnSecondaryText: {
    color: C.title,
    fontSize: 16,
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
