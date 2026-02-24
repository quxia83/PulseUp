import React from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import type { SetData } from '../types';

interface Props {
  setIndex: number;
  data: SetData;
  onUpdate: (field: 'reps' | 'weight_kg', value: number) => void;
  onRemove: () => void;
}

export default function SetRow({ setIndex, data, onUpdate, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Set {setIndex + 1}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Reps"
        value={data.reps > 0 ? String(data.reps) : ''}
        onChangeText={t => onUpdate('reps', parseInt(t, 10) || 0)}
        returnKeyType="next"
        selectTextOnFocus
      />
      <Text style={styles.separator}>×</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="lbs"
        value={data.weight_kg > 0 ? String(data.weight_kg) : ''}
        onChangeText={t => onUpdate('weight_kg', parseFloat(t) || 0)}
        returnKeyType="done"
        selectTextOnFocus
      />
      <Text style={styles.unit}>lbs</Text>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 8 },
  label: { width: 48, color: '#555', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  separator: { color: '#8E8E93', fontSize: 14 },
  unit: { color: '#8E8E93', fontSize: 14, width: 20 },
  removeBtn: { marginLeft: 4 },
  removeText: { color: '#FF3B30', fontSize: 16 },
});
