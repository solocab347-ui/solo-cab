// Internationalization system for SoloCab
import { translations } from './translations';
import { type Locale, type LanguageConfig, SUPPORTED_LANGUAGES, isRTL } from './types';

export { type Locale, type LanguageConfig, SUPPORTED_LANGUAGES, isRTL };

const LOCALE_STORAGE_KEY = 'solocab_locale';

// Valid locales
const VALID_LOCALES: Locale[] = ['fr', 'en', 'es', 'it', 'zh', 'ar'];

// Check if a string is a valid locale
const isValidLocale = (locale: string): locale is Locale => {
  return VALID_LOCALES.includes(locale as Locale);
};

// Get browser locale or default
export const getBrowserLocale = (): Locale => {
  const browserLang = navigator.language.toLowerCase();
  
  // Check for exact match first
  for (const locale of VALID_LOCALES) {
    if (browserLang.startsWith(locale)) {
      return locale;
    }
  }
  
  return 'fr'; // Default to French
};

// Get stored locale
export const getStoredLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isValidLocale(stored)) {
      return stored;
    }
  } catch (e) {
    // localStorage might not be available
  }
  return getBrowserLocale();
};

// Set locale
export const setLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    
    // Update document direction for RTL languages
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('localeChange', { detail: locale }));
  } catch (e) {
    console.error('Failed to set locale:', e);
  }
};

// Initialize document direction based on stored locale
export const initializeLocale = (): Locale => {
  const locale = getStoredLocale();
  document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
  document.documentElement.lang = locale;
  return locale;
};

// Translation function
export const t = (key: string, locale?: Locale): string => {
  const currentLocale = locale || getStoredLocale();
  const translation = translations[key];
  
  if (!translation) {
    // Only warn in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation for key: ${key}`);
    }
    return key;
  }
  
  return translation[currentLocale] || translation.fr || key;
};

// Get all translations for a specific locale (useful for debugging)
export const getAllTranslations = (locale: Locale): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    result[key] = value[locale] || value.fr || key;
  }
  return result;
};

// Get language config by code
export const getLanguageConfig = (code: Locale): LanguageConfig | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};
