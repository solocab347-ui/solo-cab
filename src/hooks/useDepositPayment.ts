import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DepositPaymentResult {
  success: boolean;
  checkout_url?: string;
  session_id?: string;
  deposit_amount?: number;
  deposit_percentage?: number;
  remaining_amount?: number;
  total_amount?: number;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refunded?: boolean;
  status?: string;
  refund_id?: string;
  amount?: number;
  message?: string;
  error?: string;
}

export function useDepositPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create deposit payment for a course
  const createDepositPayment = useCallback(async (
    courseId: string,
    devisId?: string,
    clientEmail?: string,
    clientName?: string
  ): Promise<DepositPaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-deposit-payment', {
        body: {
          course_id: courseId,
          devis_id: devisId,
          client_email: clientEmail,
          client_name: clientName,
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      return data as DepositPaymentResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création du paiement';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create final payment after deposit
  const createFinalPayment = useCallback(async (
    courseId: string,
    clientEmail?: string
  ): Promise<DepositPaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('capture-final-payment', {
        body: {
          course_id: courseId,
          client_email: clientEmail,
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      return data as DepositPaymentResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création du paiement final';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Refund or forfeit deposit on cancellation
  const handleCancellation = useCallback(async (
    courseId: string,
    cancellationBy: 'driver' | 'client' | 'system',
    reason?: string
  ): Promise<RefundResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('refund-deposit', {
        body: {
          course_id: courseId,
          cancellation_by: cancellationBy,
          reason,
        }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.refunded) {
        toast.success('Acompte remboursé au client');
      } else {
        toast.info('Acompte conservé (client annulé)');
      }

      return data as RefundResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du traitement de l\'annulation';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if a course requires deposit payment
  const checkDepositRequired = useCallback(async (
    driverId: string,
    clientId?: string
  ): Promise<{ required: boolean; percentage: number }> => {
    try {
      // Get driver deposit settings
      const { data: driver } = await supabase
        .from('drivers')
        .select('deposit_enabled, deposit_percentage, deposit_required_for, billing_type, stripe_connect_charges_enabled')
        .eq('id', driverId)
        .single();

      if (!driver) {
        return { required: false, percentage: 0 };
      }

      const driverData = driver as any;

      // Check if deposit is possible
      if (!driverData.deposit_enabled || 
          driverData.billing_type !== 'solocab_stripe' || 
          !driverData.stripe_connect_charges_enabled) {
        return { required: false, percentage: 0 };
      }

      const requiredFor = driverData.deposit_required_for || 'none';

      if (requiredFor === 'none') {
        return { required: false, percentage: 0 };
      }

      if (requiredFor === 'all') {
        return { required: true, percentage: driverData.deposit_percentage || 20 };
      }

      // Check if client is new
      if (requiredFor === 'new_clients' && clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('total_rides')
          .eq('id', clientId)
          .single();

        const isNewClient = !client || (client.total_rides || 0) === 0;
        return { 
          required: isNewClient, 
          percentage: driverData.deposit_percentage || 20 
        };
      }

      // Default: require for new clients if no client ID
      if (requiredFor === 'new_clients' && !clientId) {
        return { required: true, percentage: driverData.deposit_percentage || 20 };
      }

      return { required: false, percentage: 0 };
    } catch (err) {
      console.error('Error checking deposit requirement:', err);
      return { required: false, percentage: 0 };
    }
  }, []);

  return {
    loading,
    error,
    createDepositPayment,
    createFinalPayment,
    handleCancellation,
    checkDepositRequired,
  };
}
