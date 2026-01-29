import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body for action type
  let action: string | null = null;
  try {
    const body = await req.json();
    action = body?.action || null;
  } catch {
    // No body or invalid JSON, that's fine
  }

  try {
    logStep("Function started", { action });

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
    const origin = req.headers.get("origin") || "https://solocab.fr";

    // Get driver data to find Stripe customer ID
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("stripe_customer_id, is_pioneer, subscription_stripe_id")
      .eq("user_id", user.id)
      .single();

    let stripeCustomerId: string | null = null;
    let returnUrl = `${origin}/driver-dashboard?tab=subscription`;
    let isPioneer = false;

    if (!driverError && driver?.stripe_customer_id) {
      stripeCustomerId = driver.stripe_customer_id;
      isPioneer = driver.is_pioneer || false;
      logStep("Found driver Stripe customer", { customerId: stripeCustomerId, isPioneer });
    } else {
      // Check if fleet manager
      const { data: fleetManager, error: fmError } = await supabaseClient
        .from("fleet_managers")
        .select("stripe_customer_id, subscription_stripe_id")
        .eq("user_id", user.id)
        .single();

      if (!fmError && fleetManager?.stripe_customer_id) {
        stripeCustomerId = fleetManager.stripe_customer_id;
        returnUrl = `${origin}/fleet-dashboard`;
        logStep("Found fleet manager Stripe customer", { customerId: stripeCustomerId });
      }
    }

    if (!stripeCustomerId) {
      throw new Error("No Stripe customer found for this user");
    }

    // Build portal session config based on action
    const portalConfig: Stripe.BillingPortal.SessionCreateParams = {
      customer: stripeCustomerId,
      return_url: returnUrl,
    };

    // Add flow_data for specific actions
    // Stripe Billing Portal supports: payment_method_update, subscription_cancel, subscription_update
    if (action === "payment_method") {
      portalConfig.flow_data = {
        type: "payment_method_update",
      };
      logStep("Adding payment_method_update flow");
    } else if (action === "cancel") {
      // For cancellation, we need the subscription ID
      if (driver?.subscription_stripe_id) {
        portalConfig.flow_data = {
          type: "subscription_cancel",
          subscription_cancel: {
            subscription: driver.subscription_stripe_id,
          },
        };
        logStep("Adding subscription_cancel flow", { subscriptionId: driver.subscription_stripe_id });
      } else {
        // If no subscription ID stored, just open the portal without flow_data
        // User will see all their subscriptions
        logStep("No subscription ID found, opening general portal for cancel");
      }
    }
    // For "invoices" action, we don't add flow_data - user will see the general portal with invoices section

    const portalSession = await stripe.billingPortal.sessions.create(portalConfig);
    
    logStep("Portal session created", { 
      url: portalSession.url,
      action,
      isPioneer
    });

    return new Response(JSON.stringify({ 
      url: portalSession.url,
      is_pioneer: isPioneer 
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
