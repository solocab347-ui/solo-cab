import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PremiumStatus {
  isPremium: boolean;
  plan: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  openCheckout: (plan?: "monthly" | "yearly") => Promise<void>;
  openPortal: () => Promise<void>;
}

const PremiumContext = createContext<PremiumStatus>({
  isPremium: false,
  plan: null,
  subscriptionEnd: null,
  loading: true,
  refresh: async () => {},
  openCheckout: async () => {},
  openPortal: async () => {},
});

export function usePremium() {
  return useContext(PremiumContext);
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsPremium(false);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("check-premium-subscription");
      if (error) throw error;

      setIsPremium(data?.subscribed || false);
      setPlan(data?.plan || null);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error("Error checking premium:", err);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Check every 5 minutes, not every minute
    const interval = setInterval(checkSubscription, 300000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  // Listen to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Only re-check on actual sign-in, not on every token refresh
      if (event === "SIGNED_IN") {
        checkSubscription();
      }
    });
    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  const openCheckout = useCallback(async (selectedPlan: "monthly" | "yearly" = "monthly") => {
    try {
      const { data, error } = await supabase.functions.invoke("create-premium-checkout", {
        body: { plan: selectedPlan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      throw err;
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("premium-customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      throw err;
    }
  }, []);

  return (
    <PremiumContext.Provider value={{
      isPremium,
      plan,
      subscriptionEnd,
      loading,
      refresh: checkSubscription,
      openCheckout,
      openPortal,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}
