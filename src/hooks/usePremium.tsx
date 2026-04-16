import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { shouldHideInAppPayments } from "@/lib/platform";

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

  const clearPremiumState = useCallback(() => {
    setIsPremium(false);
    setPlan(null);
    setSubscriptionEnd(null);
  }, []);

  const checkSubscription = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        clearPremiumState();
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        console.warn("Skipping premium check because the auth session is invalid:", userError?.message);
        clearPremiumState();

        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // Ignore cleanup failures here - the goal is only to stop the stale session loop.
        }

        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-premium-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          clearPremiumState();
          return;
        }

        throw new Error(data?.error || "Unable to check premium subscription");
      }

      setIsPremium(data?.subscribed || false);
      setPlan(data?.plan || null);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error("Error checking premium:", err);
      clearPremiumState();
    } finally {
      setLoading(false);
    }
  }, [clearPremiumState]);

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
    // App Store / Play Store compliance: bloque tout paiement in-app.
    if (shouldHideInAppPayments()) {
      console.warn("[Premium] Checkout bloqué : indisponible dans l'app mobile.");
      throw new Error("Unavailable in mobile app");
    }
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
