import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Gestionnaire centralisé des subscriptions Supabase
 * Évite les fuites mémoire et les subscriptions multiples
 */

class SubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private cleanupCallbacks: Map<string, () => void> = new Map();

  /**
   * Subscribe to changes with automatic cleanup
   */
  subscribe(
    channelName: string,
    config: {
      table: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      filter?: string;
    },
    callback: (payload: any) => void
  ): () => void {
    // Unsubscribe existing channel if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter
        } as any,
        callback
      )
      .subscribe();

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
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.cleanupCallbacks.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.cleanupCallbacks.clear();
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
