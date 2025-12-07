import { useState, useEffect, useCallback } from 'react';
import { Locale, getStoredLocale, setLocale as setStoredLocale, t as translate } from '@/lib/i18n';

export const useLocale = () => {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale());

  useEffect(() => {
    const handleLocaleChange = () => {
      setLocaleState(getStoredLocale());
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setStoredLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  return { locale, setLocale, t };
};

export default useLocale;
