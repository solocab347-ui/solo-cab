/**
 * Service GPS pour chauffeur en mission ou en ligne.
 * - Active le foreground service Android natif (notification persistante + wake lock)
 * - Émet un heartbeat GPS Capacitor régulier sans dépendre du plugin community iOS incompatible Capacitor 8
 * - S'arrête automatiquement quand le chauffeur passe offline
 *
 * Sur web, ce hook est un no-op (le tracking foreground existant continue).
 */
import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { publishNativeFix } from '@/lib/nativeGpsBus';
import { logGpsLoss } from '@/lib/gpsLossLogger';
import { logGpsDebug, shouldRejectGpsFix } from '@/lib/gpsDebug';
import { toast } from 'sonner';

const SoloCabPermissions = registerPlugin<{
  startDriverForegroundService(options: { driverId: string; accessToken: string; refreshToken?: string | null }): Promise<{ granted?: boolean }>;
  stopDriverForegroundService(): Promise<{ granted?: boolean }>;
}>('SoloCabPermissions');

interface UseDriverBackgroundGPSOptions {
  driverId: string | null;
  enabled: boolean; // true quand le chauffeur est online ou en course
}

export function useDriverBackgroundGPS({ driverId, enabled }: UseDriverBackgroundGPSOptions) {
  const keepAwakeActiveRef = useRef(false);
  const lastFixAtRef = useRef<number>(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationWarnedRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !driverId) return;

    let cancelled = false;

    // Dynamic imports: loaded only in Capacitor runtime.
    const loadKa = () => import(/* @vite-ignore */ ('@capacitor-community/' + 'keep-awake'));
    const loadPrefs = () => import('@capacitor/preferences');

    const ensureAndroidGpsNotificationPermission = async () => {
      if (Capacitor.getPlatform() !== 'android') return true;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const current = await LocalNotifications.checkPermissions();
        if ((current as any).display === 'granted') return true;
        const requested = await LocalNotifications.requestPermissions();
        const granted = (requested as any).display === 'granted';
        if (!granted && !notificationWarnedRef.current) {
          notificationWarnedRef.current = true;
          toast.warning('Notification GPS non autorisée', {
            description: 'Android doit autoriser les notifications pour afficher “SoloCab utilise votre GPS”.',
            duration: 7000,
          });
        }
        return granted;
      } catch (e) {
        console.warn('[BackgroundGPS] notification permission check failed', e);
        return false;
      }
    };

    const setTrackingFlag = async (value: boolean) => {
      try {
        const { Preferences } = await loadPrefs();
        if (value) {
          await Preferences.set({ key: 'solocab_gps_tracking_enabled', value: 'true' });
        } else {
          await Preferences.remove({ key: 'solocab_gps_tracking_enabled' });
        }
      } catch {/* ignore */}
    };

    const startNativeDriverService = async () => {
      if (Capacitor.getPlatform() !== 'android' || !driverId) return;
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) {
        console.warn('[BackgroundGPS] native service skipped: no auth session');
        return;
      }
      await SoloCabPermissions.startDriverForegroundService({
        driverId,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      console.log('[BackgroundGPS] native Android foreground service requested');
    };

    const stopNativeDriverService = async () => {
      if (Capacitor.getPlatform() !== 'android') return;
      try {
        await SoloCabPermissions.stopDriverForegroundService();
        console.log('[BackgroundGPS] native Android foreground service stopped');
      } catch (e) {
        console.warn('[BackgroundGPS] native service stop failed', e);
      }
    };

    const start = async () => {
      if (!enabled || tickRef.current || cancelled) return;
      try {
        await ensureAndroidGpsNotificationPermission();
        // D'abord le service natif pur Android : il ne doit pas dépendre du watcher JS/Capacitor.
        await setTrackingFlag(true);
        await startNativeDriverService();
        const kaMod: any = await loadKa();
        const KeepAwake = kaMod.KeepAwake || kaMod.default;

        const persistFix = async (fix: {
          latitude: number;
          longitude: number;
          accuracy?: number | null;
          speed?: number | null;
          bearing?: number | null;
          provider?: string | null;
          timestamp?: number | null;
        }) => {
          if (!driverId || cancelled) return;
          const accuracyM = fix.accuracy ?? 0;
          logGpsDebug('native-fix-received', fix, { driverId, enabled, source: fix.provider || 'unknown' });
          if (shouldRejectGpsFix(fix)) {
            logGpsLoss({
              driverId,
              lossType: 'invalid_or_mock_fix',
              lat: fix.latitude,
              lng: fix.longitude,
              accuracyM,
              details: { provider: fix.provider || 'unknown', reason: 'invalid_or_paris_hardcoded_fix' },
            });
            return;
          }
          lastFixAtRef.current = Date.now();
          publishNativeFix({
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracy: accuracyM,
            speed: fix.speed ?? null,
            bearing: fix.bearing ?? null,
            provider: fix.provider ?? null,
            timestamp: fix.timestamp ?? Date.now(),
          });
          if (accuracyM > 100) {
            logGpsLoss({
              driverId,
              lossType: 'low_accuracy',
              lat: fix.latitude,
              lng: fix.longitude,
              accuracyM,
            });
          }
          try {
            const { error } = await supabase.rpc('update_driver_location_batch', {
              p_driver_id: driverId,
              p_latitude: fix.latitude,
              p_longitude: fix.longitude,
              p_accuracy: accuracyM,
            });
            if (error) throw error;
            logGpsDebug('upload-supabase-ok', fix, { driverId });
          } catch (err) {
            console.error('[BackgroundGPS] update fail', err);
            logGpsDebug('upload-supabase-failed', fix, { driverId, error: String(err) });
          }
        };

        // Wake lock pour empêcher le CPU de dormir
        try {
          await KeepAwake.keepAwake();
          keepAwakeActiveRef.current = true;
        } catch (e) {
          console.warn('[BackgroundGPS] keep-awake unavailable', e);
        }

        const pollCurrentPosition = async (provider: string) => {
          const { Geolocation } = await import('@capacitor/geolocation');
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15_000,
            maximumAge: provider.endsWith('initial') ? 3_000 : 0,
          });
          await persistFix({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 0,
            speed: (pos.coords as any).speed ?? null,
            bearing: (pos.coords as any).heading ?? null,
            provider,
            timestamp: pos.timestamp,
          });
        };

        if (!cancelled) {
          lastFixAtRef.current = Date.now();
          console.log('[BackgroundGPS] native GPS heartbeat started');

          // Prime GPS non bloquant : accélère la première écriture DB, mais
          // si Android tarde à fournir un fix, le service reste déjà actif.
          void (async () => {
            try {
              await pollCurrentPosition('capacitor-geolocation-initial');
            } catch (e) {
              console.warn('[BackgroundGPS] initial fix failed, heartbeat remains active', e);
            }
          })();

          // Tick périodique (20s) : force getCurrentPosition pour garantir un fix
          // récent même si le distanceFilter (30 m) n'est pas franchi.
          // Maintient un heartbeat DB récent quand le chauffeur reste immobile.
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = setInterval(async () => {
            if (!enabled || !driverId || cancelled) return;
            try {
              await pollCurrentPosition('capacitor-geolocation-tick');
            } catch (e) {
              console.warn('[BackgroundGPS] tick fail', e);
            }
          }, 20_000);

          // Watchdog : si aucun fix > 25 s pendant que enabled === true,
          // on re-arme le watcher pour éviter les zombies silencieux.
          // Seuil 25 s = juste sous la fenêtre de visibilité client (30 s) :
          // si le service freeze (Doze, Xiaomi/MIUI), on récupère AVANT
          // que le chauffeur disparaisse de la recherche immédiate.
          if (watchdogRef.current) clearInterval(watchdogRef.current);
          watchdogRef.current = setInterval(async () => {
            if (!enabled || !tickRef.current || cancelled) return;
            const silenceMs = Date.now() - lastFixAtRef.current;
            if (silenceMs > 25_000) {
              console.warn('[BackgroundGPS] watchdog: silence', silenceMs, 'ms — requesting fresh fix');
              if (driverId) {
                logGpsLoss({
                  driverId,
                  lossType: silenceMs > 60_000 ? 'no_fix_timeout' : 'watchdog_triggered',
                  gapMs: silenceMs,
                  details: { reason: 'silence_threshold_25s' },
                });
              }
              try {
                await pollCurrentPosition('capacitor-geolocation-watchdog');
              } catch (e) {
                console.warn('[BackgroundGPS] watchdog fix fail', e);
              }
            }
          }, 10_000);
        }
      } catch (err) {
        console.error('[BackgroundGPS] start failed', err);
      }
    };

    const stop = async () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (keepAwakeActiveRef.current) {
        try {
          const kaMod: any = await loadKa();
          const KeepAwake = kaMod.KeepAwake || kaMod.default;
          await KeepAwake.allowSleep();
          keepAwakeActiveRef.current = false;
        } catch {/* ignore */}
      }
      await setTrackingFlag(false);
      await stopNativeDriverService();
    };

    if (enabled) start();
    else stop();

    return () => {
      cancelled = true;
      stop();
    };
  }, [driverId, enabled]);
}
