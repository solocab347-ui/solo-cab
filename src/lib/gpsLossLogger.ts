/**
 * GPS Loss Logger
 *
 * Trace les anomalies GPS chauffeur:
 *  - watchdog_triggered      : le watchdog a re-armé le watcher
 *  - background_pause        : l'app est passée en arrière-plan
 *  - foreground_service_lost : le foreground service a été tué
 *  - no_fix_timeout          : aucun fix depuis > N secondes
 *  - low_accuracy            : précision moyenne dégradée
 *  - stale_forced_offline    : écrit côté serveur par detect_and_fix_stale_gps_drivers
 *
 * Inserts directs (pas de batch) pour garantir la trace même si l'app crashe.
 */
import { supabase } from '@/integrations/supabase/client';

export type GpsLossType =
  | 'watchdog_triggered'
  | 'background_pause'
  | 'foreground_service_lost'
  | 'no_fix_timeout'
  | 'low_accuracy';

interface LogParams {
  driverId: string;
  lossType: GpsLossType;
  gapMs?: number;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  details?: Record<string, unknown>;
}

let lastInsertAt = 0;

export async function logGpsLoss(params: LogParams) {
  const { driverId, lossType, gapMs, lat, lng, accuracyM, details } = params;
  // Anti-spam: max 1/sec par client
  const now = Date.now();
  if (now - lastInsertAt < 1000) return;
  lastInsertAt = now;

  console.warn(`[gpsLoss] ${lossType}`, { driverId, gapMs, accuracyM, ...details });

  try {
    await supabase.from('gps_loss_log').insert({
      driver_id: driverId,
      loss_type: lossType,
      gap_ms: gapMs ?? null,
      last_known_lat: lat ?? null,
      last_known_lng: lng ?? null,
      details: { ...(details ?? {}), accuracy_m: accuracyM ?? null },
    } as any);
  } catch (e) {
    console.warn('[gpsLoss] insert failed', e);
  }
}
