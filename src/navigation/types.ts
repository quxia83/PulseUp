import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root stack: wraps tabs + ActiveWorkout modal
export type RootStackParamList = {
  BottomTabs: undefined;
  ActiveWorkout: undefined;
};

// Bottom tab param list
export type RootTabParamList = {
  HomeTab: undefined;
  RoutinesTab: undefined;
  StatsTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

// Stack param lists
export type HomeStackParamList = {
  Home: undefined;
  ReminderSettings: undefined;
};

export type RoutinesStackParamList = {
  Routines: undefined;
  RoutineDetail: { routineId: number };
  CreateRoutine: { routineId?: number } | undefined;
};

export type HistoryStackParamList = {
  History: undefined;
  WorkoutDetail: { workoutId: number };
};

// Screen props
export type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type ReminderSettingsScreenProps = NativeStackScreenProps<HomeStackParamList, 'ReminderSettings'>;

export type ActiveWorkoutScreenProps = NativeStackScreenProps<RootStackParamList, 'ActiveWorkout'>;

export type HistoryScreenProps = NativeStackScreenProps<HistoryStackParamList, 'History'>;

export type WorkoutDetailScreenProps = NativeStackScreenProps<HistoryStackParamList, 'WorkoutDetail'>;

export type RoutinesScreenProps = CompositeScreenProps<
  NativeStackScreenProps<RoutinesStackParamList, 'Routines'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RoutineDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<RoutinesStackParamList, 'RoutineDetail'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type CreateRoutineScreenProps = NativeStackScreenProps<RoutinesStackParamList, 'CreateRoutine'>;

export type StatsScreenProps = BottomTabScreenProps<RootTabParamList, 'StatsTab'>;

export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<RootTabParamList, T>;

// Global augmentation — eliminates getParent() chains
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
