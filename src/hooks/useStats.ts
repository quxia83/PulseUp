import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  getWorkoutStats,
  getWeeklyWorkoutCounts,
  getMonthlyVolume,
  getTopExercises,
  getPersonalRecords,
} from '../db/queries';
import type {
  WorkoutStats,
  WeeklyWorkoutCount,
  MonthlyVolume,
  ExerciseFrequency,
  PersonalRecord,
} from '../types';

interface StatsData {
  stats: WorkoutStats | null;
  weekly: WeeklyWorkoutCount[];
  monthly: MonthlyVolume[];
  topExercises: ExerciseFrequency[];
  prs: PersonalRecord[];
  loading: boolean;
}

export function useStats(sinceUnix?: number): StatsData {
  const [data, setData] = useState<StatsData>({
    stats: null,
    weekly: [],
    monthly: [],
    topExercises: [],
    prs: [],
    loading: true,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        const [stats, weekly, monthly, topExercises, prs] = await Promise.all([
          getWorkoutStats(sinceUnix),
          getWeeklyWorkoutCounts(8),
          getMonthlyVolume(6),
          getTopExercises(5, sinceUnix),
          getPersonalRecords(sinceUnix),
        ]);
        if (!cancelled) {
          setData({ stats, weekly, monthly, topExercises, prs, loading: false });
        }
      };
      load().catch(console.error);
      return () => { cancelled = true; };
    }, [sinceUnix])
  );

  return data;
}
