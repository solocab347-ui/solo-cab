import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-DRIVER-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Premium product IDs (new products)
const PREMIUM_PRODUCT_IDS = [
  "prod_UIyvxaQ5c7vZSH", // SoloCab Premium - Mensuel (19.99€/mois)
  "prod_UIyvQp5D4JWxP5", // SoloCab Premium - Annuel (191.90€/an)
  "prod_UCdaZkBtD9tnjV", // Legacy SoloCab Premium
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get driver info
    const { data: driver } = await supabaseClient
      .from("drivers")
      .select("id, free_access_granted, free_access_end_date, free_access_type, is_pioneer, created_at, subscription_paid, subscription_status, subscription_tier")
      .eq("user_id", user.id)
      .single();

    if (!driver) {
      logStep("No driver found");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: "inactive",
        subscription_tier: "free",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Driver data retrieved", { driverId: driver.id });

    const now = new Date();

    // ========================================
    // MODÈLE FREEMIUM:
    // Tous les chauffeurs ont un accès gratuit de base.
    // Le premium (19,99€/mois) débloque des fonctionnalités avancées.
    // ========================================

    // Only permanent administrative access can unlock premium without payment
    if (driver.free_access_granted) {
      const isPermanent = driver.free_access_type === "unlimited" || driver.free_access_type === "administrative";
      const endDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
      const isValid = isPermanent || !endDate || endDate > now;

      if (isPermanent && isValid) {
        logStep("Admin free access = premium tier", { type: driver.free_access_type });
        await supabaseClient
          .from("drivers")
          .update({ subscription_tier: "premium", subscription_status: "active", subscription_paid: true })
          .eq("id", driver.id);

        return new Response(JSON.stringify({
          subscribed: true,
          subscription_status: "active",
          subscription_tier: "premium",
          is_free_access: true,
          is_permanent: isPermanent,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (!isPermanent && isValid) {
        logStep("Temporary free access detected → keep freemium tier", { type: driver.free_access_type });
      } else if (!isPermanent) {
        logStep("Temporary free access expired → free tier");
        await supabaseClient
          .from("drivers")
          .update({
            subscription_tier: "free",
            subscription_status: "inactive",
            subscription_paid: false,
          })
          .eq("id", driver.id);
      } else {
        // Expired permanent admin access → revoke to free tier
        logStep("Admin free access expired → free tier");
        await supabaseClient
          .from("drivers")
          .update({
            free_access_granted: false,
            free_access_end_date: null,
            free_access_start_date: null,
            free_access_type: null,
            subscription_tier: "free",
            subscription_status: "inactive",
            subscription_paid: false,
          })
          .eq("id", driver.id);
      }
    }

    // Check Stripe for premium subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer → free tier");
      await supabaseClient
        .from("drivers")
        .update({ subscription_tier: "free", subscription_status: "inactive", subscription_paid: false })
        .eq("id", driver.id);

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: "inactive",
        subscription_tier: "free",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active paid subscription only
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    const validSubscription = subscriptions.data.find(
      (sub: { status: string }) => sub.status === "active"
    );

    if (validSubscription) {
      const subscriptionEnd = new Date(validSubscription.current_period_end * 1000).toISOString();
      const productId = validSubscription.items.data[0]?.price?.product;
      
      // Determine tier: if it's the premium product → premium, else still mark as premium (any active sub = premium)
      const tier = "premium";
      
      logStep("Active subscription found → premium", { 
        subscriptionId: validSubscription.id, 
        productId, 
        endDate: subscriptionEnd 
      });

      await supabaseClient
        .from("drivers")
        .update({
          subscription_tier: tier,
          subscription_status: "active",
          subscription_stripe_id: validSubscription.id,
          subscription_end_date: subscriptionEnd,
          subscription_paid: true,
        })
        .eq("id", driver.id);

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_status: "active",
        subscription_tier: tier,
        subscription_end: subscriptionEnd,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No active subscription → free tier
    logStep("No active subscription → free tier");
    await supabaseClient
      .from("drivers")
      .update({
        subscription_tier: "free",
        subscription_status: "inactive",
        subscription_paid: false,
      })
      .eq("id", driver.id);

    return new Response(JSON.stringify({
      subscribed: false,
      subscription_status: "inactive",
      subscription_tier: "free",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
