import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PIONEER-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Pioneer price ID - 9.99€/month with 30-day free trial (nouveau compte Stripe)
const PIONEER_PRICE_ID = "price_1SuwktAdFPYTU471xCl9GBwq";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { driver_id } = await req.json();
    logStep("Request body parsed", { driver_id });

    // Verify driver exists and belongs to user
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("*")
      .eq("id", driver_id)
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found or unauthorized");
    }
    logStep("Driver verified", { driverId: driver.id, isPioneer: driver.is_pioneer });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: driver.display_name || user.email,
        metadata: {
          user_id: user.id,
          driver_id: driver.id,
          is_pioneer: "true",
        },
      });
      customerId = customer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    // Create checkout session with 14-day trial (aligned with standard subscription)
    const origin = req.headers.get("origin") || "https://solocab.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: PIONEER_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 14, // Aligné sur l'abonnement standard: 14 jours d'essai
        metadata: {
          driver_id: driver.id,
          is_pioneer: "true",
        },
      },
      payment_method_collection: "always", // Empreinte bancaire obligatoire
      success_url: `${origin}/driver-welcome?driver_id=${driver.id}&pioneer=true`,
      cancel_url: `${origin}/pioneer-payment?cancelled=true`,
      metadata: {
        driver_id: driver.id,
        is_pioneer: "true",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update driver with Stripe customer ID
    await supabaseClient
      .from("drivers")
      .update({ stripe_customer_id: customerId })
      .eq("id", driver.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-pioneer-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});