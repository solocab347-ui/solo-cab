/**
 * Lazy Realtime channel helper.
 *
 * Subscribes only when the tab is visible. When the tab is hidden,
 * the channel is unsubscribed to free server resources and reduce
 * Realtime concurrency cost.
 *
 * On visibility change → re-subscribes automatically and triggers
 * an optional onResume callback so callers can run a fresh fetch
 * to catch up on missed events.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LazyChannelOptions {
  /** Unique channel name (e.g. `course-updates-${id}`). */
  name: string;
  /** Build the channel — add `.on(...)` listeners then return it. NOTE: do NOT call `.subscribe()`. */
  setup: (channel: RealtimeChannel) => RealtimeChannel;
  /** Called when the tab becomes visible again — perfect for a refetch. */
  onResume?: () => void;
}

export interface LazyChannelHandle {
  /** Stops the channel and removes all listeners. */
  cleanup: () => void;
}

export function createLazyChannel({ name, setup, onResume }: LazyChannelOptions): LazyChannelHandle {
  let channel: RealtimeChannel | null = null;
  let isActive = false;

  const subscribe = () => {
    if (isActive) return;
    isActive = true;
    channel = setup(supabase.channel(name));
    channel.subscribe();
  };

  const unsubscribe = () => {
    if (!channel) return;
    supabase.removeChannel(channel);
    channel = null;
    isActive = false;
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      subscribe();
      onResume?.();
    } else {
      unsubscribe();
    }
  };

  // Initial state
  if (document.visibilityState === 'visible') {
    subscribe();
  }
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    cleanup: () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
    },
  };
}
