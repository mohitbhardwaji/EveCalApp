// @refresh reset
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
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
import { launchImageLibrary } from 'react-native-image-picker';
import Feather from 'react-native-vector-icons/Feather';
import {
  completeTaskWithPhoto,
  fetchTaskDetail,
  resolveTaskPhotoMimeType,
  type PathTaskDetail,
} from '../../lib/supabase/tasksApi';
import type { PathStackParamList } from '../../navigation/types';
import { PATH_CARD_ICONS, PATH_CARD_TINTS } from '../../theme/pathCardVisuals';
import { EveCalTheme } from '../../theme/theme';
import { WarmAlertDialog } from '../../components/WarmAlertDialog';

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
type SelectedPhoto = {
  uri: string;
  type?: string;
  fileName?: string;
};

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
  const { taskId, categoryTitle, tint, icon } = route.params;
  const categoryTint = tint || PATH_CARD_TINTS[0];
  const categoryIcon = icon || PATH_CARD_ICONS[0];
  const [task, setTask] = React.useState<PathTaskDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [photo, setPhoto] = React.useState<SelectedPhoto | null>(null);
  const [warmAlert, setWarmAlert] = React.useState<{
    title: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoading(true);
      const result = await fetchTaskDetail(taskId);
      if (!mounted) {
        return;
      }
      if (result.ok) {
        setTask(result.task);
        setError(null);
      } else {
        setTask(null);
        setError(result.message);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [taskId]);

  const title = task?.title ?? 'Task';
  const taskTint = categoryTint;
  const detail = task
    ? {
        room: task.categoryName,
        description: task.notes.trim() || 'No additional details yet.',
        whenLabel: task.dueDate
          ? new Date(task.dueDate).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'No due date',
        completedLabel:
          task.isCompleted && task.completedAt
            ? new Date(task.completedAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : null,
        repeatLabel: task.repeatLabel || 'One-time',
        tagLabel: task.categoryName,
        notes: task.notes,
      }
    : {
        room: categoryTitle,
        description: error ?? 'No additional details yet.',
        whenLabel: '—',
        completedLabel: null,
        repeatLabel: '—',
        tagLabel: categoryTitle,
        notes: '',
      };

  const pickTaskPhoto =
    React.useCallback(async (): Promise<SelectedPhoto | null> => {
      const picked = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        selectionLimit: 1,
        ...(Platform.OS === 'android'
          ? {
              restrictMimeTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/heic',
                'image/heif',
              ],
            }
          : {}),
      });

      if (picked.didCancel) {
        return null;
      }

      const asset = picked.assets?.[0];
      if (!asset?.uri) {
        setWarmAlert({
          title: 'Photo missing',
          message: 'Could not select a task photo. Please try again.',
        });
        return null;
      }

      const mime = resolveTaskPhotoMimeType({
        mimeType: asset.type,
        fileName: asset.fileName,
      });
      if (!mime.ok) {
        setWarmAlert({
          title: 'Images only',
          message: mime.message,
        });
        return null;
      }

      const next: SelectedPhoto = {
        uri: asset.uri,
        type: mime.mime,
        fileName: asset.fileName,
      };
      setPhoto(next);
      return next;
    }, []);

  const onComplete = () => {
    if (task?.isCompleted) {
      return;
    }
    void (async () => {
      const selection =
        photo?.uri != null
          ? photo
          : await pickTaskPhoto();
      if (!selection?.uri) {
        return;
      }
      setBusy(true);
      const result = await completeTaskWithPhoto({
        taskId,
        fileUri: selection.uri,
        mimeType: selection.type,
        fileName: selection.fileName,
      });
      setBusy(false);

      if (!result.ok) {
        setWarmAlert({
          title: 'Could not complete task',
          message: result.message,
        });
        return;
      }

      setTask(current =>
        current
          ? {
              ...current,
              isCompleted: true,
              photoUrl: result.imageUrl,
            }
          : current,
      );
      setWarmAlert({
        title: 'Task completed',
        message: 'Task marked complete and photo uploaded successfully.',
      });
    })();
  };

  return (
    <View style={styles.root}>
      <WarmAlertDialog
        visible={warmAlert != null}
        title={warmAlert?.title ?? ''}
        message={warmAlert?.message ?? ''}
        onDismiss={() => setWarmAlert(null)}
      />
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
        {loading ? <Text style={styles.infoText}>Loading task details...</Text> : null}
        {!loading && error ? <Text style={styles.infoText}>{error}</Text> : null}
        {/* Main task card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.titleIcon, { backgroundColor: taskTint }]}>
              <Feather name={categoryIcon} size={22} color="#fff" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.taskTitle}>{title}</Text>
              <Text style={styles.roomLabel}>{detail.room}</Text>
            </View>
            {task?.isCompleted ? (
              <View style={styles.completedPill}>
                <Feather name="check" size={12} color="#fff" />
                <Text style={styles.completedPillText}>Completed</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.description}>{detail.description}</Text>
          <View style={styles.metaBlock}>
            <MetaRow icon="calendar" label={detail.whenLabel} />
            {detail.completedLabel ? (
              <MetaRow icon="check-circle" label={`Completed ${detail.completedLabel}`} />
            ) : null}
            <MetaRow icon="refresh-cw" label={detail.repeatLabel} />
            <MetaRow icon="tag" label={detail.tagLabel} />
          </View>
        </View>

        {/* Photos */}
        <Pressable
          onPress={() => {
            if (task?.isCompleted) {
              return;
            }
            void pickTaskPhoto();
          }}
          disabled={task?.isCompleted}
          style={({ pressed }) => [styles.card, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Upload or update task photo">
          <View style={styles.photosHeader}>
            <Text style={styles.sectionLabelPhotos}>PHOTOS</Text>
            <Feather name="camera" size={18} color={C.muted} />
          </View>
          {photo?.uri || task?.photoUrl ? (
            <Image
              source={{ uri: photo?.uri ?? task?.photoUrl ?? undefined }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Tap to upload photo</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={onComplete}
          disabled={busy || task?.isCompleted === true}
          style={({ pressed }) => [
            styles.btnPrimary,
            { backgroundColor: taskTint },
            (busy || task?.isCompleted) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mark as complete with photo">
          {busy ? (
            <View style={styles.btnBusyRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.btnPrimaryText}>Uploading photo...</Text>
            </View>
          ) : (
            <Text style={styles.btnPrimaryText}>
              {task?.isCompleted ? 'Completed' : 'Mark as Complete'}
            </Text>
          )}
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
  infoText: {
    color: C.body,
    fontSize: 15,
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
  cardHeaderText: {
    flex: 1,
    paddingTop: 2,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#2F8D77',
    shadowColor: '#2F8D77',
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  completedPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  taskTitle: {
    fontSize: 17,
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
  sectionLabelPhotos: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.muted,
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
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
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
  btnBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  btnDisabled: {
    opacity: 0.62,
  },
});
