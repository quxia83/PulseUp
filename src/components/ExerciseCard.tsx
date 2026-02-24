import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  Vibration,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import SetRow from './SetRow';
import { useWorkout } from '../context/WorkoutContext';
import { pickVideoFromGallery } from '../services/videoService';
import { isYouTubeUrl, isDirectVideoUrl } from '../utils/videoUtils';
import { getExerciseNameSuggestions, getLastSetsForExercise } from '../db/queries';
import type { ActiveExercise } from '../types';

/**
 * Smart rest duration based on set intensity (weight × reps).
 *
 * Bodyweight / cardio  →  45 s
 * Light isolation       →  60 s   (volume < 100)
 * Moderate hypertrophy  →  90 s   (220–659)
 * Heavy compound        → 120 s   (660–1099)
 * Max-effort strength   → 180 s   (1100–1759)
 * Elite / very heavy    → 240 s   (1760+)
 */
function calcRestDuration(reps: number, weight_kg: number): number {
  const volume = reps * weight_kg;
  if (volume === 0) return reps >= 20 ? 45 : 60;
  if (volume >= 1760) return 240;
  if (volume >= 1100) return 180;
  if (volume >= 660)  return 120;
  if (volume >= 220)  return 90;
  return 60;
}

function setLabel(reps: number, weight_kg: number): string {
  return weight_kg > 0 ? `${reps} reps at ${weight_kg} pounds` : `${reps} reps, bodyweight`;
}

// Lazy-load expo-speech so missing native module doesn't crash the card
async function safeSpeak(text: string) {
  try {
    const Speech = await import('expo-speech');
    Speech.speak(text, { language: 'en-US' });
  } catch {
    // Native module not yet linked — silent fallback
  }
}
async function safeSpeechStop() {
  try {
    const Speech = await import('expo-speech');
    Speech.stop();
  } catch { /* ignore */ }
}

interface Props {
  exercise: ActiveExercise;
}

export default function ExerciseCard({ exercise }: Props) {
  const { dispatch } = useWorkout();
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Rest timer state (local, no video exercises only) ──
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restForSet, setRestForSet] = useState<number | null>(null); // index of upcoming set

  const hasVideo = !!exercise.videoUri;

  // ── Auto-announce Set 1 when exercise card first appears (no video only) ──
  const announcedFirstSet = useRef(false);
  useEffect(() => {
    if (hasVideo || announcedFirstSet.current) return;
    if (!exercise.name || exercise.sets.length === 0) return;
    announcedFirstSet.current = true;
    const s = exercise.sets[0];
    const text = `Set 1. ${exercise.name}. ${setLabel(s.reps, s.weight_kg)}.`;
    // Small delay so it doesn't clash with any previous speech
    const id = setTimeout(() => safeSpeak(text), 600);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown tick
  useEffect(() => {
    if (restSecondsLeft === null) return;

    if (restSecondsLeft === 0) {
      // End of rest — long double buzz + announce next set
      Vibration.vibrate([0, 200, 100, 200]);
      if (restForSet !== null) {
        const s = exercise.sets[restForSet];
        const text = s
          ? `Time for set ${restForSet + 1}. ${exercise.name}. ${setLabel(s.reps, s.weight_kg)}.`
          : `Time for set ${restForSet + 1}. ${exercise.name}.`;
        safeSpeak(text);
      }
      setRestSecondsLeft(null);
      setRestForSet(null);
      return;
    }

    // Verbal countdown at 3, 2, 1
    if (restSecondsLeft <= 3) {
      safeSpeak(String(restSecondsLeft));
    }

    const id = setTimeout(() => setRestSecondsLeft(prev => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [restSecondsLeft, restForSet, exercise]);

  function handleSetDone(index: number) {
    if (completedSets.has(index)) {
      // Un-mark
      const next = new Set(completedSets);
      next.delete(index);
      setCompletedSets(next);
      if (restForSet === index + 1) {
        setRestSecondsLeft(null);
        setRestForSet(null);
        safeSpeechStop();
      }
      return;
    }

    const next = new Set(completedSets);
    next.add(index);
    setCompletedSets(next);

    const nextIndex = index + 1;
    if (nextIndex < exercise.sets.length) {
      // Compute smart rest from the set just completed
      const doneSet = exercise.sets[index];
      const restDuration = calcRestDuration(doneSet.reps, doneSet.weight_kg);
      // Start rest — short buzz + spoken start cue
      Vibration.vibrate(80);
      safeSpeak(`Rest. ${restDuration} seconds.`);
      setRestForSet(nextIndex);
      setRestSecondsLeft(restDuration);
    } else {
      // All sets done — celebratory buzz
      Vibration.vibrate([0, 100, 80, 100, 80, 200]);
      safeSpeak(`${exercise.name} complete!`);
    }
  }

  function handleSkipRest() {
    if (restForSet !== null) {
      const s = exercise.sets[restForSet];
      const text = s
        ? `Set ${restForSet + 1}. ${exercise.name}. ${setLabel(s.reps, s.weight_kg)}.`
        : `Set ${restForSet + 1}. ${exercise.name}.`;
      safeSpeak(text);
    }
    setRestSecondsLeft(null);
    setRestForSet(null);
  }

  // ── Video player ──
  const directUri =
    exercise.videoUri && isDirectVideoUrl(exercise.videoUri) ? exercise.videoUri : null;
  const player = useVideoPlayer(directUri, p => { p.loop = false; });

  // ── Exercise name autocomplete ──
  function handleNameChange(name: string) {
    dispatch({ type: 'UPDATE_EXERCISE_NAME', localId: exercise.localId, name });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await getExerciseNameSuggestions(name).catch(() => []);
      setSuggestions(results);
    }, 180);
  }

  async function handlePickSuggestion(name: string) {
    setSuggestions([]);
    dispatch({ type: 'UPDATE_EXERCISE_NAME', localId: exercise.localId, name });
    const lastSets = await getLastSetsForExercise(name).catch(() => []);
    if (lastSets.length > 0) {
      const currentCount = exercise.sets.length;
      for (let i = currentCount - 1; i >= 0; i--) {
        dispatch({ type: 'REMOVE_SET', localId: exercise.localId, setIndex: i });
      }
      for (let i = 0; i < lastSets.length; i++) {
        dispatch({ type: 'ADD_SET', localId: exercise.localId });
        dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field: 'reps', value: lastSets[i].reps });
        dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field: 'weight_kg', value: lastSets[i].weight_kg });
      }
    }
    // Reset done state when exercise changes
    setCompletedSets(new Set());
    setRestSecondsLeft(null);
    setRestForSet(null);
  }

  // ── Video actions ──
  function handleAddVideo() {
    Alert.alert('Add Reference Video', 'Choose a source', [
      {
        text: 'Camera Roll',
        onPress: async () => {
          try {
            const result = await pickVideoFromGallery();
            if (result) dispatch({ type: 'SET_EXERCISE_VIDEO', localId: exercise.localId, uri: result.uri });
          } catch {
            Alert.alert('Permission Denied', 'Media library access is required.');
          }
        },
      },
      { text: 'Paste URL', onPress: () => { setUrlInput(''); setUrlModalVisible(true); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleUseUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    dispatch({ type: 'SET_EXERCISE_VIDEO', localId: exercise.localId, uri: trimmed });
    setUrlModalVisible(false);
  }

  function handleWatch() {
    const uri = exercise.videoUri;
    if (!uri) return;
    if (isYouTubeUrl(uri)) Linking.openURL(uri);
    else setPlayerModalVisible(true);
  }

  function handleRemoveVideo() {
    dispatch({ type: 'SET_EXERCISE_VIDEO', localId: exercise.localId, uri: null });
  }

  // ── Render ──
  const allDone = exercise.sets.length > 0 && exercise.sets.every((_, i) => completedSets.has(i));

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      {/* Name + autocomplete */}
      <View style={styles.header}>
        <View style={styles.nameWrapper}>
          <TextInput
            style={styles.nameInput}
            placeholder="Exercise name"
            value={exercise.name}
            onChangeText={handleNameChange}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {suggestions.map(s => (
                <Pressable key={s} style={styles.suggestionRow} onPress={() => handlePickSuggestion(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Pressable onPress={() => dispatch({ type: 'REMOVE_EXERCISE', localId: exercise.localId })}>
          <Text style={styles.deleteText}>Remove</Text>
        </Pressable>
      </View>

      {/* Video row */}
      <View style={styles.videoRow}>
        {exercise.videoUri ? (
          <>
            <Pressable onPress={handleWatch} style={styles.watchBtn}>
              <Text style={styles.watchText}>▶ Watch</Text>
            </Pressable>
            <Pressable onPress={handleRemoveVideo} style={styles.removeVideoBtn}>
              <Text style={styles.removeVideoText}>Remove</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={handleAddVideo} style={styles.addVideoBtn}>
            <Text style={styles.addVideoText}>+ Add Video</Text>
          </Pressable>
        )}
      </View>

      {/* Sets */}
      {exercise.sets.map((set, i) => (
        <View key={i} style={styles.setRowWrapper}>
          <View style={{ flex: 1 }}>
            <SetRow
              setIndex={i}
              data={set}
              onUpdate={(field, value) =>
                dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field, value })
              }
              onRemove={() =>
                dispatch({ type: 'REMOVE_SET', localId: exercise.localId, setIndex: i })
              }
            />
          </View>
          {/* Done button — only shown when no video */}
          {!hasVideo && (
            <Pressable
              onPress={() => handleSetDone(i)}
              style={[styles.doneBtn, completedSets.has(i) && styles.doneBtnActive]}
              hitSlop={6}
            >
              <Text style={[styles.doneBtnText, completedSets.has(i) && styles.doneBtnTextActive]}>
                {completedSets.has(i) ? '✓' : '○'}
              </Text>
            </Pressable>
          )}
        </View>
      ))}

      {/* Rest timer — only when no video */}
      {!hasVideo && restSecondsLeft !== null && (
        <View style={styles.restBanner}>
          <View style={styles.restInfo}>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.restTimer}>{restSecondsLeft}s</Text>
            <Text style={styles.restNext}>
              Next: Set {(restForSet ?? 0) + 1}
              {exercise.sets[restForSet ?? 0]
                ? ` · ${exercise.sets[restForSet ?? 0].reps} reps` +
                  (exercise.sets[restForSet ?? 0].weight_kg > 0
                    ? ` @ ${exercise.sets[restForSet ?? 0].weight_kg} lbs`
                    : ' · BW')
                : ''}
            </Text>
          </View>
          <Pressable onPress={handleSkipRest} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip ▶</Text>
          </Pressable>
        </View>
      )}

      {/* All sets done badge */}
      {!hasVideo && allDone && exercise.sets.length > 0 && restSecondsLeft === null && (
        <View style={styles.completeBadge}>
          <Text style={styles.completeText}>✓ Exercise complete</Text>
        </View>
      )}

      <Pressable
        style={styles.addSetBtn}
        onPress={() => dispatch({ type: 'ADD_SET', localId: exercise.localId })}
      >
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>

      {/* URL input modal */}
      <Modal visible={urlModalVisible} transparent animationType="fade" onRequestClose={() => setUrlModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setUrlModalVisible(false)}>
          <Pressable style={styles.urlModalCard} onPress={() => {}}>
            <Text style={styles.urlModalTitle}>Paste Video URL</Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://..."
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            <View style={styles.urlModalButtons}>
              <Pressable onPress={() => setUrlModalVisible(false)} style={styles.urlCancelBtn}>
                <Text style={styles.urlCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUseUrl} style={styles.urlUseBtn}>
                <Text style={styles.urlUseText}>Use URL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fullscreen player modal */}
      <Modal
        visible={playerModalVisible}
        animationType="slide"
        onRequestClose={() => { player.pause(); setPlayerModalVisible(false); }}
      >
        <View style={styles.playerContainer}>
          <VideoView player={player} style={styles.videoView} allowsFullscreen nativeControls contentFit="contain" />
          <Pressable onPress={() => { player.pause(); setPlayerModalVisible(false); }} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕  Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDone: { borderWidth: 1.5, borderColor: '#34C759' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nameWrapper: { flex: 1, marginRight: 12, zIndex: 10 },
  nameInput: { fontSize: 17, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: '#D1D1D6', paddingBottom: 4 },
  suggestionBox: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D1D6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 8, zIndex: 100, overflow: 'hidden',
  },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  suggestionText: { fontSize: 15, color: '#1C1C1E' },
  deleteText: { color: '#FF3B30', fontSize: 13, paddingTop: 4 },
  videoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  watchBtn: { backgroundColor: '#FF6B35', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  watchText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  removeVideoBtn: { paddingHorizontal: 4 },
  removeVideoText: { color: '#FF3B30', fontSize: 12 },
  addVideoBtn: { borderWidth: 1, borderColor: '#C6C6C8', borderStyle: 'dashed', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  addVideoText: { color: '#8E8E93', fontSize: 12 },
  // Set row + done button
  setRowWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: '#D1D1D6',
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnActive: { backgroundColor: '#34C759', borderColor: '#34C759' },
  doneBtnText: { fontSize: 14, color: '#8E8E93' },
  doneBtnTextActive: { color: '#fff', fontWeight: '700' },
  // Rest timer banner
  restBanner: {
    marginTop: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restInfo: { flex: 1, gap: 2 },
  restLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.8 },
  restTimer: { fontSize: 26, fontWeight: '800', color: '#FF6B35' },
  restNext: { fontSize: 12, color: '#D1D1D6' },
  skipBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Complete badge
  completeBadge: { marginTop: 8, backgroundColor: '#F0FFF4', borderRadius: 8, padding: 8, alignItems: 'center' },
  completeText: { color: '#34C759', fontWeight: '700', fontSize: 13 },
  // Add set
  addSetBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  addSetText: { color: '#FF6B35', fontSize: 15 },
  // URL modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  urlModalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '85%' },
  urlModalTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  urlInput: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, padding: 10, fontSize: 14, color: '#1C1C1E', marginBottom: 14 },
  urlModalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  urlCancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  urlCancelText: { color: '#8E8E93', fontSize: 15 },
  urlUseBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  urlUseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Fullscreen player
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoView: { flex: 1 },
  closeBtn: { padding: 20, alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 17 },
});
