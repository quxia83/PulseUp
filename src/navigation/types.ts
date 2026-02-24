import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ReminderSettings: undefined;
  ActiveWorkout: undefined;
};

export type HistoryStackParamList = {
  History: undefined;
  WorkoutDetail: { workoutId: number };
};

export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'Home'>;
export type ActiveWorkoutScreenProps = NativeStackScreenProps<HomeStackParamList, 'ActiveWorkout'>;
export type ReminderSettingsScreenProps = NativeStackScreenProps<HomeStackParamList, 'ReminderSettings'>;
export type HistoryScreenProps = NativeStackScreenProps<HistoryStackParamList, 'History'>;
export type WorkoutDetailScreenProps = NativeStackScreenProps<HistoryStackParamList, 'WorkoutDetail'>;
export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<RootTabParamList, T>;
