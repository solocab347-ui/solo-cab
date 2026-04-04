import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FINALIZE-COURSE-PAYMENT] ${step}${detailsStr}`);
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

    const { course_id } = await req.json();
    if (!course_id) throw new Error("course_id required");
    if (typeof course_id !== "string" || course_id.length < 10) throw new Error("Invalid course_id format");

    logStep("Finalize course payment request", { course_id });

    // Get course with all payment info
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, user_id, company_name,
          stripe_connect_account_id, stripe_connect_charges_enabled
        ),
        client:clients!courses_client_id_fkey(id, user_id),
        devis:devis(id, amount)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Verify caller is the driver
    if (course.driver.user_id !== userData.user.id) {
      throw new Error("Unauthorized: only the course driver can finalize payment");
    }

    // Vérifier que le chauffeur utilise Stripe Connect
    if (!course.driver.stripe_connect_account_id || !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Stripe Connect non configuré pour ce chauffeur");
    }

    // Calculer le montant total et le reste à payer
    const totalAmount = course.final_payment_amount || course.guest_estimated_price || course.devis?.[0]?.amount || 0;
    const depositPaid = course.deposit_status === 'paid' ? (course.deposit_amount || 0) : 0;
    const remainingAmount = totalAmount - depositPaid;

    if (remainingAmount <= 0) {
      // Course déjà entièrement payée via l'acompte
      logStep("Course already fully paid via deposit");
      
      await supabaseClient
        .from("courses")
        .update({
          status: "completed",
          payment_status: "paid",
          final_payment_status: "succeeded",
          course_finalized_by_driver_at: new Date().toISOString(),
        })
        .eq("id", course_id);

      return new Response(
        JSON.stringify({
          success: true,
          already_paid: true,
          message: "Course entièrement payée via l'acompte",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Idempotency: if already processing or succeeded, don't retry
    if (course.final_payment_status === "succeeded") {
      logStep("Course already finalized (idempotent return)", { course_id });
      return new Response(
        JSON.stringify({
          success: true,
          already_paid: true,
          message: "Paiement déjà finalisé",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (course.final_payment_status === "processing") {
      logStep("Course payment already processing (idempotent return)", { course_id });
      return new Response(
        JSON.stringify({
          success: false,
          status: "processing",
          message: "Paiement en cours de traitement, veuillez patienter",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Marquer comme en cours de traitement
    await supabaseClient
      .from("courses")
      .update({
        final_payment_status: "processing",
        course_finalized_by_driver_at: new Date().toISOString(),
      })
      .eq("id", course_id);

    logStep("Processing final payment", { 
      totalAmount, 
      depositPaid, 
      remainingAmount 
    });

    // Vérifier si on a une empreinte bancaire pour débiter
    if (!course.stripe_payment_method_id || course.card_hold_status !== 'confirmed') {
      throw new Error("Aucune empreinte bancaire valide trouvée pour cette course");
    }

    // Calculer les frais SoloCab (proratisés)
    // Si un acompte a déjà été payé, les frais ont été partiellement prélevés
    const depositRatio = depositPaid / totalAmount;
    const feeOnDeposit = Math.round(SOLOCAB_FEE_CENTS * depositRatio);
    const remainingFee = SOLOCAB_FEE_CENTS - feeOnDeposit;

    const amountCents = Math.round(remainingAmount * 100);

    // Créer le PaymentIntent pour le solde
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "eur",
      payment_method: course.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Solde course VTC - ${course.pickup_address} → ${course.destination_address}`,
      metadata: {
        course_id,
        driver_id: course.driver_id,
        type: "course_final_payment",
        total_amount: String(totalAmount),
        deposit_paid: String(depositPaid),
        remaining_amount: String(remainingAmount),
      },
      transfer_data: {
        destination: course.driver.stripe_connect_account_id,
      },
      application_fee_amount: remainingFee,
    };

    let paymentIntent: Stripe.PaymentIntent;
    
    try {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      logStep("PaymentIntent created", { 
        paymentIntentId: paymentIntent.id, 
        status: paymentIntent.status 
      });
    } catch (stripeError: any) {
      logStep("PaymentIntent creation failed", { error: stripeError.message });
      
      // Update course with failure
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: "failed",
          last_payment_error: stripeError.message,
          payment_retry_count: (course.payment_retry_count || 0) + 1,
        })
        .eq("id", course_id);

      throw new Error(`Échec du paiement: ${stripeError.message}`);
    }

    // Calculer les frais pour traçabilité
    const STRIPE_PERCENTAGE = 0.015;
    const STRIPE_FIXED_FEE = 0.25;
    const stripeFee = Math.round((totalAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
    const totalFees = SOLOCAB_FEE_CENTS / 100 + stripeFee;
    const netToDriver = Math.round((totalAmount - totalFees) * 100) / 100;

    // Traiter selon le statut du PaymentIntent
    if (paymentIntent.status === "succeeded") {
      // Paiement réussi !
      await supabaseClient
        .from("courses")
        .update({
          status: "completed",
          payment_status: "paid",
          final_payment_status: "succeeded",
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: remainingAmount,
          final_payment_at: new Date().toISOString(),
          payment_captured_at: new Date().toISOString(),
          // Traçabilité des frais
          solocab_fee_amount: SOLOCAB_FEE_CENTS / 100,
          stripe_fee_amount: stripeFee,
          total_fees_amount: totalFees,
          net_amount_to_driver: netToDriver,
        })
        .eq("id", course_id);

      // Créer l'enregistrement de transaction Stripe
      await supabaseClient
        .from("stripe_transactions")
        .insert({
          course_id,
          driver_id: course.driver_id,
          stripe_payment_intent_id: paymentIntent.id,
          transaction_type: depositPaid > 0 ? "final_payment" : "full_payment",
          gross_amount: totalAmount,
          stripe_fee_amount: stripeFee,
          solocab_fee_amount: SOLOCAB_FEE_CENTS / 100,
          net_amount: netToDriver,
          status: "succeeded",
          description: `Course finalisée - ${course.pickup_address} → ${course.destination_address}`,
        });

      // Record in unified payments table
      await supabaseClient.from("payments").insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: paymentIntent.latest_charge as string || null,
        amount: remainingAmount,
        captured_amount: remainingAmount,
        application_fee_amount: remainingFee / 100,
        stripe_fee_amount: stripeFee,
        net_to_driver: netToDriver,
        status: "succeeded",
        payment_type: depositPaid > 0 ? "final_payment" : "course_payment",
        capture_method: "automatic",
        captured_at: new Date().toISOString(),
        metadata: {
          total_amount: totalAmount,
          deposit_paid: depositPaid,
          remaining_amount: remainingAmount,
        },
      });

      // Créer la facture automatiquement
      await supabaseClient.functions.invoke("create-facture-auto", {
        body: { course_id }
      });

      // Notifier le chauffeur avec détail des frais
      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "💰 Paiement encaissé",
        message: `Paiement de ${remainingAmount.toFixed(2)}€ encaissé. Net après frais: ${netToDriver.toFixed(2)}€`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });

      // Notifier le client
      if (course.client?.user_id) {
        await supabaseClient.from("notifications").insert({
          user_id: course.client.user_id,
          title: "✅ Paiement confirmé",
          message: `Votre paiement de ${remainingAmount.toFixed(2)}€ a été effectué avec succès.`,
          type: "info",
        });
      }

      logStep("Payment succeeded", { 
        amount: remainingAmount, 
        stripeFee, 
        solocabFee: SOLOCAB_FEE_CENTS / 100,
        netToDriver 
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: "succeeded",
          payment_intent_id: paymentIntent.id,
          amount_charged: remainingAmount,
          fees: {
            stripe_fee: stripeFee,
            solocab_fee: SOLOCAB_FEE_CENTS / 100,
            total_fees: totalFees,
            net_to_driver: netToDriver,
          },
          message: "Paiement encaissé avec succès",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else if (paymentIntent.status === "requires_action") {
      // Authentication 3D Secure requise
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: "requires_action",
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: remainingAmount,
        })
        .eq("id", course_id);

      logStep("Payment requires authentication", { 
        paymentIntentId: paymentIntent.id 
      });

      return new Response(
        JSON.stringify({
          success: false,
          status: "requires_action",
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          message: "Authentification 3D Secure requise par le client",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else {
      // Autre statut (processing, etc.)
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: paymentIntent.status,
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: remainingAmount,
        })
        .eq("id", course_id);

      logStep("Payment in progress", { status: paymentIntent.status });

      return new Response(
        JSON.stringify({
          success: true,
          status: paymentIntent.status,
          payment_intent_id: paymentIntent.id,
          message: "Paiement en cours de traitement",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
