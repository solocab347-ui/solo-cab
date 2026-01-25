import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        driver:drivers!courses_driver_id_fkey(id, user_id)
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

    if (!course.stripe_payment_intent_id) {
      throw new Error("No payment intent found for this course");
    }

    logStep("Capturing payment intent", { 
      paymentIntentId: course.stripe_payment_intent_id 
    });

    // Capture the payment
    const paymentIntent = await stripe.paymentIntents.capture(
      course.stripe_payment_intent_id,
      amount_to_capture ? { amount_to_capture: Math.round(amount_to_capture * 100) } : {}
    );

    logStep("Payment captured", { 
      status: paymentIntent.status,
      amount: paymentIntent.amount_received / 100 
    });

    // Update course status
    await supabaseClient
      .from("courses")
      .update({
        payment_status: "paid",
        payment_captured_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", course_id);

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
      // Generate invoice via edge function
      await supabaseClient.functions.invoke("create-facture-auto", {
        body: { course_id }
      });
    }

    // Notify driver
    const { data: driverProfile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", course.driver.user_id)
      .single();

    await supabaseClient.from("notifications").insert({
      user_id: course.driver.user_id,
      title: "💰 Paiement encaissé",
      message: `Le paiement de ${(paymentIntent.amount_received / 100).toFixed(2)}€ a été encaissé pour la course.`,
      type: "info",
    });

    return new Response(
      JSON.stringify({
        success: true,
        amount_captured: paymentIntent.amount_received / 100,
        payment_intent_id: paymentIntent.id,
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
