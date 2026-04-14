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
      capture_method = "automatic",
      client_email,
      client_name,
      client_user_id,
      save_card = false,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");

    logStep("Processing payment request", { course_id, devis_id, capture_method, save_card });

    // Get course and driver details
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, 
          user_id,
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

    logStep("Course found", { driverId: course.driver.id });

    // Validate driver has Stripe Connect
    const hasStripeConnect = !!course.driver.stripe_connect_account_id && 
                             course.driver.stripe_connect_charges_enabled === true;
    if (!hasStripeConnect) {
      throw new Error("Le chauffeur n'a pas configuré Stripe Connect. Paiement en ligne impossible.");
    }

    // Get amount
    const devisData = devis_id 
      ? course.devis?.find((d: any) => d.id === devis_id)
      : course.devis?.[0];
    
    const amount = devisData?.amount || course.final_payment_amount || course.guest_estimated_price;
    if (!amount || amount <= 0) {
      throw new Error("Montant de la course invalide");
    }

    const amountCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://solocab.fr";

    // =============================================
    // STRIPE CUSTOMER MANAGEMENT
    // =============================================
    let stripeCustomerId: string | undefined;

    // Check if client has existing Stripe Customer
    if (client_user_id) {
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("id, stripe_customer_id")
        .eq("user_id", client_user_id)
        .single();

      if (clientData?.stripe_customer_id) {
        stripeCustomerId = clientData.stripe_customer_id;
        logStep("Existing Stripe Customer found", { customerId: stripeCustomerId });
      }
    }

    // Create Stripe Customer if not exists
    if (!stripeCustomerId && client_email) {
      const existingCustomers = await stripe.customers.list({ 
        email: client_email, 
        limit: 1 
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
        logStep("Found existing Stripe Customer by email", { customerId: stripeCustomerId });
      } else {
        const newCustomer = await stripe.customers.create({
          email: client_email,
          name: client_name || undefined,
          metadata: {
            platform: "solocab",
            client_user_id: client_user_id || "",
          },
        });
        stripeCustomerId = newCustomer.id;
        logStep("New Stripe Customer created", { customerId: stripeCustomerId });
      }

      // Save customer ID to client record
      if (client_user_id && stripeCustomerId) {
        await supabaseClient
          .from("clients")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("user_id", client_user_id);
      }
    }

    logStep("Creating payment", { amount, amountCents, capture_method, save_card });

    // =============================================
    // CREATE CHECKOUT SESSION
    // =============================================
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : client_email,
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

    // DESTINATION CHARGES: Funds go directly to driver's Stripe Connect account
    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
      capture_method: capture_method === "manual" ? "manual" : "automatic",
      transfer_data: {
        destination: course.driver.stripe_connect_account_id,
      },
      on_behalf_of: course.driver.stripe_connect_account_id,
      application_fee_amount: Math.min(SOLOCAB_FEE_CENTS, amountCents),
      metadata: {
        course_id,
        driver_id: course.driver_id,
        type: "course_payment",
        solocab_fee: "0.50",
      },
    };

    // Save card for future use (1-click payments)
    if (save_card && stripeCustomerId) {
      paymentIntentData.setup_future_usage = "off_session";
      logStep("Card will be saved for future payments");
    }

    sessionConfig.payment_intent_data = paymentIntentData;

    logStep("Stripe Connect payment configured", {
      destination: course.driver.stripe_connect_account_id,
      applicationFee: SOLOCAB_FEE_CENTS / 100,
      captureMethod: capture_method,
      saveCard: save_card,
    });

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

    // Record in payments table
    await supabaseClient.from("payments").insert({
      course_id,
      driver_id: course.driver_id,
      client_id: course.client_id,
      guest_email: client_email,
      guest_name: client_name,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: stripeCustomerId,
      amount: amount,
      application_fee_amount: SOLOCAB_FEE_CENTS / 100,
      status: "pending",
      payment_type: "course_payment",
      capture_method: capture_method,
      metadata: { save_card, devis_id: devis_id || devisData?.id },
    });

    // Update devis if exists
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
        solocab_fee: 0.50,
        customer_id: stripeCustomerId,
        card_saved: save_card,
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
