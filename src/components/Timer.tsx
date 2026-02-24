import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatElapsed } from '../hooks/useTimer';

interface Props {
  elapsed: number;
}

export default function Timer({ elapsed }: Props) {
  return <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    fontWeight: '200',
    color: '#FF6B35',
    letterSpacing: 2,
  },
});
