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
  console.log(`[CAPTURE-FINAL-PAYMENT] ${step}${detailsStr}`);
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
    } = await req.json();

    if (!course_id) throw new Error("course_id required");

    logStep("Processing final payment request", { course_id });

    // Get course with deposit info
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
        client:clients!courses_client_id_fkey(id, user_id),
        devis:devis(id, amount, quote_number)
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

    logStep("Course found", { 
      depositStatus: course.deposit_status,
      depositAmount: course.deposit_amount,
      finalPaymentAmount: course.final_payment_amount
    });

    // Validate driver has Stripe Connect (detection based on account status, not billing_type)
    if (!course.driver.stripe_connect_account_id || 
        !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Le chauffeur n'a pas configuré Stripe Connect.");
    }

    // Check deposit was paid
    if (course.deposit_required && course.deposit_status !== "paid") {
      throw new Error("L'acompte n'a pas été payé. Impossible de finaliser le paiement.");
    }

    // Get the remaining amount to charge
    const finalAmount = course.final_payment_amount || 
      (course.guest_estimated_price || 0) - (course.deposit_amount || 0);
    
    if (!finalAmount || finalAmount <= 0) {
      // If course was fully paid by deposit (unlikely but handle it)
      logStep("No remaining amount to charge", { finalAmount });
      
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: "paid",
          payment_status: "paid",
          status: "completed",
        })
        .eq("id", course_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Course entièrement payée par l'acompte",
          amount_charged: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const finalAmountCents = Math.round(finalAmount * 100);
    const origin = req.headers.get("origin") || "https://solo-cab-to-lovable.lovable.app";

    logStep("Creating final payment session", { finalAmount, finalAmountCents });

    // Calculate remaining fee (prorate the 0.50€ based on remaining %)
    const depositPercentage = course.deposit_percentage || 0;
    const remainingPercentage = 100 - depositPercentage;
    const remainingFee = Math.round(SOLOCAB_FEE_CENTS * (remainingPercentage / 100));

    // Create Stripe Checkout Session for final payment
    const devisData = course.devis?.[0];
    
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: client_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Solde course VTC`,
              description: `${course.pickup_address} → ${course.destination_address}\nAcompte payé : ${course.deposit_amount?.toFixed(2)}€`,
            },
            unit_amount: finalAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id,
        devis_id: devisData?.id || "",
        driver_id: course.driver_id,
        type: "final_payment",
        deposit_amount: (course.deposit_amount || 0).toString(),
      },
      payment_intent_data: {
        capture_method: "automatic",
        // DESTINATION CHARGES: Funds go directly to driver
        transfer_data: {
          destination: course.driver.stripe_connect_account_id,
        },
        application_fee_amount: Math.min(SOLOCAB_FEE_CENTS, finalAmountCents),
        metadata: {
          course_id,
          driver_id: course.driver_id,
          type: "final_payment",
          solocab_fee: "0.50",
        },
      },
      success_url: `${origin}/reservation-tracking/${course_id}?final_payment=success`,
      cancel_url: `${origin}/reservation-tracking/${course_id}?final_payment=cancelled`,
    });

    logStep("Final payment checkout session created", { sessionId: session.id });

    // Calculer les frais pour information
    const STRIPE_PERCENTAGE = 0.015;
    const STRIPE_FIXED_FEE = 0.25;
    const totalAmount = (course.deposit_amount || 0) + finalAmount;
    const stripeFee = Math.round((totalAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
    const totalFees = SOLOCAB_FEE_CENTS / 100 + stripeFee;
    const netToDriver = Math.round((totalAmount - totalFees) * 100) / 100;

    // Update course
    await supabaseClient
      .from("courses")
      .update({
        final_payment_status: "pending",
        final_payment_amount: finalAmount,
      })
      .eq("id", course_id);

    // Create final payment transaction record
    await supabaseClient
      .from("deposit_transactions")
      .insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        amount: finalAmount,
        percentage: remainingPercentage,
        status: "pending",
        transaction_type: "final_payment",
      });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        amount: finalAmount,
        deposit_paid: course.deposit_amount,
        total_amount: totalAmount,
        fees: {
          solocab_fee: SOLOCAB_FEE_CENTS / 100,
          stripe_fee_estimated: stripeFee,
          total_fees_estimated: totalFees,
          net_to_driver_estimated: netToDriver,
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
