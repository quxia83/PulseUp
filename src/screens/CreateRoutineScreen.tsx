import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { insertRoutine, updateRoutine, getRoutineById, getRoutineExercises } from '../db/queries';
import { pickVideoFromGallery } from '../services/videoService';
import { isYouTubeUrl, isDirectVideoUrl } from '../utils/videoUtils';
import type { RoutineCategory, NewRoutineExerciseInput } from '../types';
import type { CreateRoutineScreenProps } from '../navigation/types';

const CATEGORIES: RoutineCategory[] = [
  'Strength', 'Cardio', 'HIIT', 'Mobility',
  'Upper Body', 'Lower Body', 'Full Body', 'Core',
  'Meditation', 'Stretch', 'Yoga', 'Taiji',
];

interface ExerciseRow {
  name: string;
  suggested_sets: string;
  suggested_reps: string;
  suggested_weight_kg: string;
  video_url: string;
}

function makeEmptyExercise(): ExerciseRow {
  return { name: '', suggested_sets: '3', suggested_reps: '10', suggested_weight_kg: '0', video_url: '' };
}

// ---- reusable video picker row ----
interface VideoFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

function VideoPickerField({ label, value, onChange }: VideoFieldProps) {
  const { t } = useTranslation();
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [playerVisible, setPlayerVisible] = useState(false);

  const directUri = value && isDirectVideoUrl(value) ? value : null;
  const player = useVideoPlayer(directUri, p => { p.loop = false; });

  async function handlePickFromGallery() {
    try {
      const result = await pickVideoFromGallery();
      if (result) onChange(result.uri);
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('PHPhotos')) {
        Alert.alert(t('create_routine.video_unavailable'), t('create_routine.video_unavailable_msg'));
      } else {
        Alert.alert(t('common.error'), msg || t('create_routine.video_error'));
      }
    }
  }

  function handlePick() {
    Alert.alert(label, '', [
      {
        text: t('create_routine.camera_roll'),
        onPress: () => { handlePickFromGallery(); },
      },
      {
        text: t('create_routine.paste_url'),
        onPress: () => {
          setUrlInput(value);
          setUrlModalVisible(true);
        },
      },
      value ? { text: t('create_routine.remove'), style: 'destructive', onPress: () => onChange('') } : null,
      { text: t('create_routine.cancel'), style: 'cancel' },
    ].filter(Boolean) as any);
  }

  function handlePlay() {
    if (!value) return;
    if (isYouTubeUrl(value)) {
      Linking.openURL(value);
    } else {
      setPlayerVisible(true);
    }
  }

  const short = value
    ? value.startsWith('file://') || value.startsWith('ph://')
      ? t('create_routine.local_video')
      : value.length > 38 ? value.slice(0, 38) + '…' : value
    : null;

  return (
    <>
      {value ? (
        <View style={styles.videoFieldFilled}>
          <Pressable onPress={handlePlay} style={styles.videoPlayBtn}>
            <Ionicons name="play-circle" size={22} color="#FF6B35" />
            <Text style={styles.videoFieldUrl} numberOfLines={1}>{short}</Text>
          </Pressable>
          <Pressable onPress={handlePick} hitSlop={8}>
            <Ionicons name="swap-horizontal" size={18} color="#8E8E93" />
          </Pressable>
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#FF3B30" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.videoField} onPress={handlePick}>
          <View style={styles.videoFieldEmpty}>
            <Ionicons name="videocam-outline" size={18} color="#8E8E93" />
            <Text style={styles.videoFieldPlaceholder}>{t('create_routine.attach_video')}</Text>
          </View>
        </Pressable>
      )}

      {/* Fullscreen player modal */}
      <Modal
        visible={playerVisible}
        animationType="slide"
        onRequestClose={() => { player.pause(); setPlayerVisible(false); }}
      >
        <View style={styles.playerContainer}>
          <VideoView player={player} style={styles.playerVideo} allowsFullscreen nativeControls contentFit="contain" />
          <Pressable onPress={() => { player.pause(); setPlayerVisible(false); }} style={styles.playerCloseBtn}>
            <Text style={styles.playerCloseText}>{t('create_routine.close')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={urlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setUrlModalVisible(false)}>
          <Pressable style={styles.urlModalCard} onPress={() => {}}>
            <Text style={styles.urlModalTitle}>{t('create_routine.paste_video_url')}</Text>
            <TextInput
              style={styles.urlInput}
              placeholder={t('create_routine.url_placeholder')}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
            <View style={styles.urlModalButtons}>
              <Pressable onPress={() => setUrlModalVisible(false)} style={styles.urlCancelBtn}>
                <Text style={styles.urlCancelText}>{t('create_routine.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const trimmed = urlInput.trim();
                  if (trimmed) onChange(trimmed);
                  setUrlModalVisible(false);
                }}
                style={styles.urlUseBtn}
              >
                <Text style={styles.urlUseText}>{t('create_routine.use_url')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---- main screen ----

export default function CreateRoutineScreen({ route, navigation }: CreateRoutineScreenProps) {
  const { t } = useTranslation();
  const routineId = route?.params?.routineId;
  const isEditing = routineId != null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<RoutineCategory>('Strength');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [exercises, setExercises] = useState<ExerciseRow[]>([makeEmptyExercise()]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isEditing || !routineId) return;
    (async () => {
      const [r, exs] = await Promise.all([
        getRoutineById(routineId),
        getRoutineExercises(routineId),
      ]);
      if (r) {
        setName(r.name);
        setCategory(r.category);
        setDescription(r.description ?? '');
        setVideoUrl(r.video_url ?? '');
        setMusicUrl(r.music_url ?? '');
      }
      if (exs.length > 0) {
        setExercises(exs.map(ex => ({
          name: ex.name,
          suggested_sets: String(ex.suggested_sets),
          suggested_reps: String(ex.suggested_reps),
          suggested_weight_kg: String(ex.suggested_weight_kg),
          video_url: ex.video_url ?? '',
        })));
      }
      setLoadingEdit(false);
    })();
  }, [routineId, isEditing]);

  function updateExercise(index: number, field: keyof ExerciseRow, value: string) {
    setExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  }

  function addExercise() {
    setExercises(prev => [...prev, makeEmptyExercise()]);
  }

  function removeExercise(index: number) {
    setExercises(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('create_routine.validation'), t('create_routine.validation_name'));
      return;
    }
    const validExercises = exercises.filter(ex => ex.name.trim());
    if (validExercises.length === 0) {
      Alert.alert(t('create_routine.validation'), t('create_routine.validation_exercises'));
      return;
    }

    setSaving(true);
    const exerciseInputs: NewRoutineExerciseInput[] = validExercises.map((ex, i) => ({
      name: ex.name.trim(),
      order_index: i,
      suggested_sets: parseInt(ex.suggested_sets, 10) || 3,
      suggested_reps: parseInt(ex.suggested_reps, 10) || 10,
      suggested_weight_kg: parseFloat(ex.suggested_weight_kg) || 0,
      video_url: ex.video_url.trim() || undefined,
    }));

    try {
      const input = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        music_url: musicUrl.trim() || undefined,
      };

      if (isEditing && routineId) {
        await updateRoutine(routineId, input, exerciseInputs);
      } else {
        await insertRoutine(input, exerciseInputs);
      }
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      Alert.alert(t('common.error'), t('create_routine.save_error'));
      console.error(e);
    }
  }

  if (loadingEdit) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t('create_routine.name_label')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('create_routine.name_placeholder')}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{t('create_routine.category_label')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[styles.catPill, category === cat && styles.catPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                {t(`categories.${cat}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>{t('create_routine.description_label')}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t('create_routine.description_placeholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>{t('create_routine.reference_video')}</Text>
        <VideoPickerField label={t('create_routine.reference_video')} value={videoUrl} onChange={setVideoUrl} />

        <Text style={styles.label}>{t('create_routine.music_url')}</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          value={musicUrl}
          onChangeText={setMusicUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={styles.exercisesHeader}>
          <Text style={styles.sectionTitle}>{t('create_routine.exercises')}</Text>
          <Pressable onPress={addExercise} style={styles.addExBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#FF6B35" />
            <Text style={styles.addExText}>{t('create_routine.add')}</Text>
          </Pressable>
        </View>

        {exercises.map((ex, i) => (
          <View key={i} style={styles.exCard}>
            <View style={styles.exCardHeader}>
              <Text style={styles.exCardIndex}>#{i + 1}</Text>
              <Pressable onPress={() => removeExercise(i)}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('create_routine.exercise_name')}
              value={ex.name}
              onChangeText={v => updateExercise(i, 'name', v)}
            />
            <View style={styles.exRow}>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>{t('create_routine.sets')}</Text>
                <TextInput
                  style={styles.smallInput}
                  value={ex.suggested_sets}
                  onChangeText={v => updateExercise(i, 'suggested_sets', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>{t('create_routine.reps')}</Text>
                <TextInput
                  style={styles.smallInput}
                  value={ex.suggested_reps}
                  onChangeText={v => updateExercise(i, 'suggested_reps', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>{t('create_routine.weight_lbs')}</Text>
                <TextInput
                  style={styles.smallInput}
                  value={ex.suggested_weight_kg}
                  onChangeText={v => updateExercise(i, 'suggested_weight_kg', v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={[styles.label, { marginTop: 8 }]}>{t('create_routine.exercise_video')}</Text>
            <VideoPickerField
              label={t('create_routine.exercise_video')}
              value={ex.video_url}
              onChange={v => updateExercise(i, 'video_url', v)}
            />
          </View>
        ))}

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? t('create_routine.saving') : isEditing ? t('create_routine.save_changes') : t('create_routine.create_routine')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#6E6E73', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1C1C1E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D1D6',
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  catRow: { maxHeight: 46, marginBottom: 4 },
  catPill: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E5E5EA', marginRight: 8 },
  catPillActive: { backgroundColor: '#FF6B35' },
  catPillText: { fontSize: 13, fontWeight: '600', color: '#3C3C43' },
  catPillTextActive: { color: '#fff' },
  // Video picker field
  videoField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D1D6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  videoFieldEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  videoFieldFilled: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D1D6',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  videoPlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  videoFieldPlaceholder: { fontSize: 15, color: '#8E8E93', flex: 1 },
  videoFieldUrl: { fontSize: 14, color: '#FF6B35', flex: 1 },
  // Video player modal
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  playerVideo: { flex: 1 },
  playerCloseBtn: { padding: 20, alignItems: 'center' },
  playerCloseText: { color: '#fff', fontSize: 17 },
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
  // Exercise rows
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  exercisesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExText: { color: '#FF6B35', fontSize: 15, fontWeight: '600' },
  exCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8, marginTop: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E5EA' },
  exCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exCardIndex: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
  exRow: { flexDirection: 'row', gap: 10 },
  exField: { flex: 1, gap: 4 },
  exFieldLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  smallInput: { backgroundColor: '#F2F2F7', borderRadius: 8, padding: 8, fontSize: 15, textAlign: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#D1D1D6' },
  saveBtn: { backgroundColor: '#FF6B35', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
