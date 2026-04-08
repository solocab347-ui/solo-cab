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
  console.log(`[CREATE-PAYMENT-REQUEST] ${step}${detailsStr}`);
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

    const { 
      course_id,
      client_email,
      client_name,
      amount: requestedAmount,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");

    logStep("Processing payment request", { course_id, client_email });

    // Get course with driver info
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
        devis:devis(id, amount, quote_number, status)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Verify caller is the driver
    if (course.driver.user_id !== userData.user.id) {
      throw new Error("Unauthorized: only the course driver can create payment request");
    }

    logStep("Course found", { 
      driverId: course.driver.id,
      billingType: course.driver.billing_type,
      hasStripeConnect: !!course.driver.stripe_connect_account_id
    });

    // Validate driver has Stripe Connect (detection based on account status, not billing_type)
    if (!course.driver.stripe_connect_account_id || 
        !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Stripe Connect non configuré. Veuillez d'abord configurer vos encaissements.");
    }

    // Get the amount: priority = requestedAmount > acceptedDevis > final_payment_amount > guest_estimated_price
    const acceptedDevis = course.devis?.find((d: any) => d.status === 'accepted');
    const totalAmount = requestedAmount || acceptedDevis?.amount || course.final_payment_amount || course.guest_estimated_price;
    
    if (!totalAmount || totalAmount <= 0) {
      throw new Error("Montant de la course invalide. Veuillez spécifier un montant.");
    }

    // Calculate remaining amount (minus any deposit already paid)
    const depositPaid = course.deposit_status === 'paid' ? (course.deposit_amount || 0) : 0;
    const remainingAmount = totalAmount - depositPaid;
    
    if (remainingAmount <= 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Course déjà payée via l'acompte",
          amount_remaining: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const remainingAmountCents = Math.round(remainingAmount * 100);
    const origin = req.headers.get("origin") || "https://solo-cab-to-lovable.lovable.app";

    logStep("Creating payment checkout", { 
      totalAmount, 
      depositPaid, 
      remainingAmount 
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: depositPaid > 0 ? `Solde course VTC` : `Course VTC`,
              description: `${course.pickup_address} → ${course.destination_address}${depositPaid > 0 ? `\nAcompte déjà payé : ${depositPaid.toFixed(2)}€` : ''}`,
            },
            unit_amount: remainingAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id,
        devis_id: acceptedDevis?.id || "",
        driver_id: course.driver_id,
        type: depositPaid > 0 ? "final_payment" : "full_payment",
        deposit_amount: depositPaid.toString(),
      },
      payment_intent_data: {
        capture_method: "automatic",
        // WEEKLY SETTLEMENT: No transfer_data — funds stay on platform
        metadata: {
          course_id,
          driver_id: course.driver_id,
          type: depositPaid > 0 ? "final_payment" : "full_payment",
          solocab_fee: "0.50",
        },
      },
      success_url: course.tracking_token 
        ? `${origin}/reservation-tracking/${course.tracking_token}?payment=success`
        : `${origin}/payment-success?course_id=${course_id}`,
      cancel_url: course.tracking_token
        ? `${origin}/reservation-tracking/${course.tracking_token}?payment=cancelled`
        : `${origin}/payment-cancelled?course_id=${course_id}`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update course with payment request info
    await supabaseClient
      .from("courses")
      .update({
        payment_request_sent: true,
        payment_request_sent_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        payment_method: "stripe",
      })
      .eq("id", course_id);

    // Create notification for tracking
    await supabaseClient.from("notifications").insert({
      user_id: course.driver.user_id,
      title: "💳 Demande de paiement créée",
      message: `Lien de paiement de ${remainingAmount.toFixed(2)}€ créé pour la course`,
      type: "info",
      link: `/driver-dashboard?tab=courses`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        amount: remainingAmount,
        deposit_paid: depositPaid,
        total_amount: totalAmount,
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
