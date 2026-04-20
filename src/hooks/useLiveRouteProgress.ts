import { useEffect, useMemo, useRef, useState } from "react";
import type { ETAData } from "@/hooks/useETACalculation";

interface UseLiveRouteProgressOptions {
  phase: "approaching" | "in_progress";
  eta: ETAData | null;
  fallbackTotalDistanceKm?: number | null;
}

/**
 * Shared live-progress source of truth used by chauffeur/client/guest UIs.
 *
 * We anchor the total phase distance to the first real ETA reading so the
 * marker/progress bar starts honestly at 0% for the current phase.
 */
export function useLiveRouteProgress({
  phase,
  eta,
  fallbackTotalDistanceKm,
}: UseLiveRouteProgressOptions) {
  const [phaseTotalKm, setPhaseTotalKm] = useState<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      setPhaseTotalKm(null);
    }
  }, [phase]);

  useEffect(() => {
    if (!eta || eta.distanceKm <= 0) return;

    setPhaseTotalKm((current) => {
      if (current && current > 0) {
        return Math.max(current, eta.distanceKm);
      }
      return eta.distanceKm;
    });
  }, [eta?.distanceKm, phase]);

  const referenceTotalKm = useMemo(() => {
    if (phaseTotalKm && phaseTotalKm > 0) return phaseTotalKm;
    if (fallbackTotalDistanceKm && fallbackTotalDistanceKm > 0) return fallbackTotalDistanceKm;
    return null;
  }, [phaseTotalKm, fallbackTotalDistanceKm]);

  const progressPercent = useMemo(() => {
    if (eta && referenceTotalKm && referenceTotalKm > 0) {
      return Math.max(
        0,
        Math.min(100, ((referenceTotalKm - eta.distanceKm) / referenceTotalKm) * 100)
      );
    }

    if (eta && eta.distanceKm === 0) return 100;
    return 0;
  }, [eta, referenceTotalKm]);

  const isStalled = eta?.isStalled === true && progressPercent < 99;

  return {
    referenceTotalKm,
    progressPercent,
    remainingDistanceKm: eta?.distanceKm ?? null,
    remainingDurationMin: eta?.durationMin ?? null,
    isStalled,
  };
}