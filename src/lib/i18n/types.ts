// Types for internationalization system
export type Locale = 'fr' | 'en' | 'es' | 'it' | 'zh' | 'ar';

export interface TranslationValue {
  fr: string;
  en: string;
  es: string;
  it: string;
  zh: string;
  ar: string;
}

export interface Translations {
  [key: string]: TranslationValue;
}

export interface LanguageConfig {
  code: Locale;
  label: string;
  nativeLabel: string;
  flag: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧', rtl: false },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹', rtl: false },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', rtl: true },
];

export const isRTL = (locale: Locale): boolean => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === locale);
  return lang?.rtl ?? false;
};
