import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkouts } from '../hooks/useWorkouts';
import WorkoutCard from '../components/WorkoutCard';
import type { HistoryScreenProps } from '../navigation/types';

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { workouts, loading } = useWorkouts();
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      data={workouts}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => (
        <WorkoutCard
          workout={item}
          onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        />
      )}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No workouts logged yet.</Text>
          </View>
        ) : null
      }
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, backgroundColor: '#F2F2F7', flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#8E8E93', fontSize: 16 },
});
