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
      setup_intent_id,
      course_id,
    } = await req.json();

    if (!setup_intent_id) throw new Error("setup_intent_id required");
    if (!course_id) throw new Error("course_id required");

    logStep("Confirming card hold", { setup_intent_id, course_id });

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
    
    if (setupIntent.status !== "succeeded") {
      throw new Error(`SetupIntent not completed: ${setupIntent.status}`);
    }

    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId) {
      throw new Error("No payment method attached to SetupIntent");
    }

    logStep("SetupIntent confirmed", { 
      status: setupIntent.status,
      paymentMethodId 
    });

    // Update course with card hold info
    const { error: updateError } = await supabaseClient
      .from("courses")
      .update({
        stripe_setup_intent_id: setup_intent_id,
        stripe_payment_method_id: paymentMethodId,
        card_hold_status: "confirmed",
        card_hold_confirmed_at: new Date().toISOString(),
      })
      .eq("id", course_id);

    if (updateError) {
      logStep("Error updating course", { error: updateError.message });
      throw new Error("Failed to update course with card hold info");
    }

    // Get course and driver info for notification
    const { data: course } = await supabaseClient
      .from("courses")
      .select(`
        id, guest_name, guest_email,
        driver:drivers!courses_driver_id_fkey(id, user_id, company_name)
      `)
      .eq("id", course_id)
      .single();

    // Notify driver
    if (course?.driver?.user_id) {
      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "✅ Empreinte bancaire validée",
        message: `${course.guest_name || "Un client"} a validé son empreinte bancaire pour une réservation.`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });
    }

    logStep("Card hold confirmed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Empreinte bancaire confirmée",
        payment_method_id: paymentMethodId,
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
