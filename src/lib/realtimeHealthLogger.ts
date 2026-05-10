/**
 * Realtime Health Logger
 *
 * Bufferise les événements d'observabilité (réception courses, latence DB→UI,
 * reconnexions, sockets zombies, UPDATE manqués) et flush en batch toutes les 30s
 * vers la table `realtime_health_log`.
 *
 * Objectif : mesurer la stabilité réelle du Realtime en production sans saturer
 * la base ni le réseau (1 INSERT batch/30s par client).
 *
 * Sécurité : RLS impose que les inserts soient liés à l'utilisateur courant ou
 * à son profil chauffeur. Si l'utilisateur n'est pas authentifié, on ne flush pas.
 */
import { supabase } from '@/integrations/supabase/client';

export type RealtimeHealthEventType =
  | 'course_received'
  | 'course_latency'
  | 'realtime_reconnect'
  | 'realtime_zombie_detected'
  | 'realtime_channel_error'
  | 'missed_update_detected'
  | 'gps_loss'
  | 'app_state_resume'
  | 'app_state_pause'
  | 'heartbeat_failed';

interface HealthEvent {
  event_type: RealtimeHealthEventType;
  channel_name?: string | null;
  latency_ms?: number | null;
  details?: Record<string, unknown>;
  driver_id?: string | null;
  user_id?: string | null;
}

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BUFFER = 200;

class RealtimeHealthLogger {
  private buffer: HealthEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private currentDriverId: string | null = null;
  private currentUserId: string | null = null;
  private deviceInfo: Record<string, unknown> = {};

  init(opts: { driverId?: string | null; userId?: string | null }) {
    this.currentDriverId = opts.driverId ?? null;
    this.currentUserId = opts.userId ?? null;

    // Snapshot device info (cheap, once)
    if (typeof navigator !== 'undefined') {
      this.deviceInfo = {
        ua: navigator.userAgent,
        platform: (navigator as any).platform,
        online: navigator.onLine,
        is_capacitor: typeof (window as any)?.Capacitor !== 'undefined',
      };
    }

    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
      // Flush on tab close / app pause
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.flush(true));
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') this.flush(true);
        });
      }
    }
  }

  log(event: HealthEvent) {
    if (this.buffer.length >= MAX_BUFFER) {
      this.buffer.shift();
    }
    this.buffer.push({
      ...event,
      driver_id: event.driver_id ?? this.currentDriverId,
      user_id: event.user_id ?? this.currentUserId,
    });

    // Sentry breadcrumb (async import to avoid web/native ambiguity)
    import('@/lib/sentry').then(({ addBreadcrumb }) => {
      addBreadcrumb(
        event.event_type,
        'realtime',
        event.event_type.includes('zombie') || event.event_type.includes('failed') ? 'warning' : 'info',
        { channel: event.channel_name, latency_ms: event.latency_ms, ...event.details },
      );
    }).catch(() => {});

    if (event.event_type !== 'course_latency') {
      console.log(`[realtimeHealth] ${event.event_type}`, {
        channel: event.channel_name,
        latency_ms: event.latency_ms,
        ...event.details,
      });
    }
  }

  async flush(immediate = false) {
    if (this.buffer.length === 0) return;
    if (!this.currentUserId && !this.currentDriverId) {
      // Not authenticated: drop, RLS would refuse
      this.buffer = [];
      return;
    }

    const batch = this.buffer.splice(0, this.buffer.length);
    const rows = batch.map((e) => ({
      driver_id: e.driver_id ?? null,
      user_id: e.user_id ?? null,
      event_type: e.event_type,
      channel_name: e.channel_name ?? null,
      latency_ms: e.latency_ms ?? null,
      details: (e.details ?? {}) as any,
      device_info: this.deviceInfo as any,
    }));

    try {
      const { error } = await supabase.from('realtime_health_log').insert(rows as any);
      if (error) {
        console.warn('[realtimeHealth] flush failed, requeueing', error);
        // Re-queue at front (best-effort), but cap memory
        this.buffer = [...rows.slice(0, 50).map((r) => ({
          event_type: r.event_type as RealtimeHealthEventType,
          channel_name: r.channel_name,
          latency_ms: r.latency_ms,
          details: r.details as Record<string, unknown>,
          driver_id: r.driver_id,
          user_id: r.user_id,
        })), ...this.buffer];
      }
    } catch (err) {
      console.warn('[realtimeHealth] flush exception', err);
    }
  }

  reset() {
    this.buffer = [];
    this.currentDriverId = null;
    this.currentUserId = null;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const realtimeHealthLogger = new RealtimeHealthLogger();
