import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../theme/theme';

export type MissionTaskOption = {
  id: string;
  title: string;
  timeLabel: string;
  iconName: string;
  iconBg: string;
};

const DEFAULT_TASKS: MissionTaskOption[] = [
  {
    id: '1',
    title: 'Timmy has soccer',
    timeLabel: '10:00 AM',
    iconName: 'smile',
    iconBg: '#7DAFFF',
  },
  {
    id: '2',
    title: 'Dinner: Pasta',
    timeLabel: '6:00 PM',
    iconName: 'coffee',
    iconBg: '#D4A574',
  },
  {
    id: '3',
    title: 'Water bill due',
    timeLabel: 'Today',
    iconName: 'dollar-sign',
    iconBg: '#9AAE7A',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (selectedIds: string[]) => void;
  tasks?: MissionTaskOption[];
};

export function CreateMissionCardModal({
  visible,
  onClose,
  onCreate,
  tasks = DEFAULT_TASKS,
}: Props) {
  const { height } = useWindowDimensions();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!visible) {
      setSelected(new Set());
    }
  }, [visible]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = selected.size;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { maxHeight: height * 0.78 }]}
          onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>Create Mission Card</Text>
          <Text style={styles.subtitle}>
            Select the tasks you want to share with Cal
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {tasks.map(task => {
              const isOn = selected.has(task.id);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => toggle(task.id)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isOn }}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: task.iconBg }]}>
                    <Feather name={task.iconName} size={20} color="#fff" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{task.title}</Text>
                    <Text style={styles.rowMeta}>{task.timeLabel}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      isOn && styles.radioOuterSelected,
                    ]}>
                    {isOn ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.btnPressed,
              ]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onCreate([...selected])}
              disabled={count === 0}
              style={({ pressed }) => [
                styles.createBtn,
                count === 0 && styles.createBtnDisabled,
                pressed && count > 0 && styles.btnPressed,
              ]}>
              <Text
                style={[
                  styles.createText,
                  count === 0 && styles.createTextDisabled,
                ]}>
                Create ({count})
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 36, 34, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  sheet: {
    backgroundColor: '#FDFBF8',
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    color: EveCalTheme.colors.text,
    fontFamily: EveCalTheme.typography.serif,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(58,45,42,0.48)',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(58,45,42,0.12)',
    backgroundColor: '#fff',
  },
  rowPressed: {
    opacity: 0.92,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(58,45,42,0.92)',
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(58,45,42,0.42)',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(58,45,42,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: EveCalTheme.colors.premiumBrown,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: EveCalTheme.colors.premiumBrown,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(58,45,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(58,45,42,0.75)',
  },
  createBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9C4A8',
  },
  createBtnDisabled: {
    opacity: 0.45,
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createTextDisabled: {
    color: 'rgba(255,255,255,0.85)',
  },
  btnPressed: {
    opacity: 0.88,
  },
});
