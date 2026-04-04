import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverStripeStatus {
  hasStripeConnect: boolean;
  isLoading: boolean;
  stripeAccountId: string | null;
}

/**
 * Centralized hook for detecting if a driver has Stripe Connect enabled.
 * Replaces 9+ duplicated queries across the codebase.
 * 
 * Usage:
 *   const { hasStripeConnect, isLoading } = useDriverStripeStatus(driverId);
 */
export function useDriverStripeStatus(driverId: string | null | undefined): DriverStripeStatus {
  const [status, setStatus] = useState<DriverStripeStatus>({
    hasStripeConnect: false,
    isLoading: !!driverId,
    stripeAccountId: null,
  });

  useEffect(() => {
    if (!driverId) {
      setStatus({ hasStripeConnect: false, isLoading: false, stripeAccountId: null });
      return;
    }

    let cancelled = false;

    const check = async () => {
      setStatus(prev => ({ ...prev, isLoading: true }));

      const { data } = await supabase
        .from("drivers")
        .select("stripe_connect_account_id, stripe_connect_charges_enabled")
        .eq("id", driverId)
        .single();

      if (cancelled) return;

      const hasStripe = !!data?.stripe_connect_account_id && data?.stripe_connect_charges_enabled === true;

      setStatus({
        hasStripeConnect: hasStripe,
        isLoading: false,
        stripeAccountId: data?.stripe_connect_account_id || null,
      });
    };

    check();
    return () => { cancelled = true; };
  }, [driverId]);

  return status;
}

/**
 * Non-hook utility for one-time Stripe status check (in async flows).
 */
export async function checkDriverStripeStatus(driverId: string): Promise<boolean> {
  const { data } = await supabase
    .from("drivers")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", driverId)
    .single();

  return !!data?.stripe_connect_account_id && data?.stripe_connect_charges_enabled === true;
}
