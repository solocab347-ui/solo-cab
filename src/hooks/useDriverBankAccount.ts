/**
 * Hook React Query pour la gestion du RIB du chauffeur.
 * - Statut Stripe (RIB actuel, payouts_enabled, rate-limit)
 * - Mise à jour via bank_token (Stripe Elements)
 * - Génération d'un Account Link en fallback
 * - Liste des virements échoués
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BankAccountStatus {
  has_bank_account: boolean;
  bank_account: null | {
    id: string;
    last4: string;
    bank_name: string | null;
    country: string;
    currency: string;
    status: string;
    fingerprint: string;
  };
  payouts_enabled: boolean;
  charges_enabled: boolean;
  rate_limit: {
    allowed: boolean;
    recent_changes: number;
    remaining?: number;
    reason?: string;
    message?: string;
    next_allowed_at?: string;
  };
  updated_at: string | null;
}

export function useDriverBankAccount(driverId: string | undefined) {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['driver-bank-account', driverId],
    queryFn: async (): Promise<BankAccountStatus> => {
      const { data, error } = await supabase.functions.invoke('update-driver-bank-account', {
        body: { action: 'get_status' },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
    staleTime: 30_000,
  });

  const failedTransfers = useQuery({
    queryKey: ['driver-failed-transfers', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from('failed_transfers')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['pending_retry', 'awaiting_rib_update', 'retrying', 'awaiting_admin_review'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!driverId,
    staleTime: 30_000,
  });

  const updateWithToken = useMutation({
    mutationFn: async (bank_token: string) => {
      const { data, error } = await supabase.functions.invoke('update-driver-bank-account', {
        body: { action: 'update_with_token', bank_token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('RIB mis à jour avec succès');
      qc.invalidateQueries({ queryKey: ['driver-bank-account', driverId] });
      qc.invalidateQueries({ queryKey: ['driver-failed-transfers', driverId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour du RIB');
    },
  });

  const createAccountLink = useMutation({
    mutationFn: async () => {
      const baseUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('update-driver-bank-account', {
        body: {
          action: 'create_account_link',
          return_url: `${baseUrl}/driver?tab=finances&rib_updated=1`,
          refresh_url: `${baseUrl}/driver?tab=finances&rib_refresh=1`,
        },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.message || 'Impossible de générer le lien Stripe');
    },
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    failedTransfers: failedTransfers.data ?? [],
    failedTransfersLoading: failedTransfers.isLoading,
    updateWithToken: updateWithToken.mutateAsync,
    isUpdating: updateWithToken.isPending,
    createAccountLink: createAccountLink.mutate,
    isCreatingLink: createAccountLink.isPending,
    refresh: () => {
      qc.invalidateQueries({ queryKey: ['driver-bank-account', driverId] });
      qc.invalidateQueries({ queryKey: ['driver-failed-transfers', driverId] });
    },
  };
}
