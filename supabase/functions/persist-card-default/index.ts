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

    const body = await req.json();
    const { setup_intent_id } = body;

    if (!setup_intent_id || typeof setup_intent_id !== "string") {
      throw new Error("setup_intent_id required");
    }

    // Try to authenticate user (optional - guests won't have a valid token)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: userData } = await supabaseClient.auth.getUser(token);
        if (userData?.user) {
          userId = userData.user.id;
        }
      } catch {
        // Guest flow - no valid user token, that's fine
      }
    }

    logStep("Persisting card from SetupIntent", { setupIntentId: setup_intent_id, userId: userId || "guest" });

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

    const customerId = typeof setupIntent.customer === "string"
      ? setupIntent.customer
      : setupIntent.customer?.id;

    logStep("Payment method found", { paymentMethodId, customerId });

    // If we have an authenticated user, update their client record
    if (userId) {
      const { data: client } = await supabaseClient
        .from("clients")
        .select("id, default_payment_method_id, stripe_customer_id")
        .eq("user_id", userId)
        .single();

      if (client) {
        const shouldSetDefault = !client.default_payment_method_id;
        if (shouldSetDefault) {
          await supabaseClient
            .from("clients")
            .update({ default_payment_method_id: paymentMethodId })
            .eq("id", client.id);
          logStep("Set as default payment method for authenticated user");
        }

        // Also set on Stripe Customer
        if (shouldSetDefault && client.stripe_customer_id) {
          try {
            await stripe.customers.update(client.stripe_customer_id, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          } catch (e) {
            logStep("Warning: could not update Stripe default", { error: String(e) });
          }
        }
      }
    } else if (customerId) {
      // Guest flow: set default on Stripe Customer directly
      try {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
        logStep("Set default payment method on Stripe Customer (guest)");
      } catch (e) {
        logStep("Warning: could not update Stripe default for guest", { error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_method_id: paymentMethodId,
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
