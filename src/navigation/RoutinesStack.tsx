import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutinesScreen from '../screens/RoutinesScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import type { RoutinesStackParamList } from './types';

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export default function RoutinesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Routines" component={RoutinesScreen} options={{ title: 'Routines' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Routine' }} />
      <Stack.Screen
        name="CreateRoutine"
        component={CreateRoutineScreen}
        options={{ title: 'Create Routine', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
