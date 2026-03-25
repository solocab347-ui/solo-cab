import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course
const STRIPE_PERCENTAGE = 0.015;
const STRIPE_FIXED_FEE = 0.25;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAPTURE-COURSE-PAYMENT] ${step}${detailsStr}`);
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

    // Authenticate driver
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { course_id, amount_to_capture } = await req.json();
    if (!course_id) throw new Error("course_id required");

    logStep("Capture request", { course_id, amount_to_capture });

    // Get course with payment intent
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, user_id, company_name,
          stripe_connect_account_id, stripe_connect_charges_enabled
        ),
        client:clients!courses_client_id_fkey(id, user_id)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Verify caller is the driver
    if (course.driver.user_id !== userData.user.id) {
      throw new Error("Unauthorized: only the course driver can capture payment");
    }

    if (!course.stripe_payment_intent_id && !course.stripe_hold_payment_intent_id) {
      throw new Error("No payment intent found for this course");
    }

    const paymentIntentId = course.stripe_payment_intent_id || course.stripe_hold_payment_intent_id;

    logStep("Capturing payment intent", { paymentIntentId });

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      amount_to_capture ? { amount_to_capture: Math.round(amount_to_capture * 100) } : {}
    );

    const capturedAmount = paymentIntent.amount_received / 100;

    // Calculate fees (aligned with finalize-course-payment)
    const stripeFee = Math.round((capturedAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
    const solocabFee = SOLOCAB_FEE_CENTS / 100;
    const totalFees = stripeFee + solocabFee;
    const netToDriver = Math.round((capturedAmount - totalFees) * 100) / 100;

    logStep("Payment captured", { 
      status: paymentIntent.status,
      capturedAmount,
      stripeFee,
      solocabFee,
      netToDriver,
    });

    // Update course status with full fee breakdown
    await supabaseClient
      .from("courses")
      .update({
        payment_status: "paid",
        payment_captured_at: new Date().toISOString(),
        status: "completed",
        solocab_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
      })
      .eq("id", course_id);

    // Record in payments table
    await supabaseClient.from("payments").insert({
      course_id,
      driver_id: course.driver_id,
      client_id: course.client_id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: paymentIntent.latest_charge as string || null,
      amount: capturedAmount,
      captured_amount: capturedAmount,
      application_fee_amount: solocabFee,
      stripe_fee_amount: stripeFee,
      net_to_driver: netToDriver,
      status: "captured",
      payment_type: "course_payment",
      capture_method: "manual",
      captured_at: new Date().toISOString(),
    });

    // Record in stripe_transactions ledger
    await supabaseClient.from("stripe_transactions").insert({
      course_id,
      driver_id: course.driver_id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: paymentIntent.latest_charge as string || null,
      transaction_type: "course_capture",
      gross_amount: capturedAmount,
      stripe_fee_amount: stripeFee,
      solocab_fee_amount: solocabFee,
      net_amount: netToDriver,
      status: "succeeded",
      description: `Capture course - ${course.pickup_address} → ${course.destination_address}`,
    });

    // Create or update facture
    const { data: existingFacture } = await supabaseClient
      .from("factures")
      .select("id")
      .eq("course_id", course_id)
      .maybeSingle();

    if (existingFacture) {
      await supabaseClient
        .from("factures")
        .update({
          payment_status: "paid",
          payment_method: "stripe",
          stripe_payment_id: paymentIntent.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", existingFacture.id);
    } else {
      await supabaseClient.functions.invoke("create-facture-auto", {
        body: { course_id }
      });
    }

    // Notify driver with fee breakdown
    await supabaseClient.from("notifications").insert({
      user_id: course.driver.user_id,
      title: "💰 Paiement encaissé",
      message: `${capturedAmount.toFixed(2)}€ encaissé. Net après frais: ${netToDriver.toFixed(2)}€`,
      type: "info",
    });

    // Notify client
    if (course.client?.user_id) {
      await supabaseClient.from("notifications").insert({
        user_id: course.client.user_id,
        title: "✅ Paiement confirmé",
        message: `Votre paiement de ${capturedAmount.toFixed(2)}€ a été effectué avec succès.`,
        type: "info",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        amount_captured: capturedAmount,
        payment_intent_id: paymentIntent.id,
        fees: {
          stripe_fee: stripeFee,
          solocab_fee: solocabFee,
          total_fees: totalFees,
          net_to_driver: netToDriver,
        },
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
