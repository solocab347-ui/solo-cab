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

    const flush = async () => {
      try {
        // Ensure we have a real user JWT — not the anon key fallback.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        await supabase.functions.invoke('flush-pending-pushes', {
          body: {},
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        /* silent — flush is best-effort */
      }
    };

    // Initial
    flush();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') flush();
    };

    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);
}
