import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../../theme/theme';
import { Surface } from '../../components/Surface';
import { GradientButton } from '../../components/GradientButton';
import { TopHeader } from '../../components/TopHeader';
import { CreateMissionCardModal } from '../../components/CreateMissionCardModal';

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
    <Surface style={styles.card}>
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

  return (
    <View style={styles.root}>
      <TopHeader />

      <CreateMissionCardModal
        visible={missionModalVisible}
        onClose={() => setMissionModalVisible(false)}
        onCreate={_selectedIds => {
          setMissionModalVisible(false);
          // TODO: share selected mission tasks with Cal / persist
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>GENTLE GUIDANCE</Text>
        <Text style={styles.h1}>What Matters Now</Text>

        <FocusCard
          iconColor={EveCalTheme.colors.softBlue}
          iconName="smile"
          title="Timmy has soccer"
          subtitle="Riverside Park, Field 3"
          tag="Cal"
          time="10:00 AM"
        />
        <FocusCard
          iconColor={EveCalTheme.colors.softRose}
          iconName="coffee"
          title="Dinner: Pasta"
          subtitle="New recipe to try"
          tag="Eve"
          time="6:00 PM"
        />
        <FocusCard
          iconColor={EveCalTheme.colors.softSand}
          iconName="dollar-sign"
          title="Water bill due"
          subtitle="Account #12345"
          tag="Cal"
          time="Today"
        />

        <GradientButton
          title="Create Mission Card"
          iconName="send"
          onPress={() => setMissionModalVisible(true)}
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
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28, gap: 14 },
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

