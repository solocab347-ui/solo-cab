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
  const lastFixAtRef = useRef<number>(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !driverId) return;

    let cancelled = false;

    // Dynamic imports via variable to prevent Vite from resolving at build time
    // (these packages have no web entry point)
    const loadBg = () => import(/* @vite-ignore */ ('@capacitor-community/' + 'background-geolocation'));
    const loadKa = () => import(/* @vite-ignore */ ('@capacitor-community/' + 'keep-awake'));

    const start = async () => {
      if (!enabled || watcherIdRef.current || cancelled) return;
      try {
        const bgMod: any = await loadBg();
        const BackgroundGeolocation = bgMod.BackgroundGeolocation || bgMod.default;
        const kaMod: any = await loadKa();
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
            lastFixAtRef.current = Date.now();
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
          lastFixAtRef.current = Date.now();
          console.log('[BackgroundGPS] foreground service started', id);

          // Watchdog : si aucun fix > 90 s pendant que enabled === true,
          // on re-arme le watcher pour éviter les zombies silencieux.
          if (watchdogRef.current) clearInterval(watchdogRef.current);
          watchdogRef.current = setInterval(async () => {
            if (!enabled || !watcherIdRef.current) return;
            const silenceMs = Date.now() - lastFixAtRef.current;
            if (silenceMs > 90_000) {
              console.warn('[BackgroundGPS] watchdog: silence', silenceMs, 'ms — re-arming');
              try {
                await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
                watcherIdRef.current = null;
              } catch {/* ignore */}
              if (!cancelled && enabled) {
                // Re-démarre via start() qui réutilise loadBg()
                await start();
              }
            }
          }, 30_000);
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
          const bgMod: any = await loadBg();
          const BackgroundGeolocation = bgMod.BackgroundGeolocation || bgMod.default;
          await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
          watcherIdRef.current = null;
        } catch (err) {
          console.warn('[BackgroundGPS] stop fail', err);
        }
      }
      if (keepAwakeActiveRef.current) {
        try {
          const kaMod: any = await loadKa();
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
