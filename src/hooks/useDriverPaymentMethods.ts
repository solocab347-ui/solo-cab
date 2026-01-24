import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverPaymentConfig {
  acceptedMethods: string[];
  billingType: 'own_equipment' | 'solocab_stripe';
  showPublicly: boolean;
  defaultMethod: string;
  stripeConnected: boolean;
}

const DEFAULT_CONFIG: DriverPaymentConfig = {
  acceptedMethods: ['cash', 'card', 'transfer'],
  billingType: 'own_equipment',
  showPublicly: true,
  defaultMethod: 'not_specified',
  stripeConnected: false
};

export function useDriverPaymentMethods(driverId: string | undefined) {
  const [config, setConfig] = useState<DriverPaymentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use select('*') and cast to bypass strict typing for new columns
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        const driverData = data as any;
        setConfig({
          acceptedMethods: driverData.accepted_payment_methods || DEFAULT_CONFIG.acceptedMethods,
          billingType: (driverData.billing_type as 'own_equipment' | 'solocab_stripe') || DEFAULT_CONFIG.billingType,
          showPublicly: driverData.show_payment_methods_publicly ?? DEFAULT_CONFIG.showPublicly,
          defaultMethod: driverData.default_payment_method || DEFAULT_CONFIG.defaultMethod,
          stripeConnected: !!driverData.stripe_account_id
        });
      }
    } catch (err: any) {
      console.error('Error fetching driver payment config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Filter methods based on billing type
  const getAvailableMethodsForForm = useCallback(() => {
    const methods = config.acceptedMethods;
    
    // If using SoloCab Stripe, card payments go through Stripe
    if (config.billingType === 'solocab_stripe') {
      return methods.map(m => ({
        value: m,
        isOnline: m === 'card' // Card is processed online via Stripe
      }));
    }
    
    return methods.map(m => ({
      value: m,
      isOnline: false
    }));
  }, [config]);

  return {
    config,
    loading,
    error,
    refresh: fetchConfig,
    getAvailableMethodsForForm,
    isStripeEnabled: config.billingType === 'solocab_stripe' && config.stripeConnected
  };
}
