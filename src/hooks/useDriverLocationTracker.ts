import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export function useDriverLocationTracker({
  driverId,
  enabled,
  updateIntervalMs = 30000,
}: LocationTrackerOptions) {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    lastUpdate: null,
    error: null,
    isTracking: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<{ lat: number; lon: number } | null>(null);

  // Send location to database — GPS only, never touch is_available_now
  const sendLocationToServer = useCallback(
    async (latitude: number, longitude: number) => {
      if (!driverId) return;

      if (lastSentRef.current) {
        const latDiff = Math.abs(latitude - lastSentRef.current.lat);
        const lonDiff = Math.abs(longitude - lastSentRef.current.lon);
        if (latDiff < 0.0002 && lonDiff < 0.0002) {
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
            // IMPORTANT: Do NOT set is_available_now here
            // Availability is controlled exclusively by the toggle
          })
          .eq('id', driverId);

        if (error) {
          console.error('Failed to update driver location:', error);
          setLocationState((prev) => ({ ...prev, error: 'Erreur serveur' }));
        } else {
          lastSentRef.current = { lat: latitude, lon: longitude };
          setLocationState((prev) => ({
            ...prev,
            lastUpdate: new Date(),
            error: null,
          }));
        }
      } catch (err) {
        console.error('Location update error:', err);
      }
    },
    [driverId]
  );

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

    setLocationState((prev) => ({
      ...prev,
      error: errorMessage,
      isTracking: false,
    }));

    console.error('Geolocation error:', errorMessage);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState((prev) => ({
        ...prev,
        error: 'Géolocalisation non supportée',
        isTracking: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    }, updateIntervalMs);

    setLocationState((prev) => ({ ...prev, isTracking: true }));
  }, [handlePositionUpdate, handleError, updateIntervalMs]);

  const stopTracking = useCallback(() => {
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

  useEffect(() => {
    if (enabled && driverId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, driverId, startTracking, stopTracking]);

  // Update availability status in database — syncs both is_available_now and driver_status
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
        console.error('Failed to update availability:', err);
      }
    },
    [driverId]
  );

  return {
    ...locationState,
    startTracking,
    stopTracking,
    updateAvailability,
  };
}
