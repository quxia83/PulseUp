import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  FlatList,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import SetRow from './SetRow';
import { useWorkout } from '../context/WorkoutContext';
import { pickVideoFromGallery } from '../services/videoService';
import { isYouTubeUrl, isDirectVideoUrl } from '../utils/videoUtils';
import { getExerciseNameSuggestions, getLastSetsForExercise } from '../db/queries';
import type { ActiveExercise } from '../types';

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

  const directUri =
    exercise.videoUri && isDirectVideoUrl(exercise.videoUri) ? exercise.videoUri : null;
  const player = useVideoPlayer(directUri, p => {
    p.loop = false;
  });

  function handleNameChange(name: string) {
    dispatch({ type: 'UPDATE_EXERCISE_NAME', localId: exercise.localId, name });

    // Debounce suggestion lookup
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await getExerciseNameSuggestions(name).catch(() => []);
      setSuggestions(results);
    }, 180);
  }

  async function handlePickSuggestion(name: string) {
    setSuggestions([]);
    dispatch({ type: 'UPDATE_EXERCISE_NAME', localId: exercise.localId, name });

    // Pre-fill sets from last recorded usage
    const lastSets = await getLastSetsForExercise(name).catch(() => []);
    if (lastSets.length > 0) {
      // Replace current sets with last-used sets
      // First clear existing sets by dispatching per-set updates isn't clean —
      // simplest: dispatch a dedicated sequence via ADD_SET + UPDATE_SET.
      // Instead, use SET_EXERCISE_VIDEO trick? No — we'll use the existing
      // REMOVE_SET / ADD_SET approach cleanly:
      const currentCount = exercise.sets.length;
      // Remove all existing sets (back to front)
      for (let i = currentCount - 1; i >= 0; i--) {
        dispatch({ type: 'REMOVE_SET', localId: exercise.localId, setIndex: i });
      }
      // Add sets from history
      for (let i = 0; i < lastSets.length; i++) {
        dispatch({ type: 'ADD_SET', localId: exercise.localId });
        dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field: 'reps', value: lastSets[i].reps });
        dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field: 'weight_kg', value: lastSets[i].weight_kg });
      }
    }
  }

  function handleAddVideo() {
    Alert.alert('Add Reference Video', 'Choose a source', [
      {
        text: 'Camera Roll',
        onPress: async () => {
          try {
            const result = await pickVideoFromGallery();
            if (result) {
              dispatch({ type: 'SET_EXERCISE_VIDEO', localId: exercise.localId, uri: result.uri });
            }
          } catch {
            Alert.alert('Permission Denied', 'Media library access is required.');
          }
        },
      },
      {
        text: 'Paste URL',
        onPress: () => {
          setUrlInput('');
          setUrlModalVisible(true);
        },
      },
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
    if (isYouTubeUrl(uri)) {
      Linking.openURL(uri);
    } else {
      setPlayerModalVisible(true);
    }
  }

  function handleRemoveVideo() {
    dispatch({ type: 'SET_EXERCISE_VIDEO', localId: exercise.localId, uri: null });
  }

  return (
    <View style={styles.card}>
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
                <Pressable
                  key={s}
                  style={styles.suggestionRow}
                  onPress={() => handlePickSuggestion(s)}
                >
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

      {exercise.sets.map((set, i) => (
        <SetRow
          key={i}
          setIndex={i}
          data={set}
          onUpdate={(field, value) =>
            dispatch({ type: 'UPDATE_SET', localId: exercise.localId, setIndex: i, field, value })
          }
          onRemove={() =>
            dispatch({ type: 'REMOVE_SET', localId: exercise.localId, setIndex: i })
          }
        />
      ))}

      <Pressable
        style={styles.addSetBtn}
        onPress={() => dispatch({ type: 'ADD_SET', localId: exercise.localId })}
      >
        <Text style={styles.addSetText}>+ Add Set</Text>
      </Pressable>

      {/* URL input modal */}
      <Modal
        visible={urlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}
      >
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

      {/* Fullscreen player modal (direct/file URLs only) */}
      <Modal
        visible={playerModalVisible}
        animationType="slide"
        onRequestClose={() => {
          player.pause();
          setPlayerModalVisible(false);
        }}
      >
        <View style={styles.playerContainer}>
          <VideoView
            player={player}
            style={styles.videoView}
            allowsFullscreen
            nativeControls
            contentFit="contain"
          />
          <Pressable
            onPress={() => {
              player.pause();
              setPlayerModalVisible(false);
            }}
            style={styles.closeBtn}
          >
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameWrapper: {
    flex: 1,
    marginRight: 12,
    zIndex: 10,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D1D6',
    paddingBottom: 4,
  },
  suggestionBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D1D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  suggestionText: { fontSize: 15, color: '#1C1C1E' },
  deleteText: { color: '#FF3B30', fontSize: 13, paddingTop: 4 },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  watchBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  watchText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  removeVideoBtn: { paddingHorizontal: 4 },
  removeVideoText: { color: '#FF3B30', fontSize: 12 },
  addVideoBtn: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addVideoText: { color: '#8E8E93', fontSize: 12 },
  addSetBtn: { marginTop: 8, alignItems: 'center', padding: 8 },
  addSetText: { color: '#FF6B35', fontSize: 15 },
  // URL modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlModalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '85%',
  },
  urlModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 14,
  },
  urlModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  urlCancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  urlCancelText: { color: '#8E8E93', fontSize: 15 },
  urlUseBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  urlUseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Fullscreen player
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoView: { flex: 1 },
  closeBtn: { padding: 20, alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 17 },
});
