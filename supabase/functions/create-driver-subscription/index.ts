import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-DRIVER-SUBSCRIPTION] Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    console.log("[CREATE-DRIVER-SUBSCRIPTION] User authenticated:", user.email);

    // Get driver_id from request body
    const { driver_id } = await req.json();
    if (!driver_id) throw new Error("driver_id is required");
    console.log("[CREATE-DRIVER-SUBSCRIPTION] Driver ID:", driver_id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] Existing customer:", customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          driver_id: driver_id,
        },
      });
      customerId = customer.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] Created new customer:", customerId);
    }

    // Create checkout session for one-time payment of 49.99€
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: 4999, // 49.99€
            product_data: {
              name: "Abonnement SoloCab - Chauffeur VTC",
              description: "Inscription et abonnement mensuel à la plateforme SoloCab",
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/registration-success?driver_id=${driver_id}`,
      cancel_url: `${req.headers.get("origin")}/register-driver`,
      metadata: {
        driver_id: driver_id,
        user_id: user.id,
        type: "driver_subscription",
      },
    });

    console.log("[CREATE-DRIVER-SUBSCRIPTION] Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[CREATE-DRIVER-SUBSCRIPTION] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
