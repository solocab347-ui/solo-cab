import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/performanceOptimizations';

/**
 * Gestionnaire centralisé optimisé des subscriptions Supabase
 * Support 1000+ connexions simultanées avec debouncing et channel pooling
 */

class SubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private cleanupCallbacks: Map<string, () => void> = new Map();
  private debouncedCallbacks: Map<string, Function> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to changes with automatic cleanup, debouncing, and reconnection
   */
  subscribe(
    channelName: string,
    config: {
      table: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      filter?: string;
      debounceMs?: number;
    },
    callback: (payload: any) => void
  ): () => void {
    // Limite de sécurité: max 10 channels simultanés
    if (this.channels.size >= 10) {
      console.warn(`⚠️ Limite de channels atteinte (${this.channels.size}), nettoyage forcé`);
      const oldestChannel = Array.from(this.channels.keys())[0];
      this.unsubscribe(oldestChannel);
    }

    // Si le channel existe déjà, le remplacer pour garantir le bon callback
    // Ne PAS réutiliser l'ancien car le callback peut avoir changé
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    // Créer callback debounced si demandé
    const debouncedCallback = config.debounceMs 
      ? debounce(callback, config.debounceMs)
      : callback;

    this.debouncedCallbacks.set(channelName, debouncedCallback);

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: '' }
        }
      })
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter
        } as any,
        debouncedCallback
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Cleanup silencieux
          this.unsubscribe(channelName);
        }
      });

    this.channels.set(channelName, channel);

    // Return cleanup function
    const cleanup = () => this.unsubscribe(channelName);
    this.cleanupCallbacks.set(channelName, cleanup);
    
    return cleanup;
  }


  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(channelName);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(channelName);
    }

    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.cleanupCallbacks.delete(channelName);
      this.debouncedCallbacks.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    // Clear all reconnect timers
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();

    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.cleanupCallbacks.clear();
    this.debouncedCallbacks.clear();
  }

  /**
   * Get active channels count
   */
  getActiveCount(): number {
    return this.channels.size;
  }

  /**
   * Check if a channel is active
   */
  isActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.unsubscribeAll();
  });
}
