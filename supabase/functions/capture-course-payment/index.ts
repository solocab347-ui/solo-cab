import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course (cash ou carte)
const STRIPE_PERCENTAGE = 0.015;
const STRIPE_FIXED_FEE = 0.25;

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
    
    // Use a user-context client to validate the token
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");

    const { course_id, amount_to_capture } = await req.json();
    if (!course_id) throw new Error("course_id required");

    logStep("Capture request", { course_id, amount_to_capture, userId: user.id });

    // Get course with payment intent
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, user_id, company_name,
          stripe_connect_account_id, stripe_connect_charges_enabled
        ),
        client:clients!courses_client_id_fkey(id, user_id)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Verify caller is the driver
    if (course.driver.user_id !== user.id) {
      throw new Error("Unauthorized: only the course driver can capture payment");
    }

    // Verify Stripe Connect is active
    if (!course.driver.stripe_connect_account_id || !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Stripe Connect non configuré ou désactivé pour ce chauffeur");
    }

    if (!course.stripe_payment_intent_id && !course.stripe_hold_payment_intent_id) {
      // Search Stripe for any uncaptured PI linked to this course
      logStep("No PI on course record — searching Stripe for orphaned PI", { course_id });
      try {
        const searchResults = await stripe.paymentIntents.search({
          query: `metadata["course_id"]:"${course_id}" status:"requires_capture"`,
          limit: 1,
        });

        if (searchResults.data.length > 0) {
          const orphanedPI = searchResults.data[0];
          logStep("Found orphaned PI, will capture it", { piId: orphanedPI.id });
          
          // Update course record with the found PI
          await supabaseClient.from("courses").update({
            stripe_payment_intent_id: orphanedPI.id,
            stripe_hold_payment_intent_id: orphanedPI.id,
            card_hold_status: "confirmed",
          }).eq("id", course_id);
          
          // Continue to capture below with this PI
          course.stripe_payment_intent_id = orphanedPI.id;
          course.stripe_hold_payment_intent_id = orphanedPI.id;
        }
      } catch (searchError: any) {
        logStep("Stripe PI search failed", { error: searchError.message });
      }
    }

    if (!course.stripe_payment_intent_id && !course.stripe_hold_payment_intent_id) {
      // No payment intent found anywhere → complete as manual/cash payment
      logStep("No payment intent found anywhere — completing as manual payment", { course_id });

      const paymentMethod = course.payment_method || course.payment_method_requested || "cash";
      const isCash = paymentMethod === "Espèces" || paymentMethod === "cash";
      const totalAmount = course.final_payment_amount || course.guest_estimated_price || 0;

      // Commission SoloCab: 0.50€ par course (cash ou carte)
      const solocabFeeCents = SOLOCAB_FEE_CENTS;
      const solocabFee = solocabFeeCents / 100;
      const netToDriver = Math.max(0, Math.round((totalAmount - solocabFee) * 100) / 100);

      await supabaseClient
        .from("courses")
        .update({
          status: "completed",
          payment_status: isCash ? "paid" : "pending_manual",
          final_payment_status: isCash ? "succeeded" : "pending_manual",
          final_payment_amount: totalAmount,
          course_finalized_by_driver_at: new Date().toISOString(),
          solocab_fee_amount: solocabFee,
          stripe_fee_amount: 0,
          total_fees_amount: solocabFee,
          net_amount_to_driver: netToDriver,
        })
        .eq("id", course_id);

      // Unified source of truth: payments table — use "succeeded" so trigger fires
      try {
        await supabaseClient.from("payments").insert({
          course_id,
          driver_id: course.driver_id,
          client_id: course.client_id,
          amount: totalAmount,
          captured_amount: totalAmount,
          application_fee_amount: solocabFee,
          stripe_fee_amount: 0,
          net_to_driver: netToDriver,
          status: "succeeded",
          payment_type: "course_payment",
          capture_method: "manual",
          payment_method: isCash ? "cash" : paymentMethod,
          captured_at: new Date().toISOString(),
          metadata: {
            flow: isCash ? "cash_manual" : "stripe_manual_tpe",
            course_id,
          },
        });
      } catch (paymentErr: any) {
        logStep("Unified payment record creation failed", { error: paymentErr.message });
      }

      // Create invoice
      try {
        await supabaseClient.functions.invoke("create-facture-auto", { body: { course_id } });
      } catch (e) {
        logStep("Facture creation failed (non-blocking)", { error: String(e) });
      }

      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "✅ Course terminée",
        message: isCash
          ? `Course de ${totalAmount.toFixed(2)}€ terminée — paiement espèces. Frais: ${solocabFee.toFixed(2)}€`
          : `Course de ${totalAmount.toFixed(2)}€ terminée — encaissez via TPE.`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });

      return new Response(
        JSON.stringify({ success: true, status: "completed", flow: "manual", amount: totalAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const paymentIntentId = course.stripe_payment_intent_id || course.stripe_hold_payment_intent_id;

    // ═══ IDEMPOTENCY GUARD: Vérifier si déjà capturé ═══
    if (course.payment_status === "paid" && course.payment_captured_at) {
      logStep("⚠️ Payment already captured — skipping duplicate capture", { 
        course_id, 
        paymentIntentId,
        capturedAt: course.payment_captured_at 
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          already_captured: true,
          message: "Paiement déjà capturé",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Capturing payment intent", { paymentIntentId });

    // ═══ ARRIÉRÉS CASH : Récupérer les frais SoloCab des courses cash impayées ═══
    // On retrieve toutes les lignes driver_balance_pending de type 'cash' status='pending'
    // antérieures à cette capture, pour les soldes via cette CB.
    const { data: pendingCashRows } = await supabaseClient
      .from("driver_balance_pending")
      .select("id, course_id, solocab_fee, created_at")
      .eq("driver_id", course.driver_id)
      .eq("payment_type", "cash")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const arrearsTotalCents = (pendingCashRows || []).reduce(
      (sum, r) => sum + Math.round((Number(r.solocab_fee) || 0) * 100),
      0
    );
    logStep("Cash arrears found", {
      count: pendingCashRows?.length || 0,
      arrearsCents: arrearsTotalCents,
    });

    // Pré-calcul du montant à capturer pour borner application_fee
    const captureAmountCents = amount_to_capture
      ? Math.round(amount_to_capture * 100)
      : Math.round((course.final_payment_amount || course.guest_estimated_price || 0) * 100);

    // Estimation des frais Stripe pour borner application_fee (Stripe exige : app_fee ≤ amount - stripe_fee)
    const estimatedStripeFeeCents = Math.ceil(captureAmountCents * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE * 100);
    const maxApplicationFeeCents = Math.max(0, captureAmountCents - estimatedStripeFeeCents);

    // Frais SoloCab souhaités : 0,50€ (course en cours) + arriérés cash
    const desiredApplicationFeeCents = SOLOCAB_FEE_CENTS + arrearsTotalCents;
    const finalApplicationFeeCents = Math.min(desiredApplicationFeeCents, maxApplicationFeeCents);
    const arrearsRecoveredCents = Math.max(0, finalApplicationFeeCents - SOLOCAB_FEE_CENTS);

    logStep("Application fee computation", {
      desiredCents: desiredApplicationFeeCents,
      maxCents: maxApplicationFeeCents,
      finalCents: finalApplicationFeeCents,
      arrearsRecoveredCents,
    });

    // Capture the payment with custom application_fee_amount
    const captureParams: Record<string, unknown> = {
      application_fee_amount: finalApplicationFeeCents,
    };
    if (amount_to_capture) {
      captureParams.amount_to_capture = captureAmountCents;
    }
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, captureParams as any);

    const capturedAmount = paymentIntent.amount_received / 100;

    // Calculate fees (aligned with finalize-course-payment)
    const stripeFee = Math.round((capturedAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
    const solocabFee = finalApplicationFeeCents / 100; // Inclut éventuels arriérés
    const totalFees = stripeFee + solocabFee;
    // CRITICAL: Ensure driver never receives negative amount
    const netToDriver = Math.max(0, Math.round((capturedAmount - totalFees) * 100) / 100);

    logStep("Payment captured", { 
      status: paymentIntent.status,
      capturedAmount,
      stripeFee,
      solocabFee,
      netToDriver,
    });

    // Update course status with full fee breakdown
    await supabaseClient
      .from("courses")
      .update({
        payment_status: "paid",
        payment_captured_at: new Date().toISOString(),
        status: "completed",
        solocab_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
      })
      .eq("id", course_id);

    // Record in payments table (idempotent — unique index prevents duplicates)
    const { data: insertedPayment, error: payErr } = await supabaseClient
      .from("payments")
      .insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: (paymentIntent.latest_charge as string) || null,
        amount: capturedAmount,
        captured_amount: capturedAmount,
        application_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
        net_to_driver: netToDriver,
        status: "captured",
        payment_type: "course_payment",
        capture_method: "manual",
        payment_method: "card",
        captured_at: new Date().toISOString(),
        metadata: arrearsRecoveredCents > 0
          ? { arrears_recovered_eur: arrearsRecoveredCents / 100, arrears_count: pendingCashRows?.length || 0 }
          : undefined,
      })
      .select("id")
      .maybeSingle();
    if (payErr?.code === "23505") {
      logStep("Payment already recorded (duplicate prevented)", { course_id });
    }

    // ═══ MARQUER LES ARRIÉRÉS CASH SOLDÉS via cette CB ═══
    if (arrearsRecoveredCents > 0 && pendingCashRows && pendingCashRows.length > 0) {
      let remainingCents = arrearsRecoveredCents;
      const idsToSettle: string[] = [];
      for (const row of pendingCashRows) {
        const rowCents = Math.round((Number(row.solocab_fee) || 0) * 100);
        if (rowCents <= remainingCents) {
          idsToSettle.push(row.id);
          remainingCents -= rowCents;
          if (remainingCents <= 0) break;
        }
      }
      if (idsToSettle.length > 0) {
        const { error: settleErr } = await supabaseClient
          .from("driver_balance_pending")
          .update({
            status: "settled",
            settled_at: new Date().toISOString(),
            settled_via_payment_id: insertedPayment?.id ?? null,
            settled_via_course_id: course_id,
          })
          .in("id", idsToSettle);
        if (settleErr) {
          logStep("Failed to mark cash arrears settled", { error: settleErr.message, ids: idsToSettle });
        } else {
          logStep("Cash arrears settled via card capture", {
            count: idsToSettle.length,
            recoveredEur: arrearsRecoveredCents / 100,
          });
        }
      }
    }

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
      await supabaseClient.functions.invoke("create-facture-auto", {
        body: { course_id }
      });
    }

    // Notify driver with fee breakdown (incl. arrears recovery message)
    const arrearsMsg = arrearsRecoveredCents > 0
      ? ` (dont ${(arrearsRecoveredCents / 100).toFixed(2)}€ de frais antécédents récupérés)`
      : "";
    await supabaseClient.from("notifications").insert({
      user_id: course.driver.user_id,
      title: "💰 Paiement encaissé",
      message: `${capturedAmount.toFixed(2)}€ encaissé. Net après frais: ${netToDriver.toFixed(2)}€${arrearsMsg}`,
      type: "info",
    });

    // Notify client
    if (course.client?.user_id) {
      await supabaseClient.from("notifications").insert({
        user_id: course.client.user_id,
        title: "✅ Paiement confirmé",
        message: `Votre paiement de ${capturedAmount.toFixed(2)}€ a été effectué avec succès.`,
        type: "info",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        amount_captured: capturedAmount,
        payment_intent_id: paymentIntent.id,
        fees: {
          stripe_fee: stripeFee,
          solocab_fee: solocabFee,
          total_fees: totalFees,
          net_to_driver: netToDriver,
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
