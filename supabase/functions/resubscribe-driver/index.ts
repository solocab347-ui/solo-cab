import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESUBSCRIBE-DRIVER] ${step}${detailsStr}`);
};

// Prix Stripe pour chauffeurs (sans essai - paiement immédiat)
const PRICE_IDS = {
  monthly: "price_1RUXi6AaegvT9LpCsNpJBNnz",
  annual: "price_1RUXG3AaegvT9LpC3c5PzDaY",
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for subscription type
    let subscriptionType = "monthly";
    try {
      const body = await req.json();
      subscriptionType = body?.subscription_type || "monthly";
    } catch {
      // Default to monthly
    }

    const priceId = subscriptionType === "annual" ? PRICE_IDS.annual : PRICE_IDS.monthly;
    logStep("Subscription type selected", { subscriptionType, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get driver data
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, stripe_customer_id, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      throw new Error("No driver found for this user");
    }

    // Check if already has active subscription
    if (driver.subscription_status === "active") {
      throw new Error("Vous avez déjà un abonnement actif");
    }

    logStep("Driver found", { driverId: driver.id, hasCustomerId: !!driver.stripe_customer_id });

    const origin = req.headers.get("origin") || "https://solocab.fr";

    // Create checkout session - reuse existing customer ID if available
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/driver-dashboard?tab=subscription&resubscribed=true`,
      cancel_url: `${origin}/driver-dashboard?tab=subscription&cancelled=true`,
      metadata: {
        driver_id: driver.id,
        type: "driver_subscription",
        subscription_type: subscriptionType,
        is_resubscription: "true",
      },
      subscription_data: {
        metadata: {
          driver_id: driver.id,
          type: "driver_subscription",
          subscription_type: subscriptionType,
          is_resubscription: "true",
        },
        // NO trial for resubscription - immediate payment
      },
      allow_promotion_codes: true,
    };

    // Use existing customer or create new one
    if (driver.stripe_customer_id) {
      sessionConfig.customer = driver.stripe_customer_id;
    } else {
      sessionConfig.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created for resubscription", { 
      sessionId: session.id, 
      url: session.url,
      subscriptionType,
      isResubscription: true 
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in resubscribe-driver", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
