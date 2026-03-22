import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { JournalStackNavigator } from './JournalStackNavigator';
import { PathStackNavigator } from './PathStackNavigator';
import { FocusScreen } from '../screens/main/FocusScreen';
import { CaptureScreen } from '../screens/main/CaptureScreen';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { EveCalTheme } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_META: Record<
  keyof MainTabParamList,
  { label: string; icon: string }
> = {
  Journal: { label: 'Journal', icon: 'book-open' },
  Path: { label: 'Path', icon: 'map' },
  Focus: { label: 'Focus', icon: 'target' },
  Capture: { label: 'Capture', icon: 'circle' },
};

function EveCalTabBar({
  state,
  descriptors,
  navigation,
}: Parameters<NonNullable<React.ComponentProps<typeof Tab.Navigator>['tabBar']>>[0]) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.barWrap,
        { paddingBottom: Math.max(10, insets.bottom) },
      ]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] ?? {};
          const isFocused = state.index === index;
          const meta = TAB_META[route.name as keyof MainTabParamList] ?? {
            label:
              (options?.tabBarLabel as string | undefined) ??
              options?.title ??
              route.name,
            icon: 'circle',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              hitSlop={10}
              android_ripple={null}>
              <View style={styles.item}>
                <Feather
                  name={meta.icon}
                  size={20}
                  color={
                    isFocused
                      ? 'rgba(142,119,110,0.95)'
                      : 'rgba(142,119,110,0.55)'
                  }
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused
                        ? 'rgba(142,119,110,0.95)'
                        : 'rgba(142,119,110,0.55)',
                    },
                  ]}>
                  {meta.label.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={props => <EveCalTabBar {...props} />}>
      <Tab.Screen
        name="Journal"
        component={JournalStackNavigator}
        options={{}}
      />
      <Tab.Screen
        name="Path"
        component={PathStackNavigator}
        options={{}}
      />
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{}}
      />
      <Tab.Screen
        name="Capture"
        component={CaptureScreen}
        options={{}}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(58,45,42,0.06)',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 6,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    paddingVertical: 2,
  },
  item: {
    height: 66,
    width: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(142,119,110,0.55)',
  },
});

