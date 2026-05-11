import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z, parseBody, corsHeaders } from "../_shared/validation.ts";

const CardHoldSchema = z.object({
  driver_id: z.string().uuid(),
  course_id: z.string().uuid().optional(),
  client_email: z.string().email().max(255).optional(),
  client_name: z.string().trim().max(200).optional(),
  client_user_id: z.string().uuid().optional(),
  hold_amount_cents: z.number().int().positive().max(10_000_000).optional(),
});

const MIN_HOLD_CENTS = 100; // 1€ safety minimum (hold = exact TTC price)
const SOLOCAB_FEE_CENTS = 50; // 0.50€ platform fee

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CARD-HOLD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const { 
      driver_id,
      course_id,
      client_email,
      client_name,
      client_user_id,
      hold_amount_cents, // NEW: exact TTC amount in cents
    } = body;

    if (!driver_id || typeof driver_id !== "string") throw new Error("driver_id required");
    if (course_id && typeof course_id !== "string") throw new Error("Invalid course_id");
    if (client_email && typeof client_email !== "string") throw new Error("Invalid client_email");

    // Determine hold amount: use exact course price TTC
    let holdAmountCents = hold_amount_cents ? Math.round(Number(hold_amount_cents)) : 0;
    
    // If no amount provided, try to get it from the course
    if (!holdAmountCents && course_id) {
      const { data: courseData } = await supabaseClient
        .from("courses")
        .select("final_payment_amount, guest_estimated_price")
        .eq("id", course_id)
        .single();
      
      if (courseData) {
        const priceEuros = courseData.final_payment_amount || courseData.guest_estimated_price;
        if (priceEuros && priceEuros > 0) {
          holdAmountCents = Math.round(priceEuros * 100);
        }
      }
    }

    // Minimum hold = 1€ safety (actual hold = exact TTC price)
    if (holdAmountCents < MIN_HOLD_CENTS) {
      holdAmountCents = MIN_HOLD_CENTS;
    }

    const holdAmountEuros = holdAmountCents / 100;

    logStep("Creating hold for exact course amount", { 
      driver_id, course_id, client_email, 
      holdAmountCents, holdAmountEuros 
    });

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
    if (!driver.stripe_connect_account_id || 
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

    logStep(`Driver has Stripe Connect, creating ${holdAmountEuros}€ PaymentIntent with manual capture`);

    // Check if client has a saved card for automatic hold
    let savedPaymentMethodId: string | undefined;
    let stripeCustomerId: string | undefined;

    if (client_user_id) {
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("id, stripe_customer_id, default_payment_method_id")
        .eq("user_id", client_user_id)
        .single();

      if (clientData?.stripe_customer_id && clientData?.default_payment_method_id) {
        stripeCustomerId = clientData.stripe_customer_id;
        savedPaymentMethodId = clientData.default_payment_method_id;
        logStep("Client has saved card, will attempt automatic hold");
      } else if (clientData?.stripe_customer_id) {
        stripeCustomerId = clientData.stripe_customer_id;
        const pms = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: "card",
          limit: 1,
        });
        if (pms.data.length > 0) {
          savedPaymentMethodId = pms.data[0].id;
          logStep("Found saved card on Stripe Customer");
        }
      }
    }

    // DESTINATION CHARGES: Funds go directly to driver's Stripe Connect account
    // SoloCab takes its fee via application_fee_amount — never holds funds
    const applicationFeeCents = Math.min(SOLOCAB_FEE_CENTS, holdAmountCents); // Cap fee at hold amount
    const piParams: any = {
      amount: holdAmountCents,
      currency: "eur",
      capture_method: "manual",
      transfer_data: {
        destination: driver.stripe_connect_account_id,
      },
      on_behalf_of: driver.stripe_connect_account_id,
      application_fee_amount: applicationFeeCents,
      metadata: {
        driver_id,
        course_id: course_id || "",
        client_email: client_email || "",
        client_name: client_name || "",
        type: "course_hold",
        hold_amount_cents: holdAmountCents.toString(),
        cancellation_fee_cents: "1000", // 10€ cancellation policy (separate from hold amount)
        solocab_fee: (applicationFeeCents / 100).toFixed(2),
      },
      description: `Réservation VTC ${holdAmountEuros}€ TTC${course_id ? ` - Course #${course_id.slice(0, 8)}` : ''}`,
    };

    // If saved card: create, confirm off-session (no UI needed)
    if (savedPaymentMethodId && stripeCustomerId) {
      piParams.customer = stripeCustomerId;
      piParams.payment_method = savedPaymentMethodId;
      piParams.off_session = true;
      piParams.confirm = true;
      logStep("Creating automatic hold with saved card (off-session)");
    } else {
      piParams.payment_method_types = ["card"];
      piParams.setup_future_usage = "off_session";
      if (stripeCustomerId) {
        piParams.customer = stripeCustomerId;
      }
      logStep("Creating hold requiring client card input");
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams, {
      idempotencyKey: `card-hold:${courseId}:v1`,
    });

    logStep("PaymentIntent created for hold", { 
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: holdAmountCents,
      autoConfirmed: paymentIntent.status === "requires_capture",
    });

    const isAutoConfirmed = paymentIntent.status === "requires_capture";
    const holdStatus = isAutoConfirmed ? "confirmed" : "pending";

    // Update course with hold info
    if (course_id) {
      const courseUpdate: Record<string, unknown> = {
        stripe_hold_payment_intent_id: paymentIntent.id,
        card_hold_status: holdStatus,
        card_hold_amount: holdAmountEuros,
        payment_method: "card",
      };

      if (isAutoConfirmed && savedPaymentMethodId) {
        courseUpdate.stripe_payment_method_id = savedPaymentMethodId;
        courseUpdate.stripe_customer_id = stripeCustomerId;
        courseUpdate.payment_status = "bank_imprint_confirmed";
      }

      await supabaseClient
        .from("courses")
        .update(courseUpdate)
        .eq("id", course_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        card_hold_required: !isAutoConfirmed,
        auto_confirmed: isAutoConfirmed,
        payment_intent_id: paymentIntent.id,
        client_secret: isAutoConfirmed ? undefined : paymentIntent.client_secret,
        hold_amount: holdAmountEuros,
        hold_amount_cents: holdAmountCents,
        status: paymentIntent.status,
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
