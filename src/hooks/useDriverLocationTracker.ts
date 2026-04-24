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

// Adaptive stale thresholds — depend on motion + accuracy
const STALE_MOVING_MS = 20_000;        // moving → expect frequent fixes
const STALE_STATIONARY_GOOD_MS = 90_000; // still + accurate → tolerate long gaps
const STALE_STATIONARY_POOR_MS = 45_000; // still + poor signal → middle ground
const ACCURACY_GOOD_M = 20;            // ≤20m → high-quality fix
const MOVEMENT_SPEED_THRESHOLD_MS = 1.5; // m/s ≈ 5.4 km/h → considered "moving"
const MIN_MOVEMENT_DEG = 0.0001; // ~11m — enough to stay realistic on road movement
const MIN_SEND_INTERVAL_MS = 8_000;
const HEARTBEAT_INTERVAL_MS = 20_000;
const MAX_RETRY_ATTEMPTS = 2;

// Haversine distance in meters between two GPS points
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Compute adaptive stale threshold based on last known speed + accuracy
function computeStaleThreshold(speedMs: number, accuracy: number | null): number {
  if (speedMs >= MOVEMENT_SPEED_THRESHOLD_MS) return STALE_MOVING_MS;
  // Stationary
  if (accuracy != null && accuracy <= ACCURACY_GOOD_M) return STALE_STATIONARY_GOOD_MS;
  return STALE_STATIONARY_POOR_MS;
}

export function useDriverLocationTracker({
  driverId,
  enabled,
  updateIntervalMs = 8_000,
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
  const lastCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  // Last fix used to compute speed (m/s) → drives adaptive stale threshold
  const lastFixRef = useRef<{ lat: number; lon: number; time: number; accuracy: number | null } | null>(null);
  const lastSpeedRef = useRef<number>(0); // m/s — most recent computed speed
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mountedRef = useRef(true);
  const trackingRef = useRef(false);

  // ── Send location to DB — silent, no UI re-render on success ──
  const sendLocationToServer = useCallback(
    async (latitude: number, longitude: number, retryCount = 0) => {
      if (!driverId || !mountedRef.current) return;

      // Deduplicate: skip if position hasn't changed enough AND not enough time passed
      // BUT always force a heartbeat every HEARTBEAT_INTERVAL_MS to keep last_location_update fresh
      if (lastSentRef.current) {
        const latDiff = Math.abs(latitude - lastSentRef.current.lat);
        const lonDiff = Math.abs(longitude - lastSentRef.current.lon);
        const timeDiff = Date.now() - lastSentRef.current.time;
        const isHeartbeatDue = timeDiff >= HEARTBEAT_INTERVAL_MS;
        if (latDiff < MIN_MOVEMENT_DEG && lonDiff < MIN_MOVEMENT_DEG && timeDiff < MIN_SEND_INTERVAL_MS && !isHeartbeatDue) {
          return;
        }
      }

      try {
        // Use batched RPC: single call updates GPS + last_seen_at atomically.
        // Reduces row-level locks vs. multiple parallel UPDATE statements.
        const { error } = await supabase.rpc('update_driver_location_batch', {
          p_driver_id: driverId,
          p_latitude: latitude,
          p_longitude: longitude,
          p_accuracy: null,
        });

        if (error) {
          // Silent retry — don't spam the UI with transient errors
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            setTimeout(() => {
              if (mountedRef.current) {
                sendLocationToServer(latitude, longitude, retryCount + 1);
              }
            }, 2000 * (retryCount + 1)); // 2s, 4s backoff
            return;
          }
          console.error('[GPS] DB update failed after retries:', error.message);
          // Only show error to user after all retries exhausted
          if (mountedRef.current) {
            setLocationState((prev) => ({ ...prev, error: 'Erreur serveur GPS' }));
          }
        } else {
          lastSentRef.current = { lat: latitude, lon: longitude, time: Date.now() };
          // Only update lastUpdate timestamp — avoid full state re-render
          if (mountedRef.current) {
            setLocationState((prev) => {
              if (prev.error || prev.isStale) {
                return { ...prev, lastUpdate: new Date(), error: null, isStale: false };
              }
              // Minimal update — only change lastUpdate if needed for stale check
              if (!prev.lastUpdate || Date.now() - prev.lastUpdate.getTime() > 5000) {
                return { ...prev, lastUpdate: new Date() };
              }
              return prev; // No re-render
            });
          }
        }
      } catch (err) {
        // Network error — silent retry
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          setTimeout(() => {
            if (mountedRef.current) {
              sendLocationToServer(latitude, longitude, retryCount + 1);
            }
          }, 2000 * (retryCount + 1));
        }
      }
    },
    [driverId]
  );

  // ── Native GPS handler (Capacitor) ──
  const handleNativeLocation = useCallback(
    (lat: number, lng: number, _accuracy: number) => {
      lastCoordsRef.current = { lat, lon: lng };
      const now = new Date();
      // Compute speed from previous fix → drives adaptive stale threshold
      if (lastFixRef.current) {
        const dt = (now.getTime() - lastFixRef.current.time) / 1000;
        if (dt > 0.5) {
          const dist = distanceMeters(lastFixRef.current.lat, lastFixRef.current.lon, lat, lng);
          lastSpeedRef.current = dist / dt;
        }
      }
      lastFixRef.current = { lat, lon: lng, time: now.getTime(), accuracy: _accuracy };
      // Always refresh lastUpdate (proves GPS is alive) even if position barely changed
      setLocationState((prev) => {
        const latChanged = !prev.latitude || Math.abs(lat - prev.latitude) > MIN_MOVEMENT_DEG;
        const lonChanged = !prev.longitude || Math.abs(lng - prev.longitude) > MIN_MOVEMENT_DEG;
        const wasStale = prev.isStale;
        // Position significantly changed → full update
        if (latChanged || lonChanged || !prev.isTracking || wasStale) {
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            accuracy: _accuracy,
            isTracking: true,
            error: null,
            isStale: false,
            lastUpdate: now,
          };
        }
        // Stationary but GPS still alive → only refresh lastUpdate every 5s to avoid re-renders
        if (!prev.lastUpdate || now.getTime() - prev.lastUpdate.getTime() > 5000) {
          return { ...prev, lastUpdate: now, isStale: false };
        }
        return prev;
      });
      sendLocationToServer(lat, lng);
    },
    [sendLocationToServer]
  );

  const nativeGeo = useNativeGeolocation({
    enabled: enabled && Capacitor.isNativePlatform(),
    onLocation: handleNativeLocation,
  });

  // ── Web GPS handler — optimized to avoid re-renders ──
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = position.coords;
      lastCoordsRef.current = { lat: latitude, lon: longitude };
      const now = new Date();

      // Use browser-provided speed if available, otherwise compute from delta
      if (typeof speed === 'number' && !isNaN(speed) && speed >= 0) {
        lastSpeedRef.current = speed;
      } else if (lastFixRef.current) {
        const dt = (now.getTime() - lastFixRef.current.time) / 1000;
        if (dt > 0.5) {
          const dist = distanceMeters(lastFixRef.current.lat, lastFixRef.current.lon, latitude, longitude);
          lastSpeedRef.current = dist / dt;
        }
      }
      lastFixRef.current = { lat: latitude, lon: longitude, time: now.getTime(), accuracy };

      // Always refresh lastUpdate (proves GPS is alive) even if position barely changed
      setLocationState((prev) => {
        const latChanged = !prev.latitude || Math.abs(latitude - prev.latitude) > MIN_MOVEMENT_DEG;
        const lonChanged = !prev.longitude || Math.abs(longitude - prev.longitude) > MIN_MOVEMENT_DEG;
        const wasStale = prev.isStale;
        if (!prev.isTracking || latChanged || lonChanged || prev.error || wasStale) {
          return {
            ...prev,
            latitude,
            longitude,
            accuracy,
            isTracking: true,
            error: null,
            isStale: false,
            lastUpdate: now,
          };
        }
        // Stationary but GPS still alive → refresh lastUpdate every 5s
        if (!prev.lastUpdate || now.getTime() - prev.lastUpdate.getTime() > 5000) {
          return { ...prev, lastUpdate: now, isStale: false };
        }
        return prev;
      });

      // Always send to server (server-side dedup handles frequency)
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
        // Timeout is often transient — don't show error, just log
        console.warn('[GPS] Position timeout — will retry automatically');
        return; // Don't update state for timeouts
    }
    if (mountedRef.current) {
      setLocationState((prev) => ({ ...prev, error: errorMessage, isTracking: false }));
    }
    console.error('[GPS] Geolocation error:', errorMessage);
  }, []);

  // ── Wake Lock ──
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current?.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch {
      // Silent — wake lock is optional enhancement
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Re-acquire wake lock + force GPS refresh on page focus
  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && mountedRef.current) {
        acquireWakeLock();
        // Force a fresh GPS update when coming back to foreground
        if (navigator.geolocation && !Capacitor.isNativePlatform()) {
          navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, acquireWakeLock, handlePositionUpdate, handleError]);

  // ── Web tracking start/stop — stable refs ──
  const startWebTracking = useCallback(() => {
    if (!navigator.geolocation || trackingRef.current) return;
    trackingRef.current = true;

    acquireWakeLock();

    // Immediate fresh position
    navigator.geolocation.getCurrentPosition(handlePositionUpdate, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });

    // Continuous watch — primary source
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handleError,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );

    // Periodic keep-alive — ensures DB gets updated even if watchPosition
    // is throttled by the browser in background. Uses longer timeout to reduce load.
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        navigator.geolocation.getCurrentPosition(handlePositionUpdate, () => {}, {
          enableHighAccuracy: false, // Less accurate but faster for keep-alive
          timeout: 10000,
          maximumAge: 5000,
        });
      }
    }, updateIntervalMs);

    if (mountedRef.current) {
      setLocationState((prev) => prev.isTracking ? prev : { ...prev, isTracking: true });
    }
  }, [handlePositionUpdate, handleError, updateIntervalMs, acquireWakeLock]);

  const stopWebTracking = useCallback(() => {
    trackingRef.current = false;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    releaseWakeLock();
    if (mountedRef.current) {
      setLocationState((prev) => prev.isTracking ? { ...prev, isTracking: false } : prev);
    }
  }, [releaseWakeLock]);

  // ── Stale position checker (adaptive) ──
  useEffect(() => {
    if (!enabled) return;

    staleCheckRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setLocationState((prev) => {
        if (!prev.lastUpdate) return prev;
        const age = Date.now() - prev.lastUpdate.getTime();
        const threshold = computeStaleThreshold(lastSpeedRef.current, prev.accuracy);
        const isStale = age > threshold;
        return isStale !== prev.isStale ? { ...prev, isStale } : prev;
      });
    }, 10_000);

    return () => {
      if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    };
  }, [enabled]);

  // ── Main effect: start/stop based on platform ──
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && driverId && !Capacitor.isNativePlatform()) {
      startWebTracking();
    } else if (!enabled || !driverId) {
      stopWebTracking();
    }
    return () => {
      mountedRef.current = false;
      stopWebTracking();
    };
  }, [enabled, driverId, startWebTracking, stopWebTracking]);

  // Merge native position into state (only if changed)
  useEffect(() => {
    if (Capacitor.isNativePlatform() && nativeGeo.latitude && nativeGeo.longitude) {
      setLocationState((prev) => {
        if (prev.latitude === nativeGeo.latitude && prev.longitude === nativeGeo.longitude) return prev;
        return {
          ...prev,
          latitude: nativeGeo.latitude,
          longitude: nativeGeo.longitude,
          accuracy: nativeGeo.accuracy,
          isTracking: true,
        };
      });
    }
  }, [nativeGeo.latitude, nativeGeo.longitude, nativeGeo.accuracy]);

  // ── Availability toggle ──
  const updateAvailability = useCallback(
    async (isAvailable: boolean) => {
      if (!driverId) return;
      try {
        // Guard: never reset to online/offline if driver has an active course
        const { data: activeCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('driver_id', driverId)
          .in('status', ['driver_approaching', 'in_progress', 'driver_arrived'] as any[])
          .limit(1)
          .maybeSingle();

        if (activeCourse) {
          console.warn('[GPS] Blocked availability toggle — active course exists');
          return;
        }

        await supabase
          .from('drivers')
          .update({
            is_available_now: isAvailable,
            driver_status: isAvailable ? 'online' : 'offline',
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
