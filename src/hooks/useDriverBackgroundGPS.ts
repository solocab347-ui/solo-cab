/**
 * Foreground service GPS pour chauffeur en mission ou en ligne.
 * - Active le foreground service Android (notification persistante + wake lock)
 * - Émet la position toutes les 8 secondes en background
 * - S'arrête automatiquement quand le chauffeur passe offline
 *
 * Sur web, ce hook est un no-op (le tracking foreground existant continue).
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface UseDriverBackgroundGPSOptions {
  driverId: string | null;
  enabled: boolean; // true quand le chauffeur est online ou en course
}

export function useDriverBackgroundGPS({ driverId, enabled }: UseDriverBackgroundGPSOptions) {
  const watcherIdRef = useRef<string | null>(null);
  const keepAwakeActiveRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !driverId) return;

    let cancelled = false;

    const start = async () => {
      if (!enabled || watcherIdRef.current || cancelled) return;
      try {
        const bgMod: any = await import('@capacitor-community/background-geolocation');
        const BackgroundGeolocation = bgMod.BackgroundGeolocation || bgMod.default;
        const kaMod: any = await import('@capacitor-community/keep-awake');
        const KeepAwake = kaMod.KeepAwake || kaMod.default;

        // Wake lock pour empêcher le CPU de dormir
        try {
          await KeepAwake.keepAwake();
          keepAwakeActiveRef.current = true;
        } catch (e) {
          console.warn('[BackgroundGPS] keep-awake unavailable', e);
        }

        // Démarrer le watcher background (foreground service Android)
        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'SoloCab suit votre position pour vous proposer des courses.',
            backgroundTitle: '🚗 SoloCab actif',
            requestPermissions: true,
            stale: false,
            distanceFilter: 30, // mètres
          },
          async (location, error) => {
            if (error) {
              console.warn('[BackgroundGPS] error', error);
              return;
            }
            if (!location || !driverId) return;
            try {
              await supabase
                .from('drivers')
                .update({
                  current_latitude: location.latitude,
                  current_longitude: location.longitude,
                  last_location_update: new Date().toISOString(),
                })
                .eq('id', driverId);
            } catch (err) {
              console.error('[BackgroundGPS] update fail', err);
            }
          }
        );

        if (!cancelled) {
          watcherIdRef.current = id;
          console.log('[BackgroundGPS] foreground service started', id);
        } else {
          // a été annulé entre-temps
          await BackgroundGeolocation.removeWatcher({ id });
        }
      } catch (err) {
        console.error('[BackgroundGPS] start failed', err);
      }
    };

    const stop = async () => {
      if (watcherIdRef.current) {
        try {
          const bgMod: any = await import('@capacitor-community/background-geolocation');
          const BackgroundGeolocation = bgMod.BackgroundGeolocation || bgMod.default;
          await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
          watcherIdRef.current = null;
        } catch (err) {
          console.warn('[BackgroundGPS] stop fail', err);
        }
      }
      if (keepAwakeActiveRef.current) {
        try {
          const kaMod: any = await import('@capacitor-community/keep-awake');
          const KeepAwake = kaMod.KeepAwake || kaMod.default;
          await KeepAwake.allowSleep();
          keepAwakeActiveRef.current = false;
        } catch {/* ignore */}
      }
    };

    if (enabled) start();
    else stop();

    return () => {
      cancelled = true;
      stop();
    };
  }, [driverId, enabled]);
}
