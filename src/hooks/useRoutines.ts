import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllRoutines, getRoutinesByCategory } from '../db/queries';
import type { Routine, RoutineCategory } from '../types';

export function useRoutines(category?: RoutineCategory | 'All') {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      const fetch = async () => {
        const data =
          !category || category === 'All'
            ? await getAllRoutines()
            : await getRoutinesByCategory(category);
        if (!cancelled) {
          setRoutines(data);
          setLoading(false);
        }
      };
      fetch().catch(console.error);
      return () => { cancelled = true; };
    }, [category])
  );

  return { routines, loading };
}
