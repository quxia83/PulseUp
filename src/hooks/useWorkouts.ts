import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllWorkouts } from '../db/queries';
import type { Workout } from '../types';

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllWorkouts();
      setWorkouts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // useFocusEffect requires a sync callback; wrap the async load call
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { workouts, loading, refresh: load };
}
