import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoutines } from '../hooks/useRoutines';
import { deleteRoutine } from '../db/queries';
import type { Routine, RoutineCategory } from '../types';
import type { RoutinesScreenProps } from '../navigation/types';

const CATEGORIES: Array<RoutineCategory | 'All'> = [
  'All', 'Strength', 'Cardio', 'HIIT', 'Mobility',
  'Upper Body', 'Lower Body', 'Full Body', 'Core',
];

const CATEGORY_COLORS: Record<string, string> = {
  Strength: '#FF6B35',
  Cardio: '#34C759',
  HIIT: '#FF3B30',
  Mobility: '#5AC8FA',
  'Upper Body': '#007AFF',
  'Lower Body': '#AF52DE',
  'Full Body': '#FF9500',
  Core: '#FFCC00',
};

export default function RoutinesScreen({ navigation }: RoutinesScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<RoutineCategory | 'All'>('All');
  const { routines, loading } = useRoutines(selectedCategory);
  const insets = useSafeAreaInsets();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('CreateRoutine', undefined)}>
          <Ionicons name="add" size={26} color="#FF6B35" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleKebab = useCallback((routine: Routine) => {
    Alert.alert(routine.name, undefined, [
      {
        text: 'Edit',
        onPress: () => navigation.navigate('CreateRoutine', { routineId: routine.id }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Routine?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await deleteRoutine(routine.id).catch(console.error);
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Routine }) => {
    const color = CATEGORY_COLORS[item.category] ?? '#8E8E93';
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('RoutineDetail', { routineId: item.id })}
      >
        <View style={styles.cardMain}>
          <Text style={styles.cardName}>{item.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.categoryText, { color }]}>{item.category}</Text>
          </View>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
        {item.is_builtin === 1 ? (
          <Ionicons name="lock-closed-outline" size={16} color="#8E8E93" />
        ) : (
          <Pressable onPress={() => handleKebab(item)} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
          </Pressable>
        )}
      </Pressable>
    );
  }, [navigation, handleKebab]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsRow}
        contentContainerStyle={styles.pillsContent}
      >
        {CATEGORIES.map(cat => {
          const active = cat === selectedCategory;
          return (
            <Pressable
              key={cat}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={routines}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No routines yet.</Text>
              <Text style={styles.emptyHint}>Tap + to create your first routine!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  pillsRow: { maxHeight: 52, flexShrink: 0 },
  pillsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E5E5EA',
  },
  pillActive: { backgroundColor: '#FF6B35' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#3C3C43' },
  pillTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMain: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  categoryBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#8E8E93' },
  empty: { flex: 1, alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#3C3C43', fontSize: 17, fontWeight: '600' },
  emptyHint: { color: '#8E8E93', fontSize: 14 },
});
