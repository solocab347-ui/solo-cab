import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course (cash ou carte)

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-AUTO-PAYMENT] ${step}${detailsStr}`);
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

    const { course_id, amount, driver_id, client_user_id } = await req.json();

    if (!course_id || !amount || !driver_id) {
      throw new Error("course_id, amount, driver_id required");
    }

    logStep("Auto-payment request", { course_id, amount, driver_id });

    // ── ANTI-FRAUD: Check client risk score ──
    if (client_user_id) {
      const { data: clientRecord } = await supabaseClient
        .from("clients")
        .select("id")
        .eq("user_id", client_user_id)
        .single();

      if (clientRecord) {
        const { data: riskScore } = await supabaseClient
          .from("client_risk_scores")
          .select("score, is_blocked, blocked_reason")
          .eq("client_id", clientRecord.id)
          .single();

        if (riskScore?.is_blocked) {
          logStep("🚫 Client blocked by risk score", { 
            score: riskScore.score, 
            reason: riskScore.blocked_reason 
          });
          throw new Error("CLIENT_BLOCKED: Ce client est bloqué en raison d'un historique de paiements problématique.");
        }
      }
    }

    // Get driver Stripe Connect info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) throw new Error("Driver not found");
    if (!driver.stripe_connect_account_id || !driver.stripe_connect_charges_enabled) {
      throw new Error("Driver Stripe Connect not configured");
    }

    // Get client's saved card
    const { data: client } = await supabaseClient
      .from("clients")
      .select("id, stripe_customer_id, default_payment_method_id")
      .eq("user_id", client_user_id)
      .single();

    if (!client?.stripe_customer_id) {
      throw new Error("NO_SAVED_CARD");
    }

    // Get default payment method or first available
    let paymentMethodId = client.default_payment_method_id;

    if (!paymentMethodId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: client.stripe_customer_id,
        type: "card",
        limit: 1,
      });

      if (paymentMethods.data.length === 0) {
        throw new Error("NO_SAVED_CARD");
      }

      paymentMethodId = paymentMethods.data[0].id;

      // Save as default
      await supabaseClient
        .from("clients")
        .update({ default_payment_method_id: paymentMethodId })
        .eq("id", client.id);
    }

    const amountCents = Math.round(amount * 100);

    logStep("Creating off-session PaymentIntent with manual capture", {
      customerId: client.stripe_customer_id,
      paymentMethodId,
      amountCents,
      destination: driver.stripe_connect_account_id,
    });

    // Create PaymentIntent with saved card - OFF SESSION + MANUAL CAPTURE
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      customer: client.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      capture_method: "manual", // Hold only - capture at course end
      transfer_data: {
        destination: driver.stripe_connect_account_id,
      },
      on_behalf_of: driver.stripe_connect_account_id,
      application_fee_amount: SOLOCAB_FEE_CENTS,
      metadata: {
        course_id,
        driver_id,
        client_id: client.id,
        type: "auto_bank_hold",
        solocab_fee: "0.50",
      },
      description: `Empreinte bancaire automatique - Course VTC`,
    });

    logStep("PaymentIntent created", {
      id: paymentIntent.id,
      status: paymentIntent.status,
    });

    // Update course with hold info
    const updateData: Record<string, unknown> = {
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_method_id: paymentMethodId,
      stripe_customer_id: client.stripe_customer_id,
      payment_method: "card",
    };

    if (paymentIntent.status === "requires_capture") {
      // Bank hold confirmed automatically!
      updateData.card_hold_status = "confirmed";
      updateData.card_hold_amount = amount;
      updateData.payment_status = "bank_imprint_confirmed";
      logStep("✅ Bank hold confirmed automatically (off-session)");
    } else if (paymentIntent.status === "requires_action") {
      // 3DS required - need client interaction
      updateData.card_hold_status = "requires_action";
      updateData.payment_status = "requires_authentication";
      logStep("⚠️ 3DS authentication required");
    } else {
      updateData.card_hold_status = "pending";
      updateData.payment_status = "bank_imprint_pending";
    }

    await supabaseClient
      .from("courses")
      .update(updateData)
      .eq("id", course_id);

    // Record in payments table
    await supabaseClient.from("payments").insert({
      course_id,
      driver_id,
      client_id: client.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: client.stripe_customer_id,
      amount,
      application_fee_amount: SOLOCAB_FEE_CENTS / 100,
      status: paymentIntent.status === "requires_capture" ? "authorized" : "pending",
      payment_type: "auto_bank_hold",
      capture_method: "manual",
      metadata: {
        auto_payment: true,
        off_session: true,
        payment_method_id: paymentMethodId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        auto_confirmed: paymentIntent.status === "requires_capture",
        requires_action: paymentIntent.status === "requires_action",
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.status === "requires_action"
          ? paymentIntent.client_secret
          : undefined,
        status: paymentIntent.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, code: error?.code });

    // Special handling for authentication required
    if (error?.code === "authentication_required") {
      return new Response(
        JSON.stringify({
          error: "AUTHENTICATION_REQUIRED",
          message: "La carte nécessite une authentification. Le client devra valider manuellement.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
