import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/performanceOptimizations';

/**
 * Gestionnaire centralisé optimisé des subscriptions Supabase
 *
 * Stabilité (v2):
 * - Cap relevé à 30 (15 était trop bas et provoquait des évictions FIFO silencieuses
 *   qui se manifestaient par des "freezes" perçus utilisateur).
 * - Reconnexion automatique sur visibilitychange (réveil de l'onglet) et `online`.
 * - Retry exponentiel sur CHANNEL_ERROR / CLOSED au lieu d'un unsubscribe définitif.
 * - Cleanup propre lors du unmount, sans perdre les configs pour pouvoir reconnecter.
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
};

const MAX_CHANNELS = 30;
const MAX_RETRY = 5;

class SubscriptionManager {
  private entries: Map<string, ChannelEntry> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      // Reconnect dead channels when tab becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.healthCheck();
        }
      });
      // Reconnect when network comes back
      window.addEventListener('online', () => this.healthCheck());

      // Cleanup on unload
      window.addEventListener('beforeunload', () => this.unsubscribeAll());
    }
  }

  /**
   * Subscribe to changes with automatic cleanup, debouncing, and reconnection
   */
  subscribe(
    channelName: string,
    config: ChannelConfig,
    callback: (payload: any) => void
  ): () => void {
    // Cap: warn but evict the OLDEST (FIFO) only if necessary
    if (this.entries.size >= MAX_CHANNELS && !this.entries.has(channelName)) {
      console.warn(`⚠️ [subscriptionManager] cap reached (${MAX_CHANNELS}), evicting oldest`);
      const oldestChannel = Array.from(this.entries.keys())[0];
      this.unsubscribe(oldestChannel);
    }

    // Replace existing channel for the same name to ensure latest callback is used
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
    const debouncedCallback = config.debounceMs
      ? (debounce(callback, config.debounceMs) as (payload: any) => void)
      : callback;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
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
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
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
    });
  }

  private scheduleRetry(channelName: string) {
    const entry = this.entries.get(channelName);
    if (!entry) return;
    if (entry.retryTimer) return; // already scheduled

    if (entry.retryCount >= MAX_RETRY) {
      console.warn(`⚠️ [subscriptionManager] max retries reached for ${channelName}, giving up`);
      return;
    }

    // Backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(16_000, 1000 * Math.pow(2, entry.retryCount));
    entry.retryTimer = setTimeout(() => {
      const current = this.entries.get(channelName);
      if (!current) return;
      const nextRetry = current.retryCount + 1;
      // Tear down old channel cleanly
      try { supabase.removeChannel(current.channel); } catch (_) { /* noop */ }
      // Re-attach with fresh subscription
      this.attach(channelName, current.config, current.callback, nextRetry);
    }, delay);
  }

  /**
   * Force a re-subscribe of all currently-tracked channels.
   * Called when the tab becomes visible or the network reconnects.
   */
  private healthCheck() {
    if (this.entries.size === 0) return;
    const snapshots = Array.from(this.entries.entries()).map(([name, e]) => ({
      name,
      config: e.config,
      callback: e.callback,
    }));
    snapshots.forEach(({ name, config, callback }) => {
      // Only re-attach if the channel state is not joined.
      // Supabase RealtimeChannel exposes state via .state — be defensive.
      const entry = this.entries.get(name);
      if (!entry) return;
      const state = (entry.channel as any).state;
      if (state !== 'joined' && state !== 'joining') {
        try { supabase.removeChannel(entry.channel); } catch (_) { /* noop */ }
        if (entry.retryTimer) { clearTimeout(entry.retryTimer); }
        this.entries.delete(name);
        this.attach(name, config, callback, 0);
      }
    });
  }

  /**
   * Unsubscribe from a specific channel (final — no retry).
   */
  unsubscribe(channelName: string): void {
    const entry = this.entries.get(channelName);
    if (!entry) return;
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    try { supabase.removeChannel(entry.channel); } catch (_) { /* noop */ }
    this.entries.delete(channelName);
  }

  unsubscribeAll(): void {
    this.entries.forEach((_e, name) => this.unsubscribe(name));
  }

  getActiveCount(): number {
    return this.entries.size;
  }

  isActive(channelName: string): boolean {
    return this.entries.has(channelName);
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();
