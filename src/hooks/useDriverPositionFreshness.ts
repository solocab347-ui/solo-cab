/**
 * Surveille en temps réel la fraîcheur de la position du chauffeur côté serveur.
 *
 * Utile parce que sur Android le foreground service GPS continue d'envoyer
 * des updates à la base même quand la WebView/JS est throttlé en arrière-plan.
 * Le tracker React local peut donc avoir un `lastUpdate` "vieux" alors que
 * `drivers.last_location_update` vient d'être rafraîchi par le service natif.
 *
 * → Source de vérité pour décider si la position est réellement obsolète.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { isNativeGpsAlive } from '@/lib/nativeGpsBus';

interface ServerFreshness {
  /** Date du dernier update GPS côté DB. */
  serverLastUpdate: Date | null;
  /** Âge en ms du dernier update DB (Infinity si aucun). */
  serverAgeMs: number;
  /** True si le serveur a une position fraîche (< 90s par défaut). */
  isServerFresh: boolean;
  /** True si le service natif Android a publié un fix récemment. */
  isNativeAlive: boolean;
}

const POLL_INTERVAL_MS = 15_000;
const FRESH_THRESHOLD_MS = 90_000;

export function useDriverPositionFreshness(driverId: string | null): ServerFreshness {
  const [serverLastUpdate, setServerLastUpdate] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // Re-rendre périodiquement pour recalculer l'âge.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(interval);
  }, []);

  // Polling + realtime sur drivers
  useEffect(() => {
    if (!driverId) {
      setServerLastUpdate(null);
      return;
    }

    let cancelled = false;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('last_location_update')
        .eq('id', driverId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.last_location_update) {
        setServerLastUpdate(new Date(data.last_location_update));
      }
    };

    fetchOnce();
    const interval = setInterval(fetchOnce, POLL_INTERVAL_MS);

    // Realtime : capte les updates faites par le service natif background
    const channel = supabase
      .channel(`driver-pos-freshness-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
        (payload) => {
          const next = payload.new as { last_location_update?: string | null };
          if (next.last_location_update) {
            setServerLastUpdate(new Date(next.last_location_update));
          }
        }
      )
      .subscribe();

    // Re-fetch immédiat quand on revient au premier plan
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchOnce();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const serverAgeMs = serverLastUpdate ? Date.now() - serverLastUpdate.getTime() : Infinity;
  const isServerFresh = serverAgeMs < FRESH_THRESHOLD_MS;
  const isNativeAlive = Capacitor.isNativePlatform() ? isNativeGpsAlive(FRESH_THRESHOLD_MS) : false;

  // tick consommé pour forcer la dépendance
  void tick;

  return { serverLastUpdate, serverAgeMs, isServerFresh, isNativeAlive };
}
