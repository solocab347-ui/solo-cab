import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { useNativeGeolocation } from './useNativeGeolocation';

interface LocationTrackerOptions {
  driverId: string | null;
  enabled: boolean;
  updateIntervalMs?: number;
}

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdate: Date | null;
  error: string | null;
  isTracking: boolean;
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 60_000; // position older than 60s = stale

export function useDriverLocationTracker({
  driverId,
  enabled,
  updateIntervalMs = 10_000,
}: LocationTrackerOptions) {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    lastUpdate: null,
    error: null,
    isTracking: false,
    isStale: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ lat: number; lon: number; time: number } | null>(null);

  // ── Send location to DB (GPS only, never touch is_available_now) ──
  const sendLocationToServer = useCallback(
    async (latitude: number, longitude: number) => {
      if (!driverId) return;

      // Skip if barely moved and sent recently (< 10s)
      if (lastSentRef.current) {
        const latDiff = Math.abs(latitude - lastSentRef.current.lat);
        const lonDiff = Math.abs(longitude - lastSentRef.current.lon);
        const timeDiff = Date.now() - lastSentRef.current.time;
        if (latDiff < 0.0001 && lonDiff < 0.0001 && timeDiff < 10_000) {
          return;
        }
      }

      try {
        const { error } = await supabase
          .from('drivers')
          .update({
            current_latitude: latitude,
            current_longitude: longitude,
            last_location_update: new Date().toISOString(),
          })
          .eq('id', driverId);

        if (error) {
          console.error('[GPS] DB update failed:', error);
          setLocationState((prev) => ({ ...prev, error: 'Erreur serveur' }));
        } else {
          lastSentRef.current = { lat: latitude, lon: longitude, time: Date.now() };
          setLocationState((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            error: null,
            isStale: false,
          }));
        }
      } catch (err) {
        console.error('[GPS] Location update error:', err);
      }
    },
    [driverId]
  );

  // ── Native GPS handler (Capacitor) ──
  const handleNativeLocation = useCallback(
    (lat: number, lng: number, _accuracy: number) => {
      setLocationState((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        accuracy: _accuracy,
        isTracking: true,
        error: null,
        isStale: false,
      }));
      sendLocationToServer(lat, lng);
    },
    [sendLocationToServer]
  );

  const nativeGeo = useNativeGeolocation({
    enabled: enabled && Capacitor.isNativePlatform(),
    onLocation: handleNativeLocation,
  });

  // ── Web GPS handlers ──
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      setLocationState((prev) => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        isTracking: true,
        error: null,
        isStale: false,
      }));
      sendLocationToServer(latitude, longitude);
    },
    [sendLocationToServer]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Erreur de géolocalisation';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permission de localisation refusée';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Position indisponible';
        break;
      case error.TIMEOUT:
        errorMessage = 'Délai de localisation dépassé';
        break;
    }
    setLocationState((prev) => ({ ...prev, error: errorMessage, isTracking: false }));
    console.error('[GPS] Geolocation error:', errorMessage);
  }, []);

  // ── Web tracking start/stop ──
  const startWebTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState((prev) => ({
        ...prev,
        error: 'Géolocalisation non supportée',
        isTracking: false,
      }));
      return;
    }

    // Immediate fresh position
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Periodic forced refresh
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    }, updateIntervalMs);

    setLocationState((prev) => ({ ...prev, isTracking: true }));
  }, [handlePositionUpdate, handleError, updateIntervalMs]);

  const stopWebTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLocationState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  // ── Stale position checker ──
  useEffect(() => {
    if (!enabled) return;

    staleCheckRef.current = setInterval(() => {
      setLocationState((prev) => {
        if (!prev.lastUpdate) return prev;
        const age = Date.now() - prev.lastUpdate.getTime();
        const isStale = age > STALE_THRESHOLD_MS;
        return isStale !== prev.isStale ? { ...prev, isStale } : prev;
      });
    }, 15_000);

    return () => {
      if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    };
  }, [enabled]);

  // ── Main effect: start/stop based on platform ──
  useEffect(() => {
    if (enabled && driverId && !Capacitor.isNativePlatform()) {
      startWebTracking();
    } else if (!enabled || !driverId) {
      stopWebTracking();
    }
    return () => stopWebTracking();
  }, [enabled, driverId, startWebTracking, stopWebTracking]);

  // Merge native position into state
  useEffect(() => {
    if (Capacitor.isNativePlatform() && nativeGeo.latitude && nativeGeo.longitude) {
      setLocationState((prev) => ({
        ...prev,
        latitude: nativeGeo.latitude,
        longitude: nativeGeo.longitude,
        accuracy: nativeGeo.accuracy,
        isTracking: true,
      }));
    }
  }, [nativeGeo.latitude, nativeGeo.longitude, nativeGeo.accuracy]);

  // ── Availability toggle ──
  const updateAvailability = useCallback(
    async (isAvailable: boolean) => {
      if (!driverId) return;
      try {
        await supabase
          .from('drivers')
          .update({
            is_available_now: isAvailable,
            driver_status: isAvailable ? 'online_available' : 'offline',
          })
          .eq('id', driverId);
      } catch (err) {
        console.error('[GPS] Failed to update availability:', err);
      }
    },
    [driverId]
  );

  return {
    ...locationState,
    startTracking: startWebTracking,
    stopTracking: stopWebTracking,
    updateAvailability,
  };
}
