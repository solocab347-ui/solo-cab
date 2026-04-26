import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ObjectiveSnapshot {
  id: string;
  driver_id: string;
  snapshot_year: number;
  snapshot_month: number;
  cards_proposed_target: number;
  qr_scans_target: number;
  direct_clients_target: number;
  independence_percentage_target: number;
  revenue_target: number;
  change_reason: string | null;
  created_at: string;
}

export interface AcquisitionMetrics {
  loyalClientsCount: number;
  snapshots: ObjectiveSnapshot[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Récupère :
 *  - Le NOMBRE EXACT de clients fidèles (≥ 2 courses completed)
 *  - L'historique des snapshots de cibles (driver_objectives_snapshots)
 *
 * Remplace l'ancienne estimation `Math.floor(totalClients * 0.3)`.
 */
export function useDriverAcquisitionMetrics(driverId: string | undefined): AcquisitionMetrics {
  const [loyalClientsCount, setLoyalClientsCount] = useState(0);
  const [snapshots, setSnapshots] = useState<ObjectiveSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [loyalRes, snapsRes] = await Promise.all([
        supabase.rpc('get_driver_loyal_clients_count', { p_driver_id: driverId }),
        supabase
          .from('driver_objectives_snapshots')
          .select('*')
          .eq('driver_id', driverId)
          .order('snapshot_year', { ascending: false })
          .order('snapshot_month', { ascending: false })
          .limit(24),
      ]);

      if (loyalRes.error) {
        console.warn('[acquisition-metrics] loyal clients RPC failed:', loyalRes.error);
        setLoyalClientsCount(0);
      } else {
        setLoyalClientsCount(Number(loyalRes.data) || 0);
      }

      if (snapsRes.error) {
        console.warn('[acquisition-metrics] snapshots fetch failed:', snapsRes.error);
        setSnapshots([]);
      } else {
        setSnapshots((snapsRes.data || []) as ObjectiveSnapshot[]);
      }
    } catch (e) {
      console.error('[acquisition-metrics] error:', e);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    loyalClientsCount,
    snapshots,
    loading,
    refetch: fetchAll,
  };
}
