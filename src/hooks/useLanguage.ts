import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'pulseup_language';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLang] = useState(i18n.language);

  const setLanguage = useCallback(async (lng: string) => {
    await i18n.changeLanguage(lng);
    setLang(lng);
    await AsyncStorage.setItem(LANG_KEY, lng).catch(() => {});
  }, [i18n]);

  return { language, setLanguage };
}
