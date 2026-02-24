import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { Workout } from '../types';
import { formatElapsed } from '../hooks/useTimer';

interface Props {
  workout: Workout;
  onPress: () => void;
}

function formatDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function WorkoutCard({ workout, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.date}>{formatDate(workout.created_at)}</Text>
        {workout.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {workout.notes}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.duration}>{formatElapsed(workout.duration_seconds)}</Text>
        {workout.video_uri ? <Text style={styles.videoTag}>📹</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  left: { flex: 1 },
  date: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  notes: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  duration: { fontSize: 14, color: '#3C3C43', fontVariant: ['tabular-nums'] },
  videoTag: { fontSize: 16 },
});
