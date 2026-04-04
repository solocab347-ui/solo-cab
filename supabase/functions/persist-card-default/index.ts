import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PERSIST-CARD-DEFAULT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    const body = await req.json();
    const { setup_intent_id } = body;

    if (!setup_intent_id || typeof setup_intent_id !== "string") {
      throw new Error("setup_intent_id required");
    }

    logStep("Persisting card from SetupIntent", { userId: user.id, setupIntentId: setup_intent_id });

    // Get client record
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, stripe_customer_id, default_payment_method_id")
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) throw new Error("Client record not found");

    // Retrieve the SetupIntent to get the payment_method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);

    if (setupIntent.status !== "succeeded") {
      throw new Error(`SetupIntent not succeeded: ${setupIntent.status}`);
    }

    const paymentMethodId = typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;

    if (!paymentMethodId) {
      throw new Error("No payment method found on SetupIntent");
    }

    logStep("Payment method found", { paymentMethodId });

    // Always set as default if no default exists yet
    const shouldSetDefault = !client.default_payment_method_id;

    const updateData: Record<string, unknown> = {};

    if (shouldSetDefault) {
      updateData.default_payment_method_id = paymentMethodId;
      logStep("Setting as default payment method (first card)");
    }

    if (Object.keys(updateData).length > 0) {
      await supabaseClient
        .from("clients")
        .update(updateData)
        .eq("id", client.id);
    }

    // Also set this as the default payment method on the Stripe Customer
    if (shouldSetDefault && client.stripe_customer_id) {
      try {
        await stripe.customers.update(client.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
        logStep("Updated Stripe Customer default payment method");
      } catch (stripeErr) {
        logStep("Warning: could not update Stripe Customer default", { error: String(stripeErr) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_method_id: paymentMethodId,
        set_as_default: shouldSetDefault,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
