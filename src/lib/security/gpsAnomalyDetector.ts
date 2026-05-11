/**
 * Client-side GPS spoof / anomaly detector.
 *
 * Receives sequential GPS samples and reports anomalies to the backend
 * via the `record_gps_anomaly` RPC. Heuristics:
 *  - impossible_speed: instantaneous speed > 250 km/h
 *  - teleport_jump:    distance > 5 km in < 10 s
 *  - mock_location:    Android `is_mock_location` flag set
 *  - stale_gps:        > 5 min between fixes while ride active
 */

import { supabase } from '@/integrations/supabase/client';

export interface GpsSample {
  lat: number;
  lng: number;
  timestamp: number; // ms
  isMock?: boolean;
  accuracy?: number;
}

const IMPOSSIBLE_SPEED_KMH = 250;
const TELEPORT_DISTANCE_M = 5_000;
const TELEPORT_WINDOW_S = 10;
const STALE_GPS_S = 5 * 60;

function haversineMeters(a: GpsSample, b: GpsSample): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const lastByDriver = new Map<string, GpsSample>();

export interface AnomalyReport {
  type: 'impossible_speed' | 'teleport_jump' | 'mock_location' | 'stale_gps';
  speedKmh?: number;
  distanceM?: number;
  durationS?: number;
}

export async function checkGpsSample(
  driverId: string,
  rideId: string | null,
  sample: GpsSample,
): Promise<AnomalyReport[]> {
  const anomalies: AnomalyReport[] = [];

  if (sample.isMock) {
    anomalies.push({ type: 'mock_location' });
  }

  const prev = lastByDriver.get(driverId);
  if (prev) {
    const dtS = Math.max((sample.timestamp - prev.timestamp) / 1000, 0.001);
    const distM = haversineMeters(prev, sample);
    const speedKmh = (distM / dtS) * 3.6;

    if (speedKmh > IMPOSSIBLE_SPEED_KMH) {
      anomalies.push({ type: 'impossible_speed', speedKmh, distanceM: distM, durationS: dtS });
    }
    if (distM > TELEPORT_DISTANCE_M && dtS < TELEPORT_WINDOW_S) {
      anomalies.push({ type: 'teleport_jump', distanceM: distM, durationS: dtS });
    }
    if (dtS > STALE_GPS_S) {
      anomalies.push({ type: 'stale_gps', durationS: dtS });
    }
  }
  lastByDriver.set(driverId, sample);

  for (const a of anomalies) {
    try {
      await supabase.rpc('record_gps_anomaly', {
        _driver_id: driverId,
        _ride_id: rideId,
        _anomaly_type: a.type,
        _observed_speed_kmh: a.speedKmh ?? null,
        _jump_distance_m: a.distanceM ?? null,
        _jump_duration_s: a.durationS ?? null,
        _prev_lat: prev?.lat ?? null,
        _prev_lng: prev?.lng ?? null,
        _curr_lat: sample.lat,
        _curr_lng: sample.lng,
        _is_mock: !!sample.isMock,
        _metadata: { accuracy: sample.accuracy ?? null },
      });
    } catch {
      // best effort — never block GPS pipeline on telemetry
    }
  }
  return anomalies;
}

export function resetGpsState(driverId?: string) {
  if (driverId) lastByDriver.delete(driverId);
  else lastByDriver.clear();
}
