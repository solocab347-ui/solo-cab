/**
 * Course Latency Tracker
 *
 * Mesure le cycle de vie complet d'une course côté chauffeur:
 *   1. insert_to_received   = INSERT DB → réception côté chauffeur (Realtime ou polling)
 *   2. received_to_overlay  = réception → affichage de l'overlay incoming
 *   3. overlay_to_accept    = affichage overlay → clic acceptation
 *   4. accept_to_status     = UPDATE statut côté chauffeur → synchro côté client
 *
 * Les latences sont écrites comme `event_type='course_latency'` avec
 * `details = { phase, ride_id, source }` pour permettre les requêtes p50/p95/p99
 * via la RPC `get_course_latency_percentiles`.
 */
import { realtimeHealthLogger } from './realtimeHealthLogger';

export type CoursePhase =
  | 'insert_to_received'
  | 'received_to_overlay'
  | 'overlay_to_accept'
  | 'accept_to_status';

interface PendingTimings {
  insertedAtMs?: number;
  receivedAtMs?: number;
  overlayShownAtMs?: number;
  acceptedAtMs?: number;
  source?: string;
}

const pending = new Map<string, PendingTimings>();
// Bound memory: cleanup oldest after 200 entries
function gc() {
  if (pending.size > 200) {
    const keys = Array.from(pending.keys()).slice(0, pending.size - 150);
    keys.forEach((k) => pending.delete(k));
  }
}

function get(rideId: string): PendingTimings {
  let p = pending.get(rideId);
  if (!p) {
    p = {};
    pending.set(rideId, p);
    gc();
  }
  return p;
}

function record(phase: CoursePhase, latencyMs: number, rideId: string, source?: string) {
  if (latencyMs < 0 || latencyMs > 10 * 60_000) return; // ignore garbage (>10min)
  realtimeHealthLogger.log({
    event_type: 'course_latency',
    latency_ms: Math.round(latencyMs),
    details: { phase, ride_id: rideId, source: source ?? null },
  });
}

export const courseLatency = {
  /** Appelé à la réception (Realtime payload OR polling discovery). */
  markReceived(rideId: string, insertedAtIso?: string | null, source?: string) {
    const t = get(rideId);
    if (t.receivedAtMs) return; // already marked
    t.receivedAtMs = Date.now();
    t.source = source;
    if (insertedAtIso) {
      t.insertedAtMs = new Date(insertedAtIso).getTime();
      record('insert_to_received', t.receivedAtMs - t.insertedAtMs, rideId, source);
    }
  },

  /** Appelé quand l'overlay incoming s'affiche. */
  markOverlayShown(rideId: string, source?: string) {
    const t = get(rideId);
    if (t.overlayShownAtMs) return;
    t.overlayShownAtMs = Date.now();
    if (t.receivedAtMs) {
      record('received_to_overlay', t.overlayShownAtMs - t.receivedAtMs, rideId, source ?? t.source);
    }
  },

  /** Appelé quand le chauffeur accepte. */
  markAccepted(rideId: string, source?: string) {
    const t = get(rideId);
    if (t.acceptedAtMs) return;
    t.acceptedAtMs = Date.now();
    if (t.overlayShownAtMs) {
      record('overlay_to_accept', t.acceptedAtMs - t.overlayShownAtMs, rideId, source ?? t.source);
    }
  },

  /** Appelé quand le client reçoit la confirmation (UPDATE -> client). */
  markStatusSynced(rideId: string, source?: string) {
    const t = pending.get(rideId);
    if (!t || !t.acceptedAtMs) return;
    record('accept_to_status', Date.now() - t.acceptedAtMs, rideId, source ?? t.source);
    // Cycle complet: on peut purger
    pending.delete(rideId);
  },

  /** Permet de purger explicitement (dismiss, expire). */
  drop(rideId: string) {
    pending.delete(rideId);
  },
};
