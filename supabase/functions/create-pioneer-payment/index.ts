import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// MODE TEST DÉSACTIVÉ - Prix réels
const TEST_MODE_ENABLED = false;
const TEST_PRICE_CENTS = 50; // Non utilisé quand TEST_MODE_ENABLED = false

// Prix Stripe - Abonnements (nouveau compte Stripe)
const SUBSCRIPTION_MONTHLY_PRICE_ID = "price_1SuwktAdFPYTU471xCl9GBwq"; // 9.99€/mois
const SUBSCRIPTION_ANNUAL_PRICE_ID = "price_1SuwlwAdFPYTU471eTkINbYb"; // 101.90€/an

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PIONEER-PAYMENT] ${step}${detailsStr}`);
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

    // Get driver record and verify pioneer status
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, is_pioneer, created_at, subscription_paid, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    if (!driver.is_pioneer) {
      throw new Error("This account is not a pioneer account");
    }

    // Check if already subscribed
    if (driver.subscription_paid && driver.stripe_customer_id) {
      throw new Error("This account already has an active subscription");
    }

    // Check pioneer trial period (30 days from creation)
    const createdAt = new Date(driver.created_at);
    const trialEndDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    logStep("Pioneer trial check", { 
      driverId: driver.id, 
      createdAt: createdAt.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      daysRemaining 
    });

    // Parse request body for plan selection
    const { plan = "monthly" } = await req.json().catch(() => ({}));
    
    // Determine price - use test price or real price
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    
    if (TEST_MODE_ENABLED) {
      // Mode test: prix forcé à 0.50€
      lineItems = [
        {
          price_data: {
            currency: "eur",
            unit_amount: TEST_PRICE_CENTS, // 0.50€
            recurring: {
              interval: plan === "annual" ? "year" : "month",
            },
            product_data: {
              name: plan === "annual" 
                ? "Abonnement SoloCab Annuel - Pionnier (TEST)" 
                : "Abonnement SoloCab Mensuel - Pionnier (TEST)",
            },
          },
          quantity: 1,
        },
      ];
      logStep("TEST MODE: Using test price", { amount: TEST_PRICE_CENTS });
    } else {
      const priceId = plan === "annual" ? SUBSCRIPTION_ANNUAL_PRICE_ID : SUBSCRIPTION_MONTHLY_PRICE_ID;
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "https://solocab.fr";

    // Create checkout session WITHOUT trial (immediate payment for pioneers after 30 days)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: lineItems,
      mode: "subscription",
      // NO trial_period_days - pioneers already had their 30 days free
      subscription_data: {
        metadata: {
          driver_id: driver.id,
          user_id: userId,
          type: "pioneer_subscription",
          is_pioneer: "true",
        },
      },
      metadata: {
        driver_id: driver.id,
        user_id: userId,
        type: "pioneer_subscription",
        is_pioneer: "true",
        subscription_type: plan,
      },
      success_url: `${origin}/driver-dashboard?payment=success&pioneer=true`,
      cancel_url: `${origin}/pioneer-payment?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      payment_method_collection: "always",
    });

    logStep("Checkout session created for pioneer", { 
      sessionId: session.id, 
      driverId: driver.id,
      plan,
      daysRemaining
    });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        daysRemaining,
        trialEndDate: trialEndDate.toISOString(),
      }),
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
