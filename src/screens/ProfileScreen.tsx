import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../hooks/useProfile';
import { useLanguage } from '../hooks/useLanguage';
import type { FitnessGoal, ExperienceLevel, UserProfile } from '../types';

const GOAL_KEYS: { key: FitnessGoal; tKey: string; icon: string }[] = [
  { key: 'lose_weight',       tKey: 'profile.lose_weight',   icon: '🔥' },
  { key: 'build_muscle',      tKey: 'profile.build_muscle',  icon: '💪' },
  { key: 'maintain',          tKey: 'profile.maintain',      icon: '⚖️' },
  { key: 'improve_endurance', tKey: 'profile.endurance',     icon: '🏃' },
];

const LEVEL_KEYS: { key: ExperienceLevel; tKey: string; descKey: string }[] = [
  { key: 'beginner',     tKey: 'profile.beginner',     descKey: 'profile.exp_beginner' },
  { key: 'intermediate', tKey: 'profile.intermediate', descKey: 'profile.exp_intermediate' },
  { key: 'advanced',     tKey: 'profile.advanced',     descKey: 'profile.exp_advanced' },
];

function NumInput({
  label, value, unit, onChangeText,
}: {
  label: string;
  value: string;
  unit: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={numStyles.row}>
      <Text style={numStyles.label}>{label}</Text>
      <View style={numStyles.inputWrap}>
        <TextInput
          style={numStyles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor="#C7C7CC"
        />
        <Text style={numStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const numStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  label: { fontSize: 16, color: '#1C1C1E' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    minWidth: 36,
    textAlign: 'right',
    fontSize: 16,
    color: '#3C3C43',
    paddingVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 15, color: '#8E8E93' },
});

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, save, loading } = useProfile();
  const { language, setLanguage } = useLanguage();

  // local edit state (strings for text inputs)
  const [weight, setWeight]       = useState('');
  const [target, setTarget]       = useState('');
  const [heightFt, setHeightFt]   = useState('');
  const [heightIn, setHeightIn]   = useState('');
  const [age, setAge]             = useState('');
  const [goal, setGoal]           = useState<FitnessGoal | null>(null);
  const [level, setLevel]         = useState<ExperienceLevel | null>(null);
  const [saved, setSaved]         = useState(false);

  // Populate form once profile loads
  React.useEffect(() => {
    if (!loading) {
      setWeight(profile.weight_kg != null ? String(profile.weight_kg) : '');
      setTarget(profile.target_weight_kg != null ? String(profile.target_weight_kg) : '');
      if (profile.height_cm != null) {
        const totalIn = profile.height_cm;
        setHeightFt(String(Math.floor(totalIn / 12)));
        setHeightIn(String(Math.round(totalIn % 12)));
      } else {
        setHeightFt('');
        setHeightIn('');
      }
      setAge(profile.age != null ? String(profile.age) : '');
      setGoal(profile.fitness_goal);
      setLevel(profile.experience_level);
    }
  }, [loading]);

  async function handleSave() {
    const ft = parseInt(heightFt, 10) || 0;
    const inches = parseInt(heightIn, 10) || 0;
    const totalInches = ft * 12 + inches;
    const updated: UserProfile = {
      weight_kg:        weight ? parseFloat(weight) : null,
      target_weight_kg: target ? parseFloat(target) : null,
      height_cm:        totalInches > 0 ? totalInches : null,
      age:              age    ? parseInt(age, 10)  : null,
      fitness_goal:     goal,
      experience_level: level,
    };
    await save(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // BMI helper
  const bmi = (() => {
    const w = parseFloat(weight);
    const ft = parseInt(heightFt, 10) || 0;
    const inches = parseInt(heightIn, 10) || 0;
    const h = ft * 12 + inches;
    if (!w || !h) return null;
    return ((w / (h * h)) * 703).toFixed(1);
  })();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Body Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.body_stats')}</Text>
          <NumInput label={t('profile.current_weight')} value={weight} unit={t('profile.lbs')} onChangeText={setWeight} />
          <View style={styles.divider} />
          <NumInput label={t('profile.target_weight')}  value={target} unit={t('profile.lbs')} onChangeText={setTarget} />
          <View style={styles.divider} />
          <View style={numStyles.row}>
            <Text style={numStyles.label}>{t('profile.height')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={[numStyles.input, { width: 24 }]}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor="#C7C7CC"
              />
              <Text style={numStyles.unit}>{t('profile.ft')}</Text>
              <TextInput
                style={[numStyles.input, { width: 24, marginLeft: 6 }]}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor="#C7C7CC"
              />
              <Text style={numStyles.unit}>{t('profile.in')}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <NumInput label={t('profile.age')} value={age} unit={t('profile.yr')} onChangeText={setAge} />
          {bmi && (
            <View style={styles.bmiRow}>
              <Text style={styles.bmiLabel}>{t('profile.bmi')}</Text>
              <Text style={styles.bmiValue}>{bmi}</Text>
            </View>
          )}
        </View>

        {/* Fitness Goal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.fitness_goal')}</Text>
          <View style={styles.goalGrid}>
            {GOAL_KEYS.map(g => (
              <Pressable
                key={g.key}
                style={[styles.goalTile, goal === g.key && styles.goalTileActive]}
                onPress={() => setGoal(g.key)}
              >
                <Text style={styles.goalIcon}>{g.icon}</Text>
                <Text style={[styles.goalLabel, goal === g.key && styles.goalLabelActive]}>
                  {t(g.tKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.experience_level')}</Text>
          <View style={styles.levelList}>
            {LEVEL_KEYS.map(l => (
              <Pressable
                key={l.key}
                style={[styles.levelRow, level === l.key && styles.levelRowActive]}
                onPress={() => setLevel(l.key)}
              >
                <View style={[styles.radio, level === l.key && styles.radioActive]}>
                  {level === l.key && <View style={styles.radioDot} />}
                </View>
                <View>
                  <Text style={[styles.levelLabel, level === l.key && styles.levelLabelActive]}>
                    {t(l.tKey)}
                  </Text>
                  <Text style={styles.levelDesc}>{t(l.descKey)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
          <View style={styles.langRow}>
            {(['en', 'zh'] as const).map(lng => (
              <Pressable
                key={lng}
                style={[styles.langPill, language === lng && styles.langPillActive]}
                onPress={() => setLanguage(lng)}
              >
                <Text style={[styles.langPillText, language === lng && styles.langPillTextActive]}>
                  {t(lng === 'en' ? 'profile.lang_en' : 'profile.lang_zh')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save */}
        <Pressable style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? t('profile.saved') : t('profile.save_profile')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA' },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  bmiLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  bmiValue: { fontSize: 17, fontWeight: '700', color: '#34C759' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalTile: {
    width: '47%',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalTileActive: { borderColor: '#FF6B35', backgroundColor: '#FFF4F0' },
  goalIcon: { fontSize: 28 },
  goalLabel: { fontSize: 13, fontWeight: '600', color: '#3C3C43' },
  goalLabelActive: { color: '#FF6B35' },
  levelList: { gap: 8 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelRowActive: { borderColor: '#FF6B35', backgroundColor: '#FFF4F0' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#FF6B35' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B35' },
  levelLabel: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  levelLabelActive: { color: '#FF6B35' },
  levelDesc: { fontSize: 12, color: '#8E8E93' },
  langRow: { flexDirection: 'row', gap: 10 },
  langPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langPillActive: { borderColor: '#FF6B35', backgroundColor: '#FFF4F0' },
  langPillText: { fontSize: 15, fontWeight: '600', color: '#3C3C43' },
  langPillTextActive: { color: '#FF6B35' },
  saveBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDone: { backgroundColor: '#34C759' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
