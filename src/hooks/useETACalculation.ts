import { useState, useEffect, useRef, useCallback } from "react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || "";
const MIN_DISTANCE_CHANGE_M = 50; // Only recalculate if driver moved >50m
const POLL_INTERVAL_MS = 10_000; // 10 seconds
const FALLBACK_AVERAGE_SPEED_KMH = 28;

interface Coordinates {
  lat: number;
  lng: number;
}

export interface ETAData {
  distanceKm: number;
  durationMin: number;
  lastUpdated: Date;
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
  const h = sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildFallbackETA(origin: Coordinates, dest: Coordinates): ETAData {
  const distanceKmRaw = haversineDistanceM(origin, dest) / 1000;
  const distanceKm = Math.max(0.1, Math.round(distanceKmRaw * 10) / 10);
  const durationMin = Math.max(1, Math.round((distanceKm / FALLBACK_AVERAGE_SPEED_KMH) * 60));

  return {
    distanceKm,
    durationMin,
    lastUpdated: new Date(),
  };
}

async function fetchDirections(origin: Coordinates, dest: Coordinates): Promise<ETAData | null> {
  if (!MAPBOX_TOKEN) {
    return buildFallbackETA(origin, dest);
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return buildFallbackETA(origin, dest);
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return buildFallbackETA(origin, dest);
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      lastUpdated: new Date(),
    };
  } catch {
    return buildFallbackETA(origin, dest);
  }
}

export function useETACalculation({ driverLocation, targetLocation, enabled }: UseETAOptions) {
  const [eta, setEta] = useState<ETAData | null>(null);
  const [loading, setLoading] = useState(false);
  const lastDriverPos = useRef<Coordinates | null>(null);
  const lastTargetPos = useRef<Coordinates | null>(null);

  const calculate = useCallback(async () => {
    if (!driverLocation || !targetLocation || !enabled) return;

    const targetChanged = !lastTargetPos.current 
      || haversineDistanceM(lastTargetPos.current, targetLocation) > 100;

    // Skip if driver hasn't moved enough AND target hasn't changed
    if (!targetChanged && lastDriverPos.current) {
      const moved = haversineDistanceM(lastDriverPos.current, driverLocation);
      if (moved < MIN_DISTANCE_CHANGE_M && eta) return;
    }

    setLoading(true);
    const result = await fetchDirections(driverLocation, targetLocation);
    if (result) {
      setEta(result);
      lastDriverPos.current = driverLocation;
      lastTargetPos.current = targetLocation;
    }
    setLoading(false);
  }, [driverLocation, targetLocation, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset cache when target changes (e.g., approaching → in_progress)
  useEffect(() => {
    lastDriverPos.current = null;
    lastTargetPos.current = null;
  }, [targetLocation?.lat, targetLocation?.lng]);

  // Initial calculation + polling
  useEffect(() => {
    if (!enabled || !driverLocation || !targetLocation) return;

    calculate();
    const interval = setInterval(calculate, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [calculate, enabled, driverLocation?.lat, driverLocation?.lng, targetLocation?.lat, targetLocation?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const forceRefresh = useCallback(() => {
    lastDriverPos.current = null;
    lastTargetPos.current = null;
    calculate();
  }, [calculate]);

  return { eta, loading, forceRefresh };
}
