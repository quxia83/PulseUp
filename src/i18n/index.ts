import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import zh from './zh.json';

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
const lng = deviceLang.startsWith('zh') ? 'zh' : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
