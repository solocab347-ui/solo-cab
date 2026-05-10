import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/performanceOptimizations';
import { realtimeHealthLogger } from '@/lib/realtimeHealthLogger';

/**
 * Gestionnaire centralisé optimisé des subscriptions Supabase
 *
 * Stabilité (v3 — heartbeat + zombie detection):
 * - Cap 30 channels (eviction FIFO si dépassé).
 * - Reconnexion automatique sur visibilitychange + `online` + Capacitor `appStateChange`.
 * - Retry exponentiel sur CHANNEL_ERROR / CLOSED.
 * - **Heartbeat 25s** : chaque channel doit avoir reçu un évènement OU un ack
 *   (postgres_changes confirme via le subscribe status). Si > HEARTBEAT_MAX_SILENCE
 *   sans aucun signal et aucune activité serveur attendue, on présume zombie et on
 *   force un reconnect + log dans `realtime_health_log` via realtimeHealthLogger.
 * - Toutes les transitions importantes (subscribe error, reconnect, zombie) sont loggées.
 */

type ChannelConfig = {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  debounceMs?: number;
};

type ChannelEntry = {
  channel: RealtimeChannel;
  config: ChannelConfig;
  callback: (payload: any) => void;
  debouncedCallback: (payload: any) => void;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  lastActivityAt: number;
  lastSubscribeStatus: string;
};

const MAX_CHANNELS = 30;
const MAX_RETRY = 5;
const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_MAX_SILENCE_MS = 90_000; // 90s sans aucun signal => suspect

class SubscriptionManager {
  private entries: Map<string, ChannelEntry> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.healthCheck('visibilitychange');
        }
      });
      window.addEventListener('online', () => this.healthCheck('online'));
      window.addEventListener('beforeunload', () => this.unsubscribeAll());

      this.startHeartbeat();
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.runHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Heartbeat : pour chaque channel, vérifier qu'il a eu une activité ou qu'il
   * est en état "joined". Si silence > HEARTBEAT_MAX_SILENCE_MS et état suspect,
   * on log un zombie et on reconnecte.
   */
  private runHeartbeat() {
    const now = Date.now();
    this.entries.forEach((entry, name) => {
      const state = (entry.channel as any)?.state;
      const silence = now - entry.lastActivityAt;

      if (state === 'joined' && silence < HEARTBEAT_MAX_SILENCE_MS) {
        // Channel probablement OK
        return;
      }

      if (state !== 'joined') {
        // État anormal
        realtimeHealthLogger.log({
          event_type: 'heartbeat_failed',
          channel_name: name,
          details: { state, silence_ms: silence, retry_count: entry.retryCount },
        });
        this.scheduleRetry(name, true);
        return;
      }

      if (silence >= HEARTBEAT_MAX_SILENCE_MS) {
        // Joined mais silencieux trop longtemps : suspect zombie
        realtimeHealthLogger.log({
          event_type: 'realtime_zombie_detected',
          channel_name: name,
          details: { state, silence_ms: silence },
        });
        this.forceReconnect(name);
      }
    });
  }

  private touchActivity(name: string) {
    const entry = this.entries.get(name);
    if (entry) entry.lastActivityAt = Date.now();
  }

  private forceReconnect(name: string) {
    const entry = this.entries.get(name);
    if (!entry) return;
    realtimeHealthLogger.log({
      event_type: 'realtime_reconnect',
      channel_name: name,
      details: { reason: 'forced_zombie_reconnect' },
    });
    try { supabase.removeChannel(entry.channel); } catch { /* noop */ }
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    this.entries.delete(name);
    this.attach(name, entry.config, entry.callback, 0);
  }

  subscribe(
    channelName: string,
    config: ChannelConfig,
    callback: (payload: any) => void
  ): () => void {
    if (this.entries.size >= MAX_CHANNELS && !this.entries.has(channelName)) {
      console.warn(`⚠️ [subscriptionManager] cap reached (${MAX_CHANNELS}), evicting oldest`);
      const oldestChannel = Array.from(this.entries.keys())[0];
      this.unsubscribe(oldestChannel);
    }

    if (this.entries.has(channelName)) {
      this.unsubscribe(channelName);
    }

    this.attach(channelName, config, callback, 0);
    return () => this.unsubscribe(channelName);
  }

  private attach(
    channelName: string,
    config: ChannelConfig,
    callback: (payload: any) => void,
    retryCount: number,
  ) {
    const wrappedCallback = (payload: any) => {
      this.touchActivity(channelName);
      callback(payload);
    };

    const debouncedCallback = config.debounceMs
      ? (debounce(wrappedCallback, config.debounceMs) as (payload: any) => void)
      : wrappedCallback;

    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false }, presence: { key: '' } },
      })
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        } as any,
        debouncedCallback
      )
      .subscribe((status) => {
        const entry = this.entries.get(channelName);
        if (entry) {
          entry.lastSubscribeStatus = status;
          if (status === 'SUBSCRIBED') {
            entry.lastActivityAt = Date.now();
          }
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeHealthLogger.log({
            event_type: 'realtime_channel_error',
            channel_name: channelName,
            details: { status, retry_count: retryCount },
          });
          this.scheduleRetry(channelName);
        }
      });

    this.entries.set(channelName, {
      channel,
      config,
      callback,
      debouncedCallback,
      retryCount,
      retryTimer: null,
      lastActivityAt: Date.now(),
      lastSubscribeStatus: 'SUBSCRIBING',
    });
  }

  private scheduleRetry(channelName: string, immediate = false) {
    const entry = this.entries.get(channelName);
    if (!entry) return;
    if (entry.retryTimer) return;

    if (entry.retryCount >= MAX_RETRY) {
      console.warn(`⚠️ [subscriptionManager] max retries reached for ${channelName}, giving up`);
      realtimeHealthLogger.log({
        event_type: 'realtime_channel_error',
        channel_name: channelName,
        details: { reason: 'max_retries_exhausted', retry_count: entry.retryCount },
      });
      return;
    }

    const delay = immediate ? 500 : Math.min(16_000, 1000 * Math.pow(2, entry.retryCount));
    entry.retryTimer = setTimeout(() => {
      const current = this.entries.get(channelName);
      if (!current) return;
      const nextRetry = current.retryCount + 1;
      try { supabase.removeChannel(current.channel); } catch { /* noop */ }
      realtimeHealthLogger.log({
        event_type: 'realtime_reconnect',
        channel_name: channelName,
        details: { reason: 'scheduled_retry', attempt: nextRetry },
      });
      this.attach(channelName, current.config, current.callback, nextRetry);
    }, delay);
  }

  /** Force re-subscribe of all currently-tracked channels not in 'joined' state. */
  healthCheck(reason: string = 'manual') {
    if (this.entries.size === 0) return;
    const snapshots = Array.from(this.entries.entries()).map(([name, e]) => ({
      name,
      config: e.config,
      callback: e.callback,
    }));
    let recovered = 0;
    snapshots.forEach(({ name, config, callback }) => {
      const entry = this.entries.get(name);
      if (!entry) return;
      const state = (entry.channel as any).state;
      if (state !== 'joined' && state !== 'joining') {
        try { supabase.removeChannel(entry.channel); } catch { /* noop */ }
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        this.entries.delete(name);
        this.attach(name, config, callback, 0);
        recovered++;
      }
    });
    if (recovered > 0) {
      realtimeHealthLogger.log({
        event_type: 'realtime_reconnect',
        details: { reason: `healthcheck_${reason}`, recovered_count: recovered, total: snapshots.length },
      });
    }
  }

  unsubscribe(channelName: string): void {
    const entry = this.entries.get(channelName);
    if (!entry) return;
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    try { supabase.removeChannel(entry.channel); } catch { /* noop */ }
    this.entries.delete(channelName);
  }

  unsubscribeAll(): void {
    this.entries.forEach((_e, name) => this.unsubscribe(name));
  }

  getActiveCount(): number { return this.entries.size; }
  isActive(channelName: string): boolean { return this.entries.has(channelName); }
}

export const subscriptionManager = new SubscriptionManager();
