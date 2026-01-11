import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
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

    // Get driver data to find Stripe customer ID
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("stripe_customer_id, is_pioneer, subscription_stripe_id")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      logStep("Driver not found, checking fleet manager");
      
      // Check if fleet manager
      const { data: fleetManager, error: fmError } = await supabaseClient
        .from("fleet_managers")
        .select("stripe_customer_id, subscription_stripe_id")
        .eq("user_id", user.id)
        .single();

      if (fmError || !fleetManager?.stripe_customer_id) {
        throw new Error("No Stripe customer found for this user");
      }

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const origin = req.headers.get("origin") || "https://solocab.fr";
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: fleetManager.stripe_customer_id,
        return_url: `${origin}/fleet-dashboard`,
      });
      
      logStep("Fleet manager portal session created", { url: portalSession.url });
      
      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!driver.stripe_customer_id) {
      throw new Error("No Stripe customer ID found for this driver");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://solocab.fr";
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: driver.stripe_customer_id,
      return_url: `${origin}/driver-dashboard?tab=subscription`,
    });
    
    logStep("Driver portal session created", { 
      url: portalSession.url,
      isPioneer: driver.is_pioneer 
    });

    return new Response(JSON.stringify({ 
      url: portalSession.url,
      is_pioneer: driver.is_pioneer 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
