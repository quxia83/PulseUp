import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, saveProfile } from '../db/queries';
import type { UserProfile } from '../types';

const EMPTY: UserProfile = {
  weight_kg: null,
  target_weight_kg: null,
  height_cm: null,
  age: null,
  fitness_goal: null,
  experience_level: null,
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getProfile().then(p => {
        if (!cancelled) { setProfile(p); setLoading(false); }
      });
      return () => { cancelled = true; };
    }, [])
  );

  async function save(updated: UserProfile) {
    setProfile(updated);
    await saveProfile(updated);
  }

  return { profile, save, loading };
}
