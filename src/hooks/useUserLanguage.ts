/**
 * Hook pour synchroniser la langue utilisateur avec la base de données
 * Charge la langue préférée du profil au login et la sauvegarde lors des changements
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setLocale, type Locale, getStoredLocale } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

const VALID_LOCALES: Locale[] = ['fr', 'en', 'es', 'it', 'zh', 'ar'];

export const useUserLanguage = () => {
  const { user } = useAuth();

  // Charger la langue préférée depuis le profil utilisateur
  const loadUserLanguage = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user language:', error);
        return;
      }

      const preferredLang = data?.preferred_language;
      if (preferredLang && VALID_LOCALES.includes(preferredLang as Locale)) {
        const currentLocale = getStoredLocale();
        // Seulement mettre à jour si différent pour éviter les boucles
        if (currentLocale !== preferredLang) {
          setLocale(preferredLang as Locale);
        }
      }
    } catch (error) {
      console.error('Error in loadUserLanguage:', error);
    }
  }, [user?.id]);

  // Sauvegarder la langue préférée dans le profil
  const saveUserLanguage = useCallback(async (locale: Locale) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: locale })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving user language:', error);
      }
    } catch (error) {
      console.error('Error in saveUserLanguage:', error);
    }
  }, [user?.id]);

  // Charger la langue au montage quand l'utilisateur est connecté
  useEffect(() => {
    if (user?.id) {
      loadUserLanguage();
    }
  }, [user?.id, loadUserLanguage]);

  // Écouter les changements de langue et sauvegarder
  useEffect(() => {
    if (!user?.id) return;

    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<Locale>;
      if (customEvent.detail) {
        saveUserLanguage(customEvent.detail);
      }
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, [user?.id, saveUserLanguage]);

  return {
    loadUserLanguage,
    saveUserLanguage,
  };
};

export default useUserLanguage;
