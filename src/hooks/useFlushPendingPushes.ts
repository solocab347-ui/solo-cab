/**
 * useFlushPendingPushes — au login + au passage online, demande au backend
 * de renvoyer les notifications mises en file lors d'une indisponibilité.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFlushPendingPushes() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const flush = () => {
      supabase.functions.invoke('flush-pending-pushes', { body: {} }).catch(() => {});
    };

    // Initial
    flush();

    // Au retour online
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flush();
    });

    return () => {
      window.removeEventListener('online', flush);
    };
  }, [user?.id]);
}
