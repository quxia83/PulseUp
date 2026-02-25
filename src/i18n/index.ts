import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import zh from './zh.json';

const LANG_KEY = 'pulseup_language';

async function initI18n() {
  const saved = await AsyncStorage.getItem(LANG_KEY).catch(() => null);
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
  const lng = saved || (deviceLang.startsWith('zh') ? 'zh' : 'en');

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

initI18n();

export default i18n;
