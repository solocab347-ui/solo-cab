import { useState, useEffect, useCallback } from 'react';
import { type Locale, getStoredLocale, setLocale as setStoredLocale, t as translate, isRTL } from '@/lib/i18n';

export const useLocale = () => {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale());

  useEffect(() => {
    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<Locale>;
      if (customEvent.detail) {
        setLocaleState(customEvent.detail);
      } else {
        setLocaleState(getStoredLocale());
      }
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setStoredLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  const rtl = isRTL(locale);

  return { locale, setLocale, t, isRTL: rtl };
};

export default useLocale;
