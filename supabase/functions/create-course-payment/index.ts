import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ per course

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COURSE-PAYMENT] ${step}${detailsStr}`);
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
      course_id, 
      devis_id,
      capture_method = "automatic", // "automatic" or "manual" (for bank imprint)
      client_email,
      client_name,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");

    logStep("Processing payment request", { course_id, devis_id, capture_method });

    // Get course and driver details
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, 
          user_id,
          billing_type,
          stripe_connect_account_id,
          stripe_connect_charges_enabled,
          company_name
        ),
        devis:devis(id, amount, quote_number)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    logStep("Course found", { 
      driverId: course.driver.id, 
      billingType: course.driver.billing_type 
    });

    // Validate driver has Stripe Connect (detection based on account status, not billing_type)
    const hasStripeConnect = !!course.driver.stripe_connect_account_id && 
                             course.driver.stripe_connect_charges_enabled === true;
    if (!hasStripeConnect) {
      throw new Error("Le chauffeur n'a pas configuré Stripe Connect. Paiement en ligne impossible.");
    }

    // Get amount from devis or course
    const devisData = devis_id 
      ? course.devis?.find((d: any) => d.id === devis_id)
      : course.devis?.[0];
    
    const amount = devisData?.amount || course.final_payment_amount || course.guest_estimated_price;
    if (!amount || amount <= 0) {
      throw new Error("Montant de la course invalide");
    }

    const amountCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://solo-cab-to-lovable.lovable.app";

    logStep("Creating payment", { amount, amountCents, capture_method });

    // Create Stripe Checkout Session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Course VTC - ${course.pickup_address} → ${course.destination_address}`,
              description: devisData?.quote_number 
                ? `Devis ${devisData.quote_number}` 
                : `Course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id,
        devis_id: devis_id || devisData?.id || "",
        driver_id: course.driver_id,
        type: "course_payment",
        capture_method,
      },
      success_url: `${origin}/reservation-tracking/${course.tracking_token}?payment=success`,
      cancel_url: `${origin}/reservation-tracking/${course.tracking_token}?payment=cancelled`,
    };

    // If driver has Stripe Connect, add transfer and application fee
    if (hasStripeConnect) {
      sessionConfig.payment_intent_data = {
        // Manual capture for bank imprint (capture when course completed)
        capture_method: capture_method === "manual" ? "manual" : "automatic",
        // Transfer to driver's Stripe Connect account
        transfer_data: {
          destination: course.driver.stripe_connect_account_id,
        },
        // SoloCab application fee: 0.50€
        application_fee_amount: SOLOCAB_FEE_CENTS,
        metadata: {
          course_id,
          driver_id: course.driver_id,
          type: "course_payment",
          solocab_fee: "0.50",
        },
      };

      logStep("Stripe Connect payment configured", {
        destination: course.driver.stripe_connect_account_id,
        applicationFee: SOLOCAB_FEE_CENTS / 100,
        captureMethod: capture_method,
      });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id });

    // Save payment info to course
    await supabaseClient
      .from("courses")
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: capture_method === "manual" ? "bank_imprint_pending" : "payment_pending",
        payment_method: "stripe",
      })
      .eq("id", course_id);

    // If devis exists, update its status
    if (devisData?.id) {
      await supabaseClient
        .from("devis")
        .update({ 
          status: "payment_pending",
          stripe_checkout_session_id: session.id 
        })
        .eq("id", devisData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        capture_method,
        solocab_fee: course.driver.billing_type === "solocab_stripe" ? 0.50 : 0,
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
