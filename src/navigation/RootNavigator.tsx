import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import HistoryStack from './HistoryStack';
import RoutinesStack from './RoutinesStack';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { RootStackParamList, RootTabParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
            HomeTab: 'barbell-outline',
            RoutinesTab: 'library-outline',
            StatsTab: 'bar-chart-outline',
            HistoryTab: 'time-outline',
            ProfileTab: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#8E8E93',
      })}
    >
      <Tab.Screen name="RoutinesTab" component={RoutinesStack} options={{ title: 'Routines' }} />
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Workout' }} />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{ title: 'Stats', headerShown: true, headerTitle: 'Stats' }}
      />
      <Tab.Screen name="HistoryTab" component={HistoryStack} options={{ title: 'History' }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: true, headerTitle: 'My Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="BottomTabs" component={BottomTabs} />
      <Root.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ presentation: 'fullScreenModal', headerShown: false }}
      />
    </Root.Navigator>
  );
}
