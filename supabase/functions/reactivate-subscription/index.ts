import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get driver data to find Stripe subscription ID
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, subscription_stripe_id, subscription_cancel_at_period_end")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      // Check if fleet manager
      const { data: fleetManager, error: fmError } = await supabaseClient
        .from("fleet_managers")
        .select("id, subscription_stripe_id, subscription_cancel_at_period_end")
        .eq("user_id", user.id)
        .single();

      if (fmError || !fleetManager) {
        throw new Error("No driver or fleet manager found for this user");
      }

      if (!fleetManager.subscription_stripe_id) {
        throw new Error("No active subscription found");
      }

      // Reactivate fleet manager subscription
      logStep("Reactivating fleet manager subscription", { subscriptionId: fleetManager.subscription_stripe_id });
      
      await stripe.subscriptions.update(fleetManager.subscription_stripe_id, {
        cancel_at_period_end: false,
      });

      // Update database
      await supabaseClient
        .from("fleet_managers")
        .update({
          subscription_cancel_at_period_end: false,
          subscription_cancel_at: null,
        })
        .eq("id", fleetManager.id);

      logStep("Fleet manager subscription reactivated successfully");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!driver.subscription_stripe_id) {
      throw new Error("No active subscription found");
    }

    // Reactivate driver subscription
    logStep("Reactivating driver subscription", { subscriptionId: driver.subscription_stripe_id });
    
    await stripe.subscriptions.update(driver.subscription_stripe_id, {
      cancel_at_period_end: false,
    });

    // Update database
    await supabaseClient
      .from("drivers")
      .update({
        subscription_cancel_at_period_end: false,
        subscription_cancel_at: null,
      })
      .eq("id", driver.id);

    logStep("Driver subscription reactivated successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in reactivate-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
