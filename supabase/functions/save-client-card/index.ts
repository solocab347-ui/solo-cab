import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-CLIENT-CARD] ${step}${detailsStr}`);
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get client record
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("id, stripe_customer_id, saved_cards")
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      throw new Error("Client record not found");
    }

    // Get or create Stripe Customer
    let stripeCustomerId = client.stripe_customer_id;

    if (!stripeCustomerId) {
      // Check if customer exists by email
      const existingCustomers = await stripe.customers.list({
        email: user.email!,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        // Get profile for name
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();

        const newCustomer = await stripe.customers.create({
          email: user.email!,
          name: profile?.full_name || undefined,
          phone: profile?.phone || undefined,
          metadata: {
            platform: "solocab",
            client_id: client.id,
            user_id: user.id,
          },
        });
        stripeCustomerId = newCustomer.id;
        logStep("New Stripe Customer created", { customerId: stripeCustomerId });
      }

      // Save customer ID
      await supabaseClient
        .from("clients")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", client.id);
    }

    logStep("Stripe Customer ready", { customerId: stripeCustomerId });

    // Create SetupIntent for saving card
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session", // CRITICAL: allows future off-session charges
      metadata: {
        client_id: client.id,
        user_id: user.id,
        platform: "solocab",
      },
    });

    logStep("SetupIntent created", { setupIntentId: setupIntent.id });

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
        customer_id: stripeCustomerId,
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
