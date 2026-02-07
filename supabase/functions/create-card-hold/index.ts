import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      amount, // Le montant estimé de la course pour l'affichage
    } = await req.json();

    if (!driver_id) throw new Error("driver_id required");

    logStep("Creating card hold setup", { driver_id, course_id, client_email });

    // Get driver Stripe Connect info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select(`
        id,
        user_id,
        billing_type,
        stripe_connect_account_id,
        stripe_connect_charges_enabled,
        deposit_enabled,
        deposit_percentage,
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
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Driver has Stripe Connect, creating SetupIntent");

    const origin = req.headers.get("origin") || "https://solo-cab-to-lovable.lovable.app";

    // Create a SetupIntent to collect card details for future charges
    // This creates a "card hold" without actually charging
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ["card"],
      metadata: {
        driver_id,
        course_id: course_id || "",
        client_email: client_email || "",
        client_name: client_name || "",
        type: "card_hold_reservation",
      },
      // On behalf of the connected account to comply with Stripe Connect rules
      on_behalf_of: driver.stripe_connect_account_id,
      usage: "off_session", // Allows future off-session payments
    });

    logStep("SetupIntent created", { 
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret?.slice(0, 20) + "..." 
    });

    // If we have a course_id, update it with the setup intent info
    if (course_id) {
      await supabaseClient
        .from("courses")
        .update({
          stripe_setup_intent_id: setupIntent.id,
          card_hold_status: "pending",
        })
        .eq("id", course_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        card_hold_required: true,
        setup_intent_id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        stripe_account_id: driver.stripe_connect_account_id,
        deposit_enabled: driver.deposit_enabled,
        deposit_percentage: driver.deposit_percentage || 20,
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
