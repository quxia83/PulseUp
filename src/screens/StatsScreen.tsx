import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStats } from '../hooks/useStats';

type RangeKey = '7D' | '30D' | '3M' | '6M' | '1Y' | 'All';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7D',  label: '7D',   days: 7 },
  { key: '30D', label: '30D',  days: 30 },
  { key: '3M',  label: '3M',   days: 90 },
  { key: '6M',  label: '6M',   days: 180 },
  { key: '1Y',  label: '1Y',   days: 365 },
  { key: 'All', label: 'All',  days: null },
];

function sinceUnixForDays(days: number | null): number | undefined {
  if (days === null) return undefined;
  return Math.floor(Date.now() / 1000) - days * 86400;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const BAR_COLOR = '#FF6B35';
const BAR_COLOR_DIM = '#FFD5C2';

// ---------- Pure-RN Bar Chart ----------
function PureBarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  const BAR_H = 140;
  return (
    <View style={barStyles.root}>
      {values.map((v, i) => {
        const barH = Math.max((v / max) * BAR_H, v > 0 ? 6 : 2);
        return (
          <View key={i} style={barStyles.col}>
            {v > 0 && (
              <Text style={barStyles.topLabel}>{v}</Text>
            )}
            <View
              style={[
                barStyles.bar,
                { height: barH, backgroundColor: v > 0 ? BAR_COLOR : BAR_COLOR_DIM },
              ]}
            />
            <Text style={barStyles.bottomLabel} numberOfLines={1}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '60%', borderRadius: 5, minHeight: 2 },
  topLabel: { fontSize: 10, fontWeight: '700', color: BAR_COLOR, marginBottom: 3 },
  bottomLabel: { fontSize: 9, color: '#8E8E93', marginTop: 5, textAlign: 'center' },
});

// ---------- Pure-RN Line Chart ----------
function PureLineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  const CHART_H = 120;
  const DOT = 7;
  const chartWidth = SCREEN_WIDTH - 32 - 32; // card padding × 2

  // y position (top-origin) for a value
  const yFor = (v: number) => CHART_H - Math.round((v / max) * CHART_H);

  // x centre for column i
  const colW = chartWidth / values.length;
  const xFor = (i: number) => colW * i + colW / 2;

  return (
    <View style={lineStyles.root}>
      {/* Lines between dots */}
      <View style={[StyleSheet.absoluteFill, lineStyles.linesLayer]} pointerEvents="none">
        {values.map((v, i) => {
          if (i === 0) return null;
          const x1 = xFor(i - 1);
          const y1 = yFor(values[i - 1]);
          const x2 = xFor(i);
          const y2 = yFor(v);
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: length,
                height: 2,
                backgroundColor: BAR_COLOR,
                opacity: 0.5,
                top: cy - 1,
                left: cx - length / 2,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
      </View>

      {/* Dots */}
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            lineStyles.dot,
            {
              position: 'absolute',
              top: yFor(v) - DOT / 2,
              left: xFor(i) - DOT / 2,
            },
          ]}
        />
      ))}

      {/* X-axis labels (below the chart area) */}
      <View style={[lineStyles.labelsRow, { width: chartWidth }]}>
        {labels.map((l, i) => (
          <Text key={i} style={lineStyles.label} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  root: {
    height: 160,
    marginTop: 12,
    position: 'relative',
  },
  linesLayer: { top: 0, left: 0 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BAR_COLOR,
    borderWidth: 2,
    borderColor: '#fff',
  },
  labelsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  label: {
    flex: 1,
    fontSize: 9,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

// ---------- Main screen ----------

export default function StatsScreen() {
  const [range, setRange] = useState<RangeKey>('All');
  const selectedDays = RANGES.find(r => r.key === range)?.days ?? null;
  const { stats, weekly, monthly, topExercises, prs, loading } = useStats(sinceUnixForDays(selectedDays));
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!stats && !loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No workouts yet.</Text>
        <Text style={styles.emptyHint}>Start training to see your stats!</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      {/* Date range pills */}
      <View style={styles.rangeRow}>
        {RANGES.map(r => (
          <Pressable
            key={r.key}
            style={[styles.rangePill, range === r.key && styles.rangePillActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[styles.rangePillText, range === r.key && styles.rangePillTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Summary tiles */}
      {stats && (
        <View style={styles.tilesGrid}>
          <StatTile label="Total Workouts" value={String(stats.totalWorkouts)} />
          <StatTile label="Current Streak" value={`${stats.currentStreak}d`} />
          <StatTile label="Longest Streak" value={`${stats.longestStreak}d`} />
          <StatTile label="Total Volume" value={`${(stats.totalVolume / 1000).toFixed(1)}k lbs`} />
        </View>
      )}

      {/* Weekly bar chart */}
      {weekly.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Workouts per Week</Text>
          <PureBarChart
            values={weekly.map(w => w.count)}
            labels={weekly.map(w => w.weekLabel)}
          />
        </View>
      )}

      {/* Monthly line chart */}
      {monthly.length > 0 && monthly.some(m => m.volume > 0) && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Volume per Month (lbs)</Text>
          <PureLineChart
            values={monthly.map(m => m.volume)}
            labels={monthly.map(m => m.monthLabel)}
          />
        </View>
      )}

      {/* Top exercises */}
      {topExercises.length > 0 && (
        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Most Performed Exercises</Text>
          {topExercises.map((ex, i) => (
            <View key={ex.name} style={styles.listRow}>
              <Text style={styles.rank}>#{i + 1}</Text>
              <Text style={styles.listName}>{ex.name}</Text>
              <Text style={styles.listValue}>{ex.count}×</Text>
            </View>
          ))}
        </View>
      )}

      {/* Personal records */}
      {prs.length > 0 && (
        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          {prs.map(pr => (
            <View key={pr.name} style={styles.listRow}>
              <Text style={styles.listName}>{pr.name}</Text>
              <Text style={styles.listValue}>{pr.max_weight_kg} lbs</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#3C3C43' },
  emptyHint: { fontSize: 14, color: '#8E8E93' },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tileValue: { fontSize: 28, fontWeight: '800', color: '#FF6B35' },
  tileLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginTop: 4, textAlign: 'center' },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  rank: { fontSize: 13, fontWeight: '700', color: '#8E8E93', width: 28 },
  listName: { flex: 1, fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  listValue: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rangePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 2,
  },
  rangePillActive: { backgroundColor: '#FF6B35' },
  rangePillText: { fontSize: 12, fontWeight: '600', color: '#3C3C43' },
  rangePillTextActive: { color: '#fff' },
});
