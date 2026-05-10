/**
 * Lecture passive de la position GPS native.
 *
 * IMPORTANT (refonte fusion v2) :
 * Ce hook N'ENREGISTRE PLUS de watcher BackgroundGeolocation. Il s'abonne
 * uniquement au bus partagé `nativeGpsBus`, alimenté par
 * `useDriverBackgroundGPS` (le seul watcher natif autorisé).
 *
 * Bénéfices :
 *  - Une seule source GPS native → batterie /2, plus de race conditions.
 *  - Plus de double demande de permission.
 *  - Plus de double écriture concurrente sur `drivers`.
 *
 * Sur web (no-op natif), le hook reste inerte : c'est `useDriverLocationTracker`
 * qui gère `navigator.geolocation` directement.
 */
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { subscribeNativeFix, getLastNativeFix } from '@/lib/nativeGpsBus';

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
  const isNative = Capacitor.isNativePlatform();
  const [state, setState] = useState<NativeGeoState>(() => {
    const last = isNative ? getLastNativeFix() : null;
    return {
      latitude: last?.latitude ?? null,
      longitude: last?.longitude ?? null,
      accuracy: last?.accuracy ?? null,
      speed: last?.speed ?? null,
      bearing: last?.bearing ?? null,
      isNative,
    };
  });

  const onLocationRef = useRef(onLocation);
  onLocationRef.current = onLocation;

  useEffect(() => {
    if (!isNative || !enabled) return;
    const unsub = subscribeNativeFix((fix) => {
      setState((prev) => ({
        ...prev,
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        speed: fix.speed ?? null,
        bearing: fix.bearing ?? null,
      }));
      onLocationRef.current?.(fix.latitude, fix.longitude, fix.accuracy);
    });
    return unsub;
  }, [isNative, enabled]);

  return state;
}
