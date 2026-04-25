/**
 * Foreground service GPS pour chauffeur en mission ou en ligne.
 *
 * Rôle UNIQUE : démarrer le seul watcher BackgroundGeolocation natif et
 * publier chaque fix sur le bus partagé (`nativeGpsBus`). Tous les autres
 * hooks consomment ce bus au lieu d'instancier un second watcher.
 *
 * - Active le foreground service Android (notification persistante + wake lock)
 * - Émet la position en background dès qu'elle change de plus de 15 m
 * - Heartbeat serveur toutes les 25 s même à l'arrêt → `last_location_update` reste frais
 * - S'arrête automatiquement quand le chauffeur passe offline
 *
 * Sur web, ce hook est un no-op.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { publishNativeGpsFix } from '@/lib/nativeGpsBus';

interface UseDriverBackgroundGPSOptions {
  driverId: string | null;
  enabled: boolean; // true quand le chauffeur est online ou en course
}

const HEARTBEAT_MS = 25_000;

export function useDriverBackgroundGPS({ driverId, enabled }: UseDriverBackgroundGPSOptions) {
  const watcherIdRef = useRef<string | null>(null);
  const keepAwakeActiveRef = useRef(false);
  const lastSentRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const lastFixRef = useRef<{ lat: number; lon: number } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !driverId) return;

    let cancelled = false;

    const loadBg = () => import(/* @vite-ignore */ ('@capacitor-community/' + 'background-geolocation'));
    const loadKa = () => import(/* @vite-ignore */ ('@capacitor-community/' + 'keep-awake'));

    const sendToServer = async (lat: number, lon: number, accuracy: number | null) => {
      try {
        // RPC atomique : met à jour current_*, last_location_update et last_seen_at.
        const { error } = await supabase.rpc('update_driver_location_batch', {
          p_driver_id: driverId,
          p_latitude: lat,
          p_longitude: lon,
          p_accuracy: accuracy,
        });
        if (error) {
          // Fallback direct UPDATE si l'RPC n'a pas accepté le payload (vieux client)
          await supabase
            .from('drivers')
            .update({
              current_latitude: lat,
              current_longitude: lon,
              last_location_update: new Date().toISOString(),
            })
            .eq('id', driverId);
        }
        lastSentRef.current = { lat, lon, time: Date.now() };
      } catch (err) {
        console.warn('[BackgroundGPS] sendToServer fail', err);
      }
    };

    const start = async () => {
      if (!enabled || watcherIdRef.current || cancelled) return;
      try {
        const bgMod: any = await loadBg();
        const BackgroundGeolocation = bgMod.BackgroundGeolocation || bgMod.default;
        const kaMod: any = await loadKa();
        const KeepAwake = kaMod.KeepAwake || kaMod.default;

        try {
          await KeepAwake.keepAwake();
          keepAwakeActiveRef.current = true;
        } catch (e) {
          console.warn('[BackgroundGPS] keep-awake unavailable', e);
        }

        const id = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Suivi de position en cours',
            backgroundTitle: 'SoloCab - GPS actif',
            requestPermissions: true,
            stale: false,
            distanceFilter: 15, // mètres — équilibre fraîcheur/batterie
          },
          async (location: any, error: any) => {
            if (error) {
              console.warn('[BackgroundGPS] watcher error', error);
              return;
            }
            if (!location || !driverId) return;

            // Publier sur le bus pour le tracker UI / la carte / le diagnostic.
            publishNativeGpsFix({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy ?? null,
              speed: location.speed ?? null,
              bearing: location.bearing ?? null,
              time: location.time ?? Date.now(),
            });

            lastFixRef.current = { lat: location.latitude, lon: location.longitude };

            // Throttling soft : on n'envoie au serveur que si la position a bougé
            // ≥ ~12 m OU si le dernier envoi date de >15 s.
            const last = lastSentRef.current;
            const now = Date.now();
            const moved =
              !last ||
              Math.abs(location.latitude - last.lat) > 0.00011 ||
              Math.abs(location.longitude - last.lon) > 0.00011;
            const overdue = !last || now - last.time > 15_000;
            if (moved || overdue) {
              await sendToServer(location.latitude, location.longitude, location.accuracy ?? null);
            }
          }
        );

        if (!cancelled) {
          watcherIdRef.current = id;
          console.log('[BackgroundGPS] foreground service started', id);

          // Heartbeat : garantit que `last_location_update` reste frais
          // même si le chauffeur est immobile (Android coupe les fixes répétés).
          heartbeatRef.current = setInterval(() => {
            const fix = lastFixRef.current;
            if (!fix) return;
            sendToServer(fix.lat, fix.lon, null);
          }, HEARTBEAT_MS);
        } else {
          await BackgroundGeolocation.removeWatcher({ id });
        }
      } catch (err) {
        console.error('[BackgroundGPS] start failed', err);
      }
    };

    const stop = async () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
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
