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
  console.log(`[CREATE-DEPOSIT-PAYMENT] ${step}${detailsStr}`);
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
      client_email,
      client_name,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");

    logStep("Processing deposit payment request", { course_id, devis_id });

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
          company_name,
          deposit_enabled,
          deposit_percentage,
          deposit_required_for
        ),
        devis:devis(id, amount, quote_number),
        client:clients!courses_client_id_fkey(
          id,
          user_id,
          total_rides
        )
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    logStep("Course found", { 
      driverId: course.driver.id, 
      depositEnabled: course.driver.deposit_enabled,
      depositPercentage: course.driver.deposit_percentage
    });

    // Validate driver has Stripe Connect (detection based on account status, not billing_type)
    if (!course.driver.stripe_connect_account_id || 
        !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Le chauffeur n'a pas configuré Stripe Connect. Paiement en ligne impossible.");
    }

    // Check if deposit is required
    if (!course.driver.deposit_enabled) {
      throw new Error("Le chauffeur n'a pas activé les acomptes.");
    }

    // Check deposit requirement based on driver settings
    const isNewClient = (course.client?.total_rides || 0) === 0;
    const depositRequiredFor = course.driver.deposit_required_for || 'none';
    
    if (depositRequiredFor === 'none') {
      throw new Error("Les acomptes ne sont pas requis par ce chauffeur.");
    }
    
    if (depositRequiredFor === 'new_clients' && !isNewClient) {
      throw new Error("L'acompte n'est requis que pour les nouveaux clients.");
    }

    // Get amount from devis or course
    const devisData = devis_id 
      ? course.devis?.find((d: any) => d.id === devis_id)
      : course.devis?.[0];
    
    const totalAmount = devisData?.amount || course.final_payment_amount || course.guest_estimated_price;
    if (!totalAmount || totalAmount <= 0) {
      throw new Error("Montant de la course invalide");
    }

    // Calculate deposit amount
    const depositPercentage = course.driver.deposit_percentage || 20;
    const depositAmount = (totalAmount * depositPercentage) / 100;
    const depositAmountCents = Math.round(depositAmount * 100);
    const remainingAmount = totalAmount - depositAmount;

    const origin = req.headers.get("origin") || "https://solocab.fr";

    logStep("Creating deposit payment", { 
      totalAmount, 
      depositPercentage, 
      depositAmount,
      remainingAmount
    });

    // Create Stripe Checkout Session for deposit
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Acompte ${depositPercentage}% - Course VTC`,
              description: `${course.pickup_address} → ${course.destination_address}\nReste à payer : ${remainingAmount.toFixed(2)}€ en fin de course`,
            },
            unit_amount: depositAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id,
        devis_id: devis_id || devisData?.id || "",
        driver_id: course.driver_id,
        type: "deposit_payment",
        deposit_percentage: depositPercentage.toString(),
        total_amount: totalAmount.toString(),
        remaining_amount: remainingAmount.toString(),
      },
      payment_intent_data: {
        // Automatic capture for deposit - it's non-refundable if client cancels
        capture_method: "automatic",
        transfer_data: {
          destination: course.driver.stripe_connect_account_id,
        },
        on_behalf_of: course.driver.stripe_connect_account_id,
        // Application fee on the deposit
        application_fee_amount: Math.round(SOLOCAB_FEE_CENTS * (depositPercentage / 100)),
        metadata: {
          course_id,
          driver_id: course.driver_id,
          type: "deposit_payment",
          deposit_percentage: depositPercentage.toString(),
        },
      },
      success_url: `${origin}/reservation-tracking/${course.tracking_token}?deposit=success`,
      cancel_url: `${origin}/reservation-tracking/${course.tracking_token}?deposit=cancelled`,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Deposit checkout session created", { sessionId: session.id });

    // Update course with deposit info
    await supabaseClient
      .from("courses")
      .update({
        deposit_required: true,
        deposit_percentage: depositPercentage,
        deposit_amount: depositAmount,
        deposit_status: "pending",
        final_payment_amount: remainingAmount,
        stripe_checkout_session_id: session.id,
        payment_method: "stripe",
      })
      .eq("id", course_id);

    // Create deposit transaction record
    await supabaseClient
      .from("deposit_transactions")
      .insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        amount: depositAmount,
        percentage: depositPercentage,
        status: "pending",
        transaction_type: "deposit",
      });

    // If devis exists, update its status
    if (devisData?.id) {
      await supabaseClient
        .from("devis")
        .update({ 
          status: "deposit_pending",
          stripe_checkout_session_id: session.id 
        })
        .eq("id", devisData.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        deposit_amount: depositAmount,
        deposit_percentage: depositPercentage,
        remaining_amount: remainingAmount,
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
