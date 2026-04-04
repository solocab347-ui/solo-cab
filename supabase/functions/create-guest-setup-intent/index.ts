import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GUEST-SETUP-INTENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const publishableKey = Deno.env.get("VITE_STRIPE_PUBLISHABLE_KEY");
    if (!publishableKey) throw new Error("VITE_STRIPE_PUBLISHABLE_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { guest_name, guest_email, guest_phone } = await req.json();

    if (!guest_name?.trim() || !guest_email?.trim() || !guest_phone?.trim()) {
      return new Response(
        JSON.stringify({ error: "Nom, email et téléphone sont obligatoires" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Creating guest setup intent", { email: guest_email });

    // Find or create Stripe customer for this guest
    const existingCustomers = await stripe.customers.list({
      email: guest_email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: guest_email,
        name: guest_name,
        phone: guest_phone,
        metadata: {
          platform: "solocab",
          source: "guest-booking",
        },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
      metadata: {
        platform: "solocab",
        source: "guest-booking",
        guest_name,
        guest_email,
        guest_phone,
      },
    });

    logStep("SetupIntent created", { setupIntentId: setupIntent.id });

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
        customer_id: customerId,
        publishable_key: publishableKey,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
