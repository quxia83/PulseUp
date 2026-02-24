import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ReminderSettingsScreen from '../screens/ReminderSettingsScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PulseUp' }} />
      <Stack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{ title: 'Reminders' }}
      />
    </Stack.Navigator>
  );
}
