import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import RoutinesScreen from '../screens/RoutinesScreen';
import RoutineDetailScreen from '../screens/RoutineDetailScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import type { RoutinesStackParamList } from './types';

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export default function RoutinesStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Routines" component={RoutinesScreen} options={{ title: t('nav.routines') }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: t('nav.routine') }} />
      <Stack.Screen
        name="CreateRoutine"
        component={CreateRoutineScreen}
        options={{ title: t('nav.create_routine'), presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
