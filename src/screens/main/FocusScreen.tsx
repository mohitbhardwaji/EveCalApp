import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { CreateMissionCardModal } from '../../components/CreateMissionCardModal';
import { GradientButton } from '../../components/GradientButton';
import { Surface } from '../../components/Surface';
import { TopHeader } from '../../components/TopHeader';
import {
  focusMissionTasksFingerprint,
  loadFocusMissionTasksCache,
  saveFocusMissionTasksCache,
} from '../../lib/focus/focusMissionCache';
import { getSupabase } from '../../lib/supabase/client';
import {
  addTasksToMission,
  buildTodaysMissionShareText,
  fetchTasksForMissionPicker,
  fetchTodaysMissionTaskRows,
  getOrCreateTodaysMission,
  todayIsoDate,
  type FocusMissionTaskRow,
  type MissionTaskOption,
} from '../../lib/supabase/missionsApi';
import { EveCalTheme } from '../../theme/theme';

const { height: windowHeight } = Dimensions.get('window');

function FocusCard({
  iconColor,
  iconName,
  title,
  subtitle,
  tag,
  time,
}: {
  iconColor: string;
  iconName: string;
  title: string;
  subtitle: string;
  tag: string;
  time: string;
}) {
  return (
    <Surface
      style={[
        styles.card,
        {
          shadowColor: iconColor,
          shadowOpacity: 0.24,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        },
      ]}>
      <View style={[styles.cardIcon, { backgroundColor: iconColor }]}>
        <Feather name={iconName} size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{tag}</Text>
          </View>
          <Feather name="clock" size={14} color="rgba(58,45,42,0.35)" />
          <Text style={styles.metaText}>{time}</Text>
        </View>
      </View>
    </Surface>
  );
}

export function FocusScreen() {
  const [missionModalVisible, setMissionModalVisible] = React.useState(false);
  const [missionRows, setMissionRows] = React.useState<FocusMissionTaskRow[]>(
    [],
  );
  const [listLoading, setListLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const [pickerTasks, setPickerTasks] = React.useState<MissionTaskOption[]>(
    [],
  );
  const [pickerLoading, setPickerLoading] = React.useState(false);
  const [pickerError, setPickerError] = React.useState<string | null>(null);

  const lastFingerprintRef = React.useRef<string>('');
  const missionRowCountRef = React.useRef(0);
  const userIdRef = React.useRef<string | null>(null);

  /** Today’s mission tasks are stored per user + calendar day (new day = new cache key). */
  const hydrateFromLocalOnly = React.useCallback(async () => {
    setListLoading(true);
    setListError(null);

    const {
      data: { user },
    } = await getSupabase().auth.getUser();

    if (!user) {
      userIdRef.current = null;
      lastFingerprintRef.current = '';
      missionRowCountRef.current = 0;
      setMissionRows([]);
      setListError('Not signed in');
      setListLoading(false);
      return;
    }

    userIdRef.current = user.id;
    const date = todayIsoDate();
    const cached = await loadFocusMissionTasksCache(user.id, date);

    if (cached !== null) {
      lastFingerprintRef.current = focusMissionTasksFingerprint(cached);
      missionRowCountRef.current = cached.length;
      setMissionRows(cached);
      setListError(null);
    } else {
      lastFingerprintRef.current = '';
      missionRowCountRef.current = 0;
      setMissionRows([]);
      setListError(null);
    }

    setListLoading(false);
  }, []);

  const refreshMissionTasksFromApi = React.useCallback(async () => {
    const {
      data: { user },
    } = await getSupabase().auth.getUser();

    if (!user) {
      userIdRef.current = null;
      setListError('Not signed in');
      return;
    }

    userIdRef.current = user.id;
    const date = todayIsoDate();
    const { rows, error } = await fetchTodaysMissionTaskRows();

    if (error) {
      if (missionRowCountRef.current === 0) {
        setMissionRows([]);
        setListError(error);
      }
      return;
    }

    const fp = focusMissionTasksFingerprint(rows);
    if (fp !== lastFingerprintRef.current) {
      lastFingerprintRef.current = fp;
      missionRowCountRef.current = rows.length;
      setMissionRows(rows);
      void saveFocusMissionTasksCache(user.id, date, rows);
    }
    setListError(null);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void hydrateFromLocalOnly();
    }, [hydrateFromLocalOnly]),
  );

  const onPullRefresh = React.useCallback(() => {
    setRefreshing(true);
    void (async () => {
      await refreshMissionTasksFromApi();
      setRefreshing(false);
    })();
  }, [refreshMissionTasksFromApi]);

  const openMissionModal = React.useCallback(async () => {
    setMissionModalVisible(true);
    setPickerLoading(true);
    setPickerError(null);
    const excludeIds = missionRows.map(r => r.id);
    const { tasks, error } = await fetchTasksForMissionPicker({
      excludeTaskIds: excludeIds,
    });
    setPickerTasks(tasks);
    setPickerError(error);
    setPickerLoading(false);
  }, [missionRows]);

  const handleCreateMission = React.useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;

      const mission = await getOrCreateTodaysMission();
      if (!mission.ok) {
        Alert.alert('Could not save', mission.message);
        return;
      }

      const linked = await addTasksToMission(mission.mission.id, selectedIds);
      if (!linked.ok) {
        Alert.alert('Could not add tasks', linked.message);
        return;
      }

      setMissionModalVisible(false);
      await refreshMissionTasksFromApi();
    },
    [refreshMissionTasksFromApi],
  );

  const modalMode = missionRows.length > 0 ? 'add' : 'create';
  const buttonTitle =
    missionRows.length > 0 ? 'Add tasks to mission' : 'Create Mission Card';

  const shareTodaysMission = React.useCallback(async () => {
    if (missionRows.length === 0) return;
    const message = buildTodaysMissionShareText(missionRows);
    try {
      await Share.share({
        message,
        title: "Today's mission",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not share', msg);
    }
  }, [missionRows]);

  const canShareMission =
    !listLoading && !listError && missionRows.length > 0;

  return (
    <View style={styles.root}>
      <TopHeader />

      <CreateMissionCardModal
        visible={missionModalVisible}
        onClose={() => setMissionModalVisible(false)}
        onCreate={handleCreateMission}
        tasks={pickerTasks}
        loading={pickerLoading}
        error={pickerError}
        mode={modalMode}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={EveCalTheme.colors.premiumBrown}
            colors={[EveCalTheme.colors.premiumBrown]}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { minHeight: windowHeight * 0.88 },
        ]}>
        <Text style={styles.kicker}>GENTLE GUIDANCE</Text>
        <Text style={styles.h1}>What Matters Now</Text>

        {listLoading ? (
          <View style={styles.listState}>
            <ActivityIndicator color={EveCalTheme.colors.premiumBrown} />
          </View>
        ) : listError ? (
          <Text style={styles.listError}>{listError}</Text>
        ) : missionRows.length === 0 ? (
          <Text style={styles.emptyHint}>
            No tasks on today's mission yet. Tap the button below to choose
            what you want to focus on.
            {'\n\n'}
            Pull down to sync from the server.
          </Text>
        ) : (
          missionRows.map(row => (
            <FocusCard
              key={row.id}
              iconColor={row.iconColor}
              iconName={row.iconName}
              title={row.title}
              subtitle={row.subtitle}
              tag={row.tag}
              time={row.time}
            />
          ))
        )}

        {canShareMission ? (
          <Pressable
            onPress={() => void shareTodaysMission()}
            style={({ pressed }) => [
              styles.shareRow,
              pressed && styles.shareRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Share today's mission">
            <Feather
              name="share-2"
              size={20}
              color={EveCalTheme.colors.premiumBrown}
            />
            <Text style={styles.shareRowText}>Share today's mission</Text>
          </Pressable>
        ) : null}

        <GradientButton
          title={buttonTitle}
          iconName="send"
          onPress={() => void openMissionModal()}
        />

        <Surface style={styles.quoteCard}>
          <Text style={styles.quote}>
            "One breath at a time,{"\n"}one moment of presence"
          </Text>
        </Surface>
        <Text style={styles.note}>These are gentle reminders, not demands</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EveCalTheme.colors.bg },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 14,
    flexGrow: 1,
  },
  kicker: {
    color: 'rgba(58,45,42,0.35)',
    letterSpacing: 2.6,
    fontSize: 11,
  },
  h1: {
    fontSize: 34,
    color: EveCalTheme.colors.text,
    fontFamily: EveCalTheme.typography.serif,
    marginBottom: 4,
  },
  listState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  listError: {
    color: '#B85C5C',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyHint: {
    color: EveCalTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(58,45,42,0.28)',
    backgroundColor: EveCalTheme.colors.card,
  },
  shareRowPressed: {
    opacity: 0.88,
  },
  shareRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: EveCalTheme.colors.premiumBrown,
  },
  card: {
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  cardIcon: {
    height: 46,
    width: 46,
    borderRadius: 16,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    color: EveCalTheme.colors.text,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  cardSubtitle: {
    marginTop: 2,
    color: EveCalTheme.colors.textMuted,
  },
  metaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(58,45,42,0.06)',
  },
  metaText: { color: EveCalTheme.colors.textMuted, fontSize: 12 },
  quoteCard: {
    padding: 18,
    backgroundColor: EveCalTheme.colors.cardWarm,
    borderRadius: EveCalTheme.radius.lg,
  },
  quote: {
    textAlign: 'center',
    color: EveCalTheme.colors.textMuted,
    lineHeight: 20,
  },
  note: {
    textAlign: 'center',
    color: 'rgba(58,45,42,0.35)',
    marginTop: -6,
  },
});
