import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-CARD-HOLD] ${step}${detailsStr}`);
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
      payment_intent_id,
      course_id,
    } = await req.json();

    if (!payment_intent_id) throw new Error("payment_intent_id required");
    if (!course_id) throw new Error("course_id required");

    logStep("Confirming card hold", { payment_intent_id, course_id });

    // Retrieve the PaymentIntent to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    // For manual capture, status should be "requires_capture" after confirmation
    if (paymentIntent.status !== "requires_capture") {
      logStep("PaymentIntent status", { status: paymentIntent.status });
      if (paymentIntent.status === "succeeded") {
        // Already captured somehow
      } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "requires_confirmation") {
        throw new Error(`Payment not yet confirmed by client: ${paymentIntent.status}`);
      } else {
        throw new Error(`Unexpected PaymentIntent status: ${paymentIntent.status}`);
      }
    }

    const paymentMethodId = paymentIntent.payment_method as string;
    const holdAmountEuros = paymentIntent.amount / 100;

    logStep("PaymentIntent confirmed (hold active)", { 
      status: paymentIntent.status,
      paymentMethodId,
      holdAmount: holdAmountEuros,
    });

    // Update course with card hold confirmation
    const { error: updateError } = await supabaseClient
      .from("courses")
      .update({
        stripe_hold_payment_intent_id: payment_intent_id,
        stripe_payment_method_id: paymentMethodId || null,
        card_hold_status: "confirmed",
        card_hold_confirmed_at: new Date().toISOString(),
        card_hold_amount: holdAmountEuros,
      })
      .eq("id", course_id);

    if (updateError) {
      logStep("Error updating course", { error: updateError.message });
      throw new Error("Failed to update course with card hold info");
    }

    // Notify driver
    const { data: course } = await supabaseClient
      .from("courses")
      .select(`
        id, guest_name, guest_email,
        driver:drivers!courses_driver_id_fkey(id, user_id, company_name)
      `)
      .eq("id", course_id)
      .single();

    const driverRel = Array.isArray((course as any)?.driver)
      ? (course as any).driver[0]
      : (course as any)?.driver;

    if (driverRel?.user_id) {
      await supabaseClient.from("notifications").insert({
        user_id: driverRel.user_id,
        title: "💳 Empreinte bancaire validée",
        message: `${course?.guest_name || "Un client"} a confirmé son empreinte de ${holdAmountEuros.toFixed(2)}€ pour réserver la course.`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });
    }

    logStep("Card hold confirmed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Empreinte bancaire de ${holdAmountEuros.toFixed(2)}€ confirmée - la course est réservée`,
        payment_method_id: paymentMethodId,
        hold_amount: holdAmountEuros,
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
