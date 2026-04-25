/**
 * Consommateur du bus GPS natif.
 *
 * IMPORTANT : ce hook ne démarre PLUS son propre watcher BackgroundGeolocation.
 * Le watcher unique est géré par `useDriverBackgroundGPS` (monté globalement
 * dans <DriverBackgroundGPS />). Cela évite deux foreground services simultanés
 * et la notification dupliquée "GPS actif".
 *
 * Ici on s'abonne simplement au bus partagé et on relaie les fixes au composant.
 * Sur web → fallback no-op (le tracking web reste géré par useDriverLocationTracker).
 */
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { subscribeNativeGps, type NativeGpsFix } from '@/lib/nativeGpsBus';

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

  const onLocationRef = useRef(onLocation);
  onLocationRef.current = onLocation;

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    const unsub = subscribeNativeGps((fix: NativeGpsFix) => {
      setState((prev) => {
        if (
          prev.latitude === fix.latitude &&
          prev.longitude === fix.longitude &&
          prev.accuracy === fix.accuracy
        ) return prev;
        return {
          ...prev,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          speed: fix.speed,
          bearing: fix.bearing,
        };
      });
      onLocationRef.current?.(fix.latitude, fix.longitude, fix.accuracy ?? 0);
    });

    return () => { unsub(); };
  }, [enabled]);

  return state;
}
