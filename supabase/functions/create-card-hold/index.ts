import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESERVATION_HOLD_CENTS = 1000; // 10€ fixed reservation hold

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CARD-HOLD] ${step}${detailsStr}`);
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

    const { 
      driver_id,
      course_id,
      client_email,
      client_name,
    } = await req.json();

    if (!driver_id) throw new Error("driver_id required");

    logStep("Creating 10€ reservation hold", { driver_id, course_id, client_email });

    // Get driver Stripe Connect info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select(`
        id, user_id, billing_type,
        stripe_connect_account_id,
        stripe_connect_charges_enabled,
        company_name
      `)
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    // Validate driver has Stripe Connect
    if (driver.billing_type !== "solocab_stripe" || 
        !driver.stripe_connect_account_id || 
        !driver.stripe_connect_charges_enabled) {
      logStep("Driver does not have Stripe Connect, skipping card hold");
      return new Response(
        JSON.stringify({
          success: true,
          card_hold_required: false,
          message: "Card hold not required - driver uses other payment methods",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Driver has Stripe Connect, creating 10€ PaymentIntent with manual capture");

    // Create a PaymentIntent with manual capture = "hold" the 10€
    // The 10€ is NOT charged yet, just authorized on the card
    const paymentIntent = await stripe.paymentIntents.create({
      amount: RESERVATION_HOLD_CENTS,
      currency: "eur",
      capture_method: "manual", // Hold only, do not charge
      payment_method_types: ["card"],
      metadata: {
        driver_id,
        course_id: course_id || "",
        client_email: client_email || "",
        client_name: client_name || "",
        type: "reservation_hold",
        hold_amount_cents: RESERVATION_HOLD_CENTS.toString(),
      },
      // Transfer to driver's connected account if captured
      transfer_data: {
        destination: driver.stripe_connect_account_id,
      },
      description: `Avance de réservation 10€ - Course VTC${course_id ? ` #${course_id.slice(0, 8)}` : ''}`,
    });

    logStep("PaymentIntent created for hold", { 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret?.slice(0, 20) + "..." 
    });

    // Update course with hold info
    if (course_id) {
      await supabaseClient
        .from("courses")
        .update({
          stripe_hold_payment_intent_id: paymentIntent.id,
          card_hold_status: "pending",
          card_hold_amount: 10.00,
          payment_method: "card",
        })
        .eq("id", course_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        card_hold_required: true,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        stripe_account_id: driver.stripe_connect_account_id,
        hold_amount: 10.00,
        hold_amount_cents: RESERVATION_HOLD_CENTS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
