import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StripeConnectStatus {
  connected: boolean;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  account_id?: string;
  email?: string | null;
  business_profile_name?: string | null;
}

export function useStripeConnectStatus(driverId: string | undefined) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('stripe-connect-status');
      
      if (fnError) throw fnError;
      
      setStatus(data);
    } catch (err: any) {
      console.error('Error checking Stripe Connect status:', err);
      setError(err.message || 'Erreur lors de la vérification');
      setStatus({
        connected: false,
        status: 'error',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const isReady = status?.charges_enabled && status?.payouts_enabled;
  const isPending = status?.connected && !isReady;
  const isNotConnected = !status?.connected;

  return {
    status,
    loading,
    error,
    isReady,
    isPending,
    isNotConnected,
    refresh: checkStatus,
  };
}
