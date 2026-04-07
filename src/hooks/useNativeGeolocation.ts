/**
 * Native background geolocation via Capacitor plugin.
 * Falls back gracefully to no-op on web.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface NativeGeoState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  bearing: number | null;
  isNative: boolean;
}

interface UseNativeGeolocationOptions {
  enabled: boolean;
  onLocation?: (lat: number, lng: number, accuracy: number) => void;
}

export function useNativeGeolocation({ enabled, onLocation }: UseNativeGeolocationOptions) {
  const [state, setState] = useState<NativeGeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    bearing: null,
    isNative: Capacitor.isNativePlatform(),
  });

  const watcherIdRef = useRef<string | null>(null);

  const start = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { BackgroundGeolocation } = await import(
        '@capacitor-community/background-geolocation'
      );

      const id = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'SoloCab - GPS actif',
          backgroundMessage: 'Suivi de position en cours',
          requestPermissions: true,
          stale: false,
          distanceFilter: 10, // meters
        },
        (location, error) => {
          if (error) {
            console.error('[NativeGeo] Error:', error);
            return;
          }
          if (location) {
            setState((prev) => ({
              ...prev,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed ?? null,
              bearing: location.bearing ?? null,
            }));
            onLocation?.(location.latitude, location.longitude, location.accuracy);
          }
        }
      );

      watcherIdRef.current = id;
    } catch (err) {
      console.warn('[NativeGeo] Plugin not available:', err);
    }
  }, [onLocation]);

  const stop = useCallback(async () => {
    if (!watcherIdRef.current) return;
    try {
      const { BackgroundGeolocation } = await import(
        '@capacitor-community/background-geolocation'
      );
      await BackgroundGeolocation.removeWatcher({ id: watcherIdRef.current });
      watcherIdRef.current = null;
    } catch {}
  }, []);

  useEffect(() => {
    if (enabled && Capacitor.isNativePlatform()) {
      start();
    } else {
      stop();
    }
    return () => { stop(); };
  }, [enabled, start, stop]);

  return state;
}
