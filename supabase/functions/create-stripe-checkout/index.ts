import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-STRIPE-CHECKOUT] Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    console.log("[CREATE-STRIPE-CHECKOUT] User authenticated:", user.email);

    // Get devis_id from request
    const { devis_id } = await req.json();
    if (!devis_id) throw new Error("devis_id is required");
    console.log("[CREATE-STRIPE-CHECKOUT] Processing devis:", devis_id);

    // Fetch devis details
    const { data: devis, error: devisError } = await supabaseClient
      .from("devis")
      .select(`
        *,
        courses!inner(
          pickup_address,
          destination_address,
          scheduled_date
        ),
        drivers!inner(
          company_name,
          profiles:user_id(full_name)
        )
      `)
      .eq("id", devis_id)
      .single();

    if (devisError) throw new Error(`Error fetching devis: ${devisError.message}`);
    if (!devis) throw new Error("Devis not found");
    console.log("[CREATE-STRIPE-CHECKOUT] Devis fetched:", devis.quote_number);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-STRIPE-CHECKOUT] Existing customer:", customerId);
    } else {
      console.log("[CREATE-STRIPE-CHECKOUT] Creating new customer");
    }

    // Get driver Stripe Connect account
    const { data: driverData } = await supabaseClient
      .from("drivers")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", devis.driver_id)
      .single();

    const amountCents = Math.round(parseFloat(devis.amount) * 100);
    const SOLOCAB_FEE_CENTS = 50;

    // Create checkout session with DESTINATION CHARGES
    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Course ${devis.courses.pickup_address} → ${devis.courses.destination_address}`,
              description: `Devis ${devis.quote_number} - ${devis.drivers.profiles?.full_name || devis.drivers.company_name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          devis_id: devis_id,
          course_id: devis.course_id,
          driver_id: devis.driver_id,
          client_id: devis.client_id,
          solocab_fee: "0.50",
        },
        // DESTINATION CHARGES: Funds go directly to driver
        ...(driverData?.stripe_connect_account_id && driverData?.stripe_connect_charges_enabled ? {
          transfer_data: { destination: driverData.stripe_connect_account_id },
          on_behalf_of: driverData.stripe_connect_account_id,
          application_fee_amount: Math.min(SOLOCAB_FEE_CENTS, amountCents),
        } : {}),
      },
      success_url: `${req.headers.get("origin")}/client-dashboard?payment=success&devis_id=${devis_id}`,
      cancel_url: `${req.headers.get("origin")}/client-dashboard?payment=cancelled`,
      metadata: {
        devis_id: devis_id,
        course_id: devis.course_id,
        driver_id: devis.driver_id,
        client_id: devis.client_id,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("[CREATE-STRIPE-CHECKOUT] Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[CREATE-STRIPE-CHECKOUT] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
