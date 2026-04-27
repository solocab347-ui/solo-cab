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
  console.log(`[FINALIZE-COURSE-PAYMENT] ${step}${detailsStr}`);
};

/**
 * Calcule le montant total des frais SoloCab à prélever sur cette CB :
 * 0,50€ (course en cours) + arriérés cash en attente, borné par capacité de la course.
 *
 * Les arriérés sont la SOMME de deux sources :
 *  1. driver_balance_pending status='pending' (entries non encore agrégées)
 *  2. drivers.cash_debt_pending (dette consolidée par process-weekly-settlement)
 * On retourne aussi la liste des rows à solder + le montant à décrémenter
 * de drivers.cash_debt_pending.
 */
const computeApplicationFeeWithArrears = async (
  supabaseClient: any,
  driverId: string,
  captureAmountCents: number,
): Promise<{
  finalFeeCents: number;
  arrearsRecoveredCents: number;
  rowsToSettle: Array<{ id: string; cents: number }>;
  totalArrearsCents: number;
  consolidatedDebtToReduceCents: number;
}> => {
  const [{ data: pendingCashRows }, { data: driverRow }] = await Promise.all([
    supabaseClient
      .from("driver_balance_pending")
      .select("id, solocab_fee, created_at")
      .eq("driver_id", driverId)
      .eq("payment_type", "cash")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabaseClient
      .from("drivers")
      .select("cash_debt_pending")
      .eq("id", driverId)
      .single(),
  ]);

  const rows = (pendingCashRows || []).map((r: any) => ({
    id: r.id as string,
    cents: Math.round((Number(r.solocab_fee) || 0) * 100),
  }));
  const pendingRowsCents = rows.reduce((s, r) => s + r.cents, 0);
  const consolidatedDebtCents = Math.max(
    0,
    Math.round((Number(driverRow?.cash_debt_pending) || 0) * 100),
  );
  const totalArrearsCents = pendingRowsCents + consolidatedDebtCents;

  const estimatedStripeFeeCents = Math.ceil(captureAmountCents * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE * 100);
  const maxApplicationFeeCents = Math.max(0, captureAmountCents - estimatedStripeFeeCents);
  const desiredCents = SOLOCAB_FEE_CENTS + totalArrearsCents;
  const finalFeeCents = Math.min(desiredCents, maxApplicationFeeCents);
  const arrearsRecoveredCents = Math.max(0, finalFeeCents - SOLOCAB_FEE_CENTS);

  // Priorité 1 : éponger les rows pending dans l'ordre chronologique
  const rowsToSettle: Array<{ id: string; cents: number }> = [];
  let remaining = arrearsRecoveredCents;
  for (const r of rows) {
    if (r.cents <= remaining) {
      rowsToSettle.push(r);
      remaining -= r.cents;
      if (remaining <= 0) break;
    }
  }
  // Priorité 2 : tout ce qui n'a pas été utilisé pour les rows pending
  // décrémente la dette consolidée (drivers.cash_debt_pending).
  const consolidatedDebtToReduceCents = Math.min(consolidatedDebtCents, remaining);

  return {
    finalFeeCents,
    arrearsRecoveredCents,
    rowsToSettle,
    totalArrearsCents,
    consolidatedDebtToReduceCents,
  };
};

/**
 * Marque les lignes driver_balance_pending comme soldées + décrémente
 * drivers.cash_debt_pending si la dette consolidée a été partiellement épongée.
 */
const settleArrears = async (
  supabaseClient: any,
  rowIds: string[],
  paymentId: string | null,
  courseId: string,
  driverId?: string,
  consolidatedDebtToReduceCents?: number,
): Promise<void> => {
  if (rowIds.length > 0) {
    const { error } = await supabaseClient
      .from("driver_balance_pending")
      .update({
        status: "settled",
        settled_at: new Date().toISOString(),
        settled_via_payment_id: paymentId,
        settled_via_course_id: courseId,
      })
      .in("id", rowIds);
    if (error) {
      logStep("Failed to settle cash arrears", { error: error.message, ids: rowIds });
    } else {
      logStep("Cash arrears settled via card payment", { count: rowIds.length });
    }
  }

  if (driverId && consolidatedDebtToReduceCents && consolidatedDebtToReduceCents > 0) {
    const { data: current } = await supabaseClient
      .from("drivers")
      .select("cash_debt_pending")
      .eq("id", driverId)
      .single();
    const currentCents = Math.round((Number(current?.cash_debt_pending) || 0) * 100);
    const newCents = Math.max(0, currentCents - consolidatedDebtToReduceCents);
    const newEur = newCents / 100;
    const { error: updErr } = await supabaseClient
      .from("drivers")
      .update({ cash_debt_pending: newEur })
      .eq("id", driverId);
    if (updErr) {
      logStep("Failed to decrement consolidated cash debt", { error: updErr.message, driverId });
    } else {
      logStep("Consolidated cash debt decremented", {
        driverId,
        reducedEur: consolidatedDebtToReduceCents / 100,
        newDebtEur: newEur,
      });
    }
  }
};

const isRelevantOperationalCourse = (course: { scheduled_date?: string | null; status?: string | null; updated_at?: string | null; created_at?: string | null }) => {
  if (course.status === "in_progress") return true;

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);
  const scheduledDate = course.scheduled_date ? new Date(course.scheduled_date) : null;

  if (scheduledDate && scheduledDate < todayStart) return false;

  // Immediate courses older than 24h are stale/orphaned
  if (!scheduledDate) {
    const lastActivity = new Date(course.updated_at || course.created_at || 0).getTime();
    if (lastActivity < Date.now() - DAY_MS) return false;
  }

  return !scheduledDate || scheduledDate < todayEnd;
};

/**
 * Release the finalization lock by resetting final_payment_status from 'processing' to 'failed'.
 * Used when a Stripe operation fails so the next driver retry can proceed immediately
 * instead of waiting 30s for the auto-recovery window.
 */
const releaseLock = async (
  supabaseClient: any,
  courseId: string,
  errorMessage?: string,
) => {
  try {
    // Try the RPC first (preferred — bumps retry counter)
    const { error: rpcErr } = await supabaseClient.rpc("release_course_finalization_lock", {
      p_course_id: courseId,
      p_error_message: errorMessage ?? null,
    });
    if (rpcErr) {
      // Fallback: direct UPDATE (works even if migration not yet applied)
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: "failed",
          last_payment_error: errorMessage ?? null,
        })
        .eq("id", courseId)
        .eq("final_payment_status", "processing");
    }
  } catch (_e) {
    // Non-blocking — last resort direct update
    await supabaseClient
      .from("courses")
      .update({ final_payment_status: "failed", last_payment_error: errorMessage ?? null })
      .eq("id", courseId)
      .eq("final_payment_status", "processing");
  }
};

const syncDriverStatusAfterFinalization = async (supabaseClient: any, driverId: string) => {
  const { data: activeCourses, error } = await supabaseClient
    .from("courses")
    .select("status, scheduled_date, updated_at, created_at")
    .eq("driver_id", driverId)
    .in("status", ["accepted", "driver_approaching", "driver_arrived", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    logStep("Driver sync skipped: active course lookup failed", { driverId, error: error.message });
    return;
  }

  const relevantCourses = ((activeCourses || []) as any[]).filter(isRelevantOperationalCourse);
  const nextStatus = relevantCourses.some((course: any) => course.status === "in_progress")
    ? "in_ride"
    : relevantCourses.some((course: any) => ["accepted", "driver_approaching", "driver_arrived"].includes(course.status))
      ? "assigned"
      : "online";

  await supabaseClient
    .from("drivers")
    .update({
      driver_status: nextStatus,
      is_available_now: nextStatus === "online",
      ...(nextStatus === "online" ? { last_location_update: new Date().toISOString() } : {}),
    })
    .eq("id", driverId);

  logStep("Driver status synchronized after course finalization", {
    driverId,
    nextStatus,
    relevantCourseCount: relevantCourses.length,
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let acquiredLockCourseId: string | null = null;

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

    // ═══════════════════════════════════════════════════════════════
    // ATOMIC LOCK: Prevent race condition on concurrent finalization
    // Uses FOR UPDATE NOWAIT in the database to ensure only one
    // process can finalize a course at a time.
    // ═══════════════════════════════════════════════════════════════
    const { data: lockResult, error: lockError } = await supabaseClient
      .rpc("atomic_start_course_finalization", {
        p_course_id: course_id,
        p_driver_user_id: userData.user.id,
      });

    if (lockError) {
      logStep("Lock RPC error", { lockError });
      throw new Error("Erreur serveur lors de la finalisation");
    }

    if (!lockResult?.success) {
      logStep("Lock denied", { result: lockResult });
      // Transient = double-click / concurrent attempt. Tell the UI to retry softly.
      const isTransient = !!lockResult?.transient || !!lockResult?.locked;
      return new Response(
        JSON.stringify({ 
          success: false, 
          transient: isTransient,
          retry_in_sec: lockResult?.retry_in_sec ?? (isTransient ? 3 : null),
          error: lockResult?.error || "Finalisation impossible",
          status: lockResult?.status || "unknown",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: isTransient ? 202 : 409 }
      );
    }

    // Lock acquired — track for release on unexpected errors
    if (lockResult.can_proceed) {
      acquiredLockCourseId = course_id;
    }

    // Already finalized (idempotent)
    if (lockResult.already_done) {
      logStep("Already finalized (idempotent return)", { status: lockResult.status });

      if (lockResult.status === "already_captured") {
        // Complete the course if not already
        await supabaseClient
          .from("courses")
          .update({
            status: "completed",
            final_payment_status: "succeeded",
            course_finalized_by_driver_at: new Date().toISOString(),
          })
          .eq("id", course_id);

        try {
          await supabaseClient.functions.invoke("create-facture-auto", { body: { course_id } });
        } catch (e) {
          logStep("Facture creation failed (non-blocking)", { error: String(e) });
        }

          await syncDriverStatusAfterFinalization(supabaseClient, lockResult.driver_id || course_id);
      }

      return new Response(
        JSON.stringify({ success: true, already_paid: true, message: "Paiement déjà finalisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get course with all payment info (lock already acquired)
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(
          id, user_id, company_name,
          stripe_connect_account_id, stripe_connect_charges_enabled
        ),
        client:clients!courses_client_id_fkey(id, user_id),
        devis:devis(id, amount, status)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Vérifier que le chauffeur utilise Stripe Connect
    if (!course.driver.stripe_connect_account_id || !course.driver.stripe_connect_charges_enabled) {
      throw new Error("Stripe Connect non configuré pour ce chauffeur");
    }

    // Calculer le montant total
    const acceptedDevis = course.devis?.find((d: any) => d.status === 'accepted');
    const totalAmount = course.final_payment_amount || acceptedDevis?.amount || course.guest_estimated_price || 0;

    if (totalAmount <= 0) {
      throw new Error("Montant de la course invalide (0€)");
    }

    logStep("Processing final payment", { totalAmount });

    // ═══════════════════════════════════════════════════════════════
    // FLUX PRINCIPAL: CAPTURE de l'empreinte bancaire existante
    // Check BOTH stripe_hold_payment_intent_id AND stripe_payment_intent_id
    // ═══════════════════════════════════════════════════════════════
    
    const holdPiId = course.stripe_hold_payment_intent_id || 
      (course.card_hold_status === "confirmed" ? course.stripe_payment_intent_id : null);

    if (holdPiId && course.card_hold_status === "confirmed") {
      logStep("Capturing existing hold (Authorize → Capture flow)", {
        holdPiId,
      });

      try {
        // Retrieve the existing PaymentIntent to verify status
        const existingPI = await stripe.paymentIntents.retrieve(holdPiId);

        if (existingPI.status === "requires_capture") {
          // CAPTURE the full amount (or adjusted amount if different)
          const captureAmountCents = Math.min(Math.round(totalAmount * 100), existingPI.amount);

          // Calcul application_fee avec arriérés cash
          const arrears = await computeApplicationFeeWithArrears(
            supabaseClient,
            course.driver_id,
            captureAmountCents,
          );
          logStep("Capture: arrears computation", {
            totalArrearsCents: arrears.totalArrearsCents,
            arrearsRecoveredCents: arrears.arrearsRecoveredCents,
            finalFeeCents: arrears.finalFeeCents,
          });

          const captured = await stripe.paymentIntents.capture(holdPiId, {
            amount_to_capture: captureAmountCents,
            application_fee_amount: arrears.finalFeeCents,
          });

          logStep("✅ Hold captured successfully", {
            piId: captured.id,
            amountCaptured: captured.amount_received,
            status: captured.status,
            applicationFeeCents: arrears.finalFeeCents,
          });

          // Calculer les frais pour traçabilité
          const stripeFee = Math.round((totalAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
          const solocabFee = arrears.finalFeeCents / 100; // Inclut éventuels arriérés
          const totalFees = solocabFee + stripeFee;
          const netToDriver = Math.max(0, Math.round((totalAmount - totalFees) * 100) / 100);

          // Update course
          await supabaseClient
            .from("courses")
            .update({
              status: "completed",
              payment_status: "paid",
              final_payment_status: "succeeded",
              final_payment_intent_id: captured.id,
              final_payment_amount: totalAmount,
              final_payment_at: new Date().toISOString(),
              payment_captured_at: new Date().toISOString(),
              solocab_fee_amount: solocabFee,
              stripe_fee_amount: stripeFee,
              total_fees_amount: totalFees,
              net_amount_to_driver: netToDriver,
            })
            .eq("id", course_id);

          // Record in unified payments table (idempotent — unique index prevents duplicates)
          const { data: insertedPayment, error: payInsertErr } = await supabaseClient
            .from("payments")
            .insert({
              course_id,
              driver_id: course.driver_id,
              client_id: course.client_id,
              stripe_payment_intent_id: captured.id,
              stripe_charge_id: (captured.latest_charge as string) || null,
              amount: totalAmount,
              captured_amount: totalAmount,
              application_fee_amount: solocabFee,
              stripe_fee_amount: stripeFee,
              net_to_driver: netToDriver,
              status: "succeeded",
              payment_type: "course_capture",
              capture_method: "manual",
              payment_method: "card",
              captured_at: new Date().toISOString(),
              metadata: {
                hold_payment_intent_id: holdPiId,
                total_amount: totalAmount,
                flow: "authorize_then_capture",
                arrears_recovered_eur: arrears.arrearsRecoveredCents / 100,
                arrears_count: arrears.rowsToSettle.length,
              },
            })
            .select("id")
            .maybeSingle();
          if (payInsertErr?.code === "23505") {
            logStep("Payment already recorded (duplicate prevented)", { course_id });
          } else if (payInsertErr) {
            logStep("Payment insert error (non-blocking)", { error: payInsertErr.message });
          }

          // Solder les arriérés cash si récupérés
          await settleArrears(
            supabaseClient,
            arrears.rowsToSettle.map((r) => r.id),
            insertedPayment?.id ?? null,
            course_id,
            course.driver_id,
            arrears.consolidatedDebtToReduceCents,
          );

          // Créer la facture automatiquement
          try {
            await supabaseClient.functions.invoke("create-facture-auto", {
              body: { course_id },
            });
          } catch (factureErr) {
            logStep("Warning: facture creation failed", { error: String(factureErr) });
          }

          // Notifier le chauffeur
          await supabaseClient.from("notifications").insert({
            user_id: course.driver.user_id,
            title: "💰 Paiement encaissé",
            message: `${totalAmount.toFixed(2)}€ capturé. Net après frais: ${netToDriver.toFixed(2)}€`,
            type: "info",
            link: "/driver-dashboard?tab=courses",
          });

          // Notifier le client
          if (course.client?.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: course.client.user_id,
              title: "✅ Paiement confirmé",
              message: `Votre paiement de ${totalAmount.toFixed(2)}€ a été effectué.`,
              type: "info",
            });
          }

          await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);

          return new Response(
            JSON.stringify({
              success: true,
              status: "succeeded",
              flow: "capture",
              payment_intent_id: captured.id,
              amount_charged: totalAmount,
              fees: {
                stripe_fee: stripeFee,
                solocab_fee: solocabFee,
                total_fees: totalFees,
                net_to_driver: netToDriver,
              },
              message: "Paiement capturé avec succès",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );

        } else if (existingPI.status === "succeeded") {
          // Already captured somehow
          logStep("Hold already captured", { status: existingPI.status });
          
          await supabaseClient
            .from("courses")
            .update({
              status: "completed",
              payment_status: "paid",
              final_payment_status: "succeeded",
              payment_captured_at: new Date().toISOString(),
            })
            .eq("id", course_id);

          await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);

          return new Response(
            JSON.stringify({ success: true, already_paid: true, message: "Paiement déjà capturé" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );

        } else {
          // Hold in unexpected state (cancelled, etc.)
          logStep("Hold in unexpected state, falling through to new payment", { status: existingPI.status });
          // Fall through to create new payment below
        }
      } catch (captureError: any) {
        // CRITICAL: if the hold was actually captured but a side-effect failed,
        // we must NOT fall through to creating a new PaymentIntent (would double-charge).
        // Re-fetch the PI to check real status before deciding.
        try {
          const recheck = await stripe.paymentIntents.retrieve(holdPiId);
          if (recheck.status === "succeeded") {
            logStep("⚠️ Capture side-effect failed but PI is succeeded — finalizing safely", {
              piId: recheck.id,
              error: captureError.message,
            });
            await supabaseClient
              .from("courses")
              .update({
                status: "completed",
                payment_status: "paid",
                final_payment_status: "succeeded",
                payment_captured_at: new Date().toISOString(),
                final_payment_intent_id: recheck.id,
                final_payment_amount: totalAmount,
                final_payment_at: new Date().toISOString(),
              })
              .eq("id", course_id);
            await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);
            return new Response(
              JSON.stringify({
                success: true, already_paid: true,
                message: "Paiement encaissé (récupération automatique après erreur post-capture)",
                payment_intent_id: recheck.id,
                amount_charged: totalAmount,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
          }
        } catch (_recheckErr) {
          // Recheck failed too, fall through
        }
        logStep("Capture failed, falling through to new payment", { error: captureError.message });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // SAFETY NET: Search Stripe for any uncaptured PI linked to this course
    // (handles case where webhook didn't save the PI ID to the course record)
    // ═══════════════════════════════════════════════════════════════
    if (!course.stripe_payment_intent_id && !course.stripe_hold_payment_intent_id) {
      logStep("No PI on course record — searching Stripe for orphaned PI", { course_id });
      try {
        const searchResults = await stripe.paymentIntents.search({
          query: `metadata["course_id"]:"${course_id}" status:"requires_capture"`,
          limit: 1,
        });

        if (searchResults.data.length > 0) {
          const orphanedPI = searchResults.data[0];
          logStep("Found orphaned PI in Stripe!", { piId: orphanedPI.id, amount: orphanedPI.amount });

          // Capture it
          const captureAmountCents = Math.min(Math.round(totalAmount * 100), orphanedPI.amount);

          // Calcul application_fee avec arriérés cash
          const arrears = await computeApplicationFeeWithArrears(
            supabaseClient,
            course.driver_id,
            captureAmountCents,
          );

          const captured = await stripe.paymentIntents.capture(orphanedPI.id, {
            amount_to_capture: captureAmountCents,
            application_fee_amount: arrears.finalFeeCents,
          });

          const stripeFee = Math.round((totalAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
          const solocabFee = arrears.finalFeeCents / 100; // Inclut éventuels arriérés
          const totalFees = solocabFee + stripeFee;
          const netToDriver = Math.max(0, Math.round((totalAmount - totalFees) * 100) / 100);

          // Fix the course record
          await supabaseClient.from("courses").update({
            status: "completed",
            payment_status: "paid",
            final_payment_status: "succeeded",
            stripe_payment_intent_id: captured.id,
            stripe_hold_payment_intent_id: captured.id,
            card_hold_status: "captured",
            final_payment_intent_id: captured.id,
            final_payment_amount: totalAmount,
            final_payment_at: new Date().toISOString(),
            payment_captured_at: new Date().toISOString(),
            solocab_fee_amount: solocabFee,
            stripe_fee_amount: stripeFee,
            total_fees_amount: totalFees,
            net_amount_to_driver: netToDriver,
          }).eq("id", course_id);

          const { data: insertedOrphanPayment, error: orphanPayErr } = await supabaseClient
            .from("payments")
            .insert({
              course_id,
              driver_id: course.driver_id,
              client_id: course.client_id,
              stripe_payment_intent_id: captured.id,
              stripe_charge_id: (captured.latest_charge as string) || null,
              amount: totalAmount,
              captured_amount: totalAmount,
              application_fee_amount: solocabFee,
              stripe_fee_amount: stripeFee,
              net_to_driver: netToDriver,
              status: "succeeded",
              payment_type: "course_capture",
              capture_method: "manual",
              payment_method: "card",
              captured_at: new Date().toISOString(),
              metadata: {
                flow: "orphaned_pi_recovery",
                arrears_recovered_eur: arrears.arrearsRecoveredCents / 100,
                arrears_count: arrears.rowsToSettle.length,
              },
            })
            .select("id")
            .maybeSingle();
          if (orphanPayErr?.code === "23505") {
            logStep("Payment already recorded (duplicate prevented)", { course_id });
          }

          // Solder les arriérés cash si récupérés
          await settleArrears(
            supabaseClient,
            arrears.rowsToSettle.map((r) => r.id),
            insertedOrphanPayment?.id ?? null,
            course_id,
            course.driver_id,
            arrears.consolidatedDebtToReduceCents,
          );

          try {
            await supabaseClient.functions.invoke("create-facture-auto", { body: { course_id } });
          } catch (e) {
            logStep("Facture creation failed (non-blocking)", { error: String(e) });
          }

          await supabaseClient.from("notifications").insert({
            user_id: course.driver.user_id,
            title: "💰 Paiement encaissé",
            message: `${totalAmount.toFixed(2)}€ capturé. Net: ${netToDriver.toFixed(2)}€`,
            type: "info",
            link: "/driver-dashboard?tab=courses",
          });

          if (course.client?.user_id) {
            await supabaseClient.from("notifications").insert({
              user_id: course.client.user_id,
              title: "✅ Paiement confirmé",
              message: `Votre paiement de ${totalAmount.toFixed(2)}€ a été effectué.`,
              type: "info",
            });
          }

          await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);

          return new Response(
            JSON.stringify({
              success: true, status: "succeeded", flow: "orphaned_pi_recovery",
              payment_intent_id: captured.id, amount_charged: totalAmount,
              fees: { stripe_fee: stripeFee, solocab_fee: solocabFee, total_fees: totalFees, net_to_driver: netToDriver },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (searchError: any) {
        logStep("Stripe PI search failed (non-blocking)", { error: searchError.message });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FALLBACK: Pas d'empreinte ou capture échouée → nouveau PaymentIntent
    // (cas rare: hold expiré, annulé, ou course sans empreinte)
    // ═══════════════════════════════════════════════════════════════

    if (!course.stripe_payment_method_id) {
      // No card on file and no hold → complete as manual/cash payment
      logStep("No card and no hold — completing as manual payment", { course_id, totalAmount });

      const paymentMethod = course.payment_method || course.payment_method_requested || "cash";
      const isCash = paymentMethod === "cash" || paymentMethod === "Espèces";

      // Commission SoloCab: 0.50€ par course (cash ou carte)
      const solocabFeeCents = SOLOCAB_FEE_CENTS;
      const solocabFee = solocabFeeCents / 100;
      const stripeFee = 0; // No Stripe fees for manual payments
      const totalFees = solocabFee;
      const netToDriver = Math.max(0, Math.round((totalAmount - totalFees) * 100) / 100);

      await supabaseClient
        .from("courses")
        .update({
          status: "completed",
          payment_status: isCash ? "paid" : "pending_manual",
          final_payment_status: isCash ? "succeeded" : "pending_manual",
          final_payment_amount: totalAmount,
          course_finalized_by_driver_at: new Date().toISOString(),
          solocab_fee_amount: solocabFee,
          stripe_fee_amount: stripeFee,
          total_fees_amount: totalFees,
          net_amount_to_driver: netToDriver,
        })
        .eq("id", course_id);

      // Record in payments table (idempotent — unique index prevents duplicates)
      const { error: cashPayErr } = await supabaseClient.from("payments").insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        amount: totalAmount,
        captured_amount: totalAmount,
        application_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
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
      if (cashPayErr?.code === "23505") {
        logStep("Payment already recorded (duplicate prevented)", { course_id });
      } else if (cashPayErr) {
        logStep("Payment insert error (non-blocking)", { error: cashPayErr.message });
      }

      // stripe_transactions, driver_balance_pending, and solo_admin_ledger
      // are automatically populated by the sync_financial_records_from_payment trigger on payments
      logStep("Payment recorded — trigger will sync financial ledgers", { course_id, totalAmount });

      // Create facture
      try {
        await supabaseClient.functions.invoke("create-facture-auto", { body: { course_id } });
      } catch (e) {
        logStep("Facture creation failed (non-blocking)", { error: String(e) });
      }

      // Notify driver
      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "✅ Course terminée",
        message: isCash
          ? `Course de ${totalAmount.toFixed(2)}€ terminée — paiement en espèces. Frais: ${solocabFee.toFixed(2)}€`
          : `Course de ${totalAmount.toFixed(2)}€ terminée — encaissement par lien de paiement requis.`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });

      await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          flow: "manual",
          amount: totalAmount,
          payment_method: paymentMethod,
          fees: { solocab_fee: solocabFee, collection: "deferred" },
          message: isCash
            ? "Course terminée — paiement espèces"
            : "Course terminée — encaissement manuel requis",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Fallback: creating new PaymentIntent (no valid hold)");

    const amountCents = Math.round(totalAmount * 100);

    // Calcul application_fee avec arriérés cash (avant création du PI)
    const fbArrears = await computeApplicationFeeWithArrears(
      supabaseClient,
      course.driver_id,
      amountCents,
    );
    logStep("Fallback: arrears computation", {
      totalArrearsCents: fbArrears.totalArrearsCents,
      arrearsRecoveredCents: fbArrears.arrearsRecoveredCents,
      finalFeeCents: fbArrears.finalFeeCents,
    });

    const paymentIntentParams: any = {
      amount: amountCents,
      currency: "eur",
      payment_method: course.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Course VTC - ${course.pickup_address} → ${course.destination_address}`,
      // DESTINATION CHARGES: Funds go directly to driver
      transfer_data: {
        destination: course.driver.stripe_connect_account_id,
      },
      on_behalf_of: course.driver.stripe_connect_account_id,
      application_fee_amount: fbArrears.finalFeeCents,
      metadata: {
        course_id,
        driver_id: course.driver_id,
        type: "course_final_payment",
        flow: "fallback_new_pi",
        solocab_fee: (fbArrears.finalFeeCents / 100).toFixed(2),
        arrears_recovered_eur: (fbArrears.arrearsRecoveredCents / 100).toFixed(2),
      },
    };

    if (course.stripe_customer_id) {
      paymentIntentParams.customer = course.stripe_customer_id;
    }

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      logStep("Fallback PaymentIntent created", { piId: paymentIntent.id, status: paymentIntent.status });
    } catch (stripeError: any) {
      logStep("Fallback PaymentIntent creation failed", { error: stripeError.message });
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

    // Calculer les frais (utilise constants globales)
    const stripeFee = Math.round((totalAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
    const fbSolocabFee = fbArrears.finalFeeCents / 100;
    const totalFees = fbSolocabFee + stripeFee;
    const netToDriver = Math.max(0, Math.round((totalAmount - totalFees) * 100) / 100);

    if (paymentIntent.status === "succeeded") {
      await supabaseClient
        .from("courses")
        .update({
          status: "completed",
          payment_status: "paid",
          final_payment_status: "succeeded",
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: totalAmount,
          final_payment_at: new Date().toISOString(),
          payment_captured_at: new Date().toISOString(),
          solocab_fee_amount: fbSolocabFee,
          stripe_fee_amount: stripeFee,
          total_fees_amount: totalFees,
          net_amount_to_driver: netToDriver,
        })
        .eq("id", course_id);

      const { data: insertedFbPayment, error: fbPayErr } = await supabaseClient
        .from("payments")
        .insert({
          course_id,
          driver_id: course.driver_id,
          client_id: course.client_id,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: (paymentIntent.latest_charge as string) || null,
          amount: totalAmount,
          captured_amount: totalAmount,
          application_fee_amount: fbSolocabFee,
          stripe_fee_amount: stripeFee,
          net_to_driver: netToDriver,
          status: "succeeded",
          payment_type: "course_payment",
          capture_method: "automatic",
          payment_method: "card",
          captured_at: new Date().toISOString(),
          metadata: {
            arrears_recovered_eur: fbArrears.arrearsRecoveredCents / 100,
            arrears_count: fbArrears.rowsToSettle.length,
          },
        })
        .select("id")
        .maybeSingle();
      if (fbPayErr?.code === "23505") {
        logStep("Payment already recorded (duplicate prevented)", { course_id });
      }

      // Solder les arriérés cash si récupérés
      await settleArrears(
        supabaseClient,
        fbArrears.rowsToSettle.map((r) => r.id),
        insertedFbPayment?.id ?? null,
        course_id,
        course.driver_id,
        fbArrears.consolidatedDebtToReduceCents,
      );

      try {
        await supabaseClient.functions.invoke("create-facture-auto", { body: { course_id } });
      } catch (e) {
        logStep("Facture creation failed (non-blocking)", { error: String(e) });
      }

      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "💰 Paiement encaissé",
        message: `${totalAmount.toFixed(2)}€ encaissé. Net: ${netToDriver.toFixed(2)}€`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });

      if (course.client?.user_id) {
        await supabaseClient.from("notifications").insert({
          user_id: course.client.user_id,
          title: "✅ Paiement confirmé",
          message: `Votre paiement de ${totalAmount.toFixed(2)}€ a été effectué.`,
          type: "info",
        });
      }

      await syncDriverStatusAfterFinalization(supabaseClient, course.driver_id);

      return new Response(
        JSON.stringify({
          success: true,
          status: "succeeded",
          flow: "fallback",
          payment_intent_id: paymentIntent.id,
          amount_charged: totalAmount,
          fees: { stripe_fee: stripeFee, solocab_fee: SOLOCAB_FEE_CENTS / 100, total_fees: totalFees, net_to_driver: netToDriver },
          message: "Paiement encaissé avec succès",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else if (paymentIntent.status === "requires_action") {
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: "requires_action",
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: totalAmount,
        })
        .eq("id", course_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "requires_action",
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          message: "Authentification 3D Secure requise",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      await supabaseClient
        .from("courses")
        .update({
          final_payment_status: paymentIntent.status,
          final_payment_intent_id: paymentIntent.id,
          final_payment_amount: totalAmount,
        })
        .eq("id", course_id);

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

    // Release the finalization lock so the next retry can proceed immediately
    if (acquiredLockCourseId) {
      await releaseLock(supabaseClient, acquiredLockCourseId, errorMessage);
    }

    return new Response(
      JSON.stringify({ error: errorMessage, transient: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
