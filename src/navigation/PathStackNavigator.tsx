import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PathStackParamList } from './types';
import { PathScreen } from '../screens/main/PathScreen';
import { TaskListScreen } from '../screens/main/TaskListScreen';
import { TaskDetailScreen } from '../screens/main/TaskDetailScreen';

const Stack = createNativeStackNavigator<PathStackParamList>();

export function PathStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="PathHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F8F8F8' },
      }}>
      <Stack.Screen name="PathHome" component={PathScreen} />
      <Stack.Screen name="TaskList" component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
  );
}
