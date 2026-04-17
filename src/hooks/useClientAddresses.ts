import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  address_type: 'home' | 'work' | 'other';
  position: number;
}

export interface RecentAddress {
  address: string;
  latitude: number | null;
  longitude: number | null;
  last_used: string;
  used_as: 'pickup' | 'destination';
}

export interface FrequentAddress {
  address: string;
  latitude: number | null;
  longitude: number | null;
  usage_count: number;
  last_used: string;
}

/**
 * Loads saved (favorite) addresses + recent ones (last 5 used) for the current client.
 * Used by the unified booking page to pre-fill / suggest addresses.
 */
export function useClientAddresses() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [recent, setRecent] = useState<RecentAddress[]>([]);
  const [frequent, setFrequent] = useState<FrequentAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setSaved([]);
      setRecent([]);
      setFrequent([]);
      setClientId(null);
      return;
    }
    setLoading(true);
    try {
      const { data: c } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const cid = c?.id || null;
      setClientId(cid);

      const [savedRes, recentRes, freqRes] = await Promise.all([
        cid
          ? supabase
              .from('client_saved_addresses')
              .select('*')
              .eq('client_id', cid)
              .order('position', { ascending: true })
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        supabase.rpc('get_client_recent_addresses' as any, { _limit: 5 }),
        supabase.rpc('get_client_frequent_addresses' as any, { _min_count: 3, _limit: 5 }),
      ]);

      setSaved((savedRes.data || []) as SavedAddress[]);
      setRecent((recentRes.data || []) as RecentAddress[]);
      setFrequent((freqRes.data || []) as FrequentAddress[]);
    } catch (err) {
      console.error('useClientAddresses error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSaved = useCallback(
    async (input: Omit<SavedAddress, 'id' | 'position'> & { position?: number }) => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('client_saved_addresses')
        .insert({
          client_id: clientId,
          label: input.label,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          address_type: input.address_type || 'other',
          position: input.position ?? saved.length,
        })
        .select('*')
        .single();
      if (error) throw error;
      await reload();
      return data as SavedAddress;
    },
    [clientId, saved.length, reload]
  );

  const removeSaved = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('client_saved_addresses').delete().eq('id', id);
      if (error) throw error;
      await reload();
    },
    [reload]
  );

  const updateSaved = useCallback(
    async (id: string, patch: Partial<Omit<SavedAddress, 'id'>>) => {
      const { error } = await supabase.from('client_saved_addresses').update(patch).eq('id', id);
      if (error) throw error;
      await reload();
    },
    [reload]
  );

  /**
   * Reorder saved addresses. Provide the full list in the desired order;
   * each item's `position` is updated accordingly.
   */
  const reorderSaved = useCallback(
    async (orderedIds: string[]) => {
      if (!clientId || orderedIds.length === 0) return;
      // Optimistic local update
      setSaved((prev) => {
        const map = new Map(prev.map((a) => [a.id, a]));
        return orderedIds
          .map((id, idx) => {
            const a = map.get(id);
            return a ? { ...a, position: idx } : null;
          })
          .filter(Boolean) as SavedAddress[];
      });
      // Persist sequentially (small list, simpler than RPC)
      const updates = orderedIds.map((id, idx) =>
        supabase.from('client_saved_addresses').update({ position: idx }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        await reload();
        throw firstError;
      }
    },
    [clientId, reload]
  );

  return {
    saved,
    recent,
    frequent,
    loading,
    clientId,
    reload,
    addSaved,
    removeSaved,
    updateSaved,
    reorderSaved,
  };
}
