import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Tuning ────────────────────────────────────────────────────────────
// Real driver GPS pings hit the DB roughly every 8-20s (heartbeat).
// We poll the parent loader for `driverLocation` updates; refresh the
// ETA on every meaningful change (≥20 m moved) and at most every 5 s
// to keep Mapbox usage bounded.
const MIN_DISTANCE_CHANGE_M = 20;
const POLL_INTERVAL_MS = 5_000;
const MIN_FETCH_INTERVAL_MS = 4_000; // Hard floor between two Mapbox calls
const STALE_AFTER_MS = 30_000; // Driver hasn't moved → ETA is "stalled" (do NOT fake decay)
const FALLBACK_AVERAGE_SPEED_KMH = 28;

interface Coordinates {
  lat: number;
  lng: number;
}

export interface ETAData {
  distanceKm: number;
  durationMin: number;
  lastUpdated: Date;
  /** True when the driver hasn't moved for >STALE_AFTER_MS */
  isStalled?: boolean;
  routeGeometry?: GeoJSON.LineString | null;
}

interface UseETAOptions {
  driverLocation: Coordinates | null;
  targetLocation: Coordinates | null;
  enabled: boolean;
}

function haversineDistanceM(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildFallbackETA(origin: Coordinates, dest: Coordinates): ETAData {
  const distanceKmRaw = haversineDistanceM(origin, dest) / 1000;
  const distanceKm = Math.max(0.1, Math.round(distanceKmRaw * 10) / 10);
  const durationMin = Math.max(
    1,
    Math.round((distanceKm / FALLBACK_AVERAGE_SPEED_KMH) * 60)
  );
  return { distanceKm, durationMin, lastUpdated: new Date(), routeGeometry: null };
}

async function fetchDirections(
  origin: Coordinates,
  dest: Coordinates
): Promise<ETAData | null> {
  try {
    const { data, error } = await supabase.functions.invoke("calculate-mapbox-route", {
      body: {
        pickup_latitude: origin.lat,
        pickup_longitude: origin.lng,
        destination_latitude: dest.lat,
        destination_longitude: dest.lng,
      },
    });

    if (error || !data?.success) return buildFallbackETA(origin, dest);

    return {
      distanceKm: Number(data.distance_km ?? 0),
      durationMin: Math.max(0, Number(data.duration_minutes ?? 0)),
      lastUpdated: new Date(),
      routeGeometry: data.route_geometry ?? null,
    };
  } catch {
    return buildFallbackETA(origin, dest);
  }
}

/**
 * Returns the live ETA (distance + duration) between the driver and a target
 * point (pickup OR destination). The ETA is updated ONLY from real GPS
 * movement — there is NO artificial countdown between two GPS pings, so the
 * progress bar truly reflects what the driver does on the road.
 */
export function useETACalculation({
  driverLocation,
  targetLocation,
  enabled,
}: UseETAOptions) {
  const [eta, setEta] = useState<ETAData | null>(null);
  const [loading, setLoading] = useState(false);

  const lastDriverPos = useRef<Coordinates | null>(null);
  const lastTargetPos = useRef<Coordinates | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const lastMovementAtRef = useRef<number>(Date.now());
  const inFlightRef = useRef<boolean>(false);

  const calculate = useCallback(
    async (force = false) => {
      if (!driverLocation || !targetLocation || !enabled) return;
      if (inFlightRef.current) return;

      const now = Date.now();
      const targetChanged =
        !lastTargetPos.current ||
        haversineDistanceM(lastTargetPos.current, targetLocation) > 100;

      let driverMovedM = Number.POSITIVE_INFINITY;
      if (lastDriverPos.current) {
        driverMovedM = haversineDistanceM(lastDriverPos.current, driverLocation);
      }

      const significantMove = driverMovedM >= MIN_DISTANCE_CHANGE_M;
      const fetchTooSoon = now - lastFetchAtRef.current < MIN_FETCH_INTERVAL_MS;

      // Decide whether to actually call Mapbox
      const shouldFetch =
        force || !eta || targetChanged || (significantMove && !fetchTooSoon);

      // Track last real movement timestamp (used to flag "stalled" state)
      if (significantMove) lastMovementAtRef.current = now;

      if (!shouldFetch) {
        // Just refresh stalled-flag without re-fetching
        if (eta) {
          const isStalled = now - lastMovementAtRef.current > STALE_AFTER_MS;
          if ((eta.isStalled ?? false) !== isStalled) {
            setEta({ ...eta, isStalled });
          }
        }
        return;
      }

      inFlightRef.current = true;
      setLoading(true);
      const result = await fetchDirections(driverLocation, targetLocation);
      inFlightRef.current = false;
      setLoading(false);

      if (result) {
        const isStalled = now - lastMovementAtRef.current > STALE_AFTER_MS;
        setEta({ ...result, isStalled });
        lastDriverPos.current = driverLocation;
        lastTargetPos.current = targetLocation;
        lastFetchAtRef.current = now;
      }
    },
    [driverLocation, targetLocation, enabled, eta]
  );

  // Reset cache + clear stale ETA when target changes (phase switch)
  useEffect(() => {
    lastDriverPos.current = null;
    lastTargetPos.current = null;
    lastFetchAtRef.current = 0;
    lastMovementAtRef.current = Date.now();
    setEta(null);
  }, [targetLocation?.lat, targetLocation?.lng]);

  // Reactive recompute whenever driver position changes
  useEffect(() => {
    if (!enabled) return;
    calculate(false);
  }, [enabled, driverLocation?.lat, driverLocation?.lng, calculate]);

  // Background safety poll: re-evaluates "stalled" flag, no extra Mapbox call
  // unless the driver moved enough. Doubled interval to reduce overall load.
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => calculate(false), POLL_INTERVAL_MS * 2);
    return () => clearInterval(interval);
  }, [enabled, calculate]);

  const forceRefresh = useCallback(() => {
    lastFetchAtRef.current = 0;
    calculate(true);
  }, [calculate]);

  return { eta, loading, forceRefresh };
}
