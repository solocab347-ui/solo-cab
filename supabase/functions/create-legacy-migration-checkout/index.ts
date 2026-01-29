import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LEGACY-MIGRATION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId, email: userEmail });

    // Get driver record and verify legacy status
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, is_legacy_stripe, migration_required, migrated_at")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    if (!driver.is_legacy_stripe || !driver.migration_required) {
      throw new Error("This account is not eligible for legacy migration");
    }

    if (driver.migrated_at) {
      throw new Error("This account has already been migrated");
    }

    logStep("Driver verified for migration", { driverId: driver.id });

    // Parse request body for plan selection
    const { plan = "monthly" } = await req.json().catch(() => ({}));
    
    // Price IDs - these will be configured when new Stripe account is set up
    const priceId = plan === "annual" 
      ? Deno.env.get("STRIPE_ANNUAL_PRICE_ID") 
      : Deno.env.get("STRIPE_MONTHLY_PRICE_ID");

    if (!priceId) {
      throw new Error("Stripe price not configured. Please contact support.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists in new Stripe account
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer in new Stripe", { customerId });
      }
    }

    // Create checkout session WITHOUT trial (immediate payment)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      // NO trial_period_days - immediate payment
      subscription_data: {
        metadata: {
          driver_id: driver.id,
          is_legacy_migration: "true",
        },
      },
      metadata: {
        driver_id: driver.id,
        is_legacy_migration: "true",
      },
      success_url: `${req.headers.get("origin")}/chauffeur/migration-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/chauffeur/migration`,
      allow_promotion_codes: true,
    });

    logStep("Checkout session created for legacy migration", { 
      sessionId: session.id, 
      driverId: driver.id,
      plan 
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
