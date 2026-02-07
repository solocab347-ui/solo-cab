import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Defaults selon le cahier des charges
const DEFAULT_CANCELLATION_FEE_NO_DEPOSIT = 10.00; // 10€ sans acompte
const DEFAULT_FREE_CANCELLATION_HOURS_NO_DEPOSIT = 2; // T-2h sans acompte
const DEFAULT_FREE_CANCELLATION_HOURS_WITH_DEPOSIT = 4; // T-4h avec acompte

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-CANCELLATION-FEE] ${step}${detailsStr}`);
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
      cancelled_by, // "driver" | "client" | "system"
      reason,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");
    if (!cancelled_by) throw new Error("cancelled_by required");
    if (!["driver", "client", "system"].includes(cancelled_by)) {
      throw new Error("cancelled_by must be 'driver', 'client', or 'system'");
    }

    logStep("Processing cancellation", { course_id, cancelled_by, reason });

    // Get course with driver and client info
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

    // Déterminer si la course a un acompte
    const hasDeposit = course.deposit_status === "paid" && course.deposit_amount > 0;

    logStep("Course found", { 
      status: course.status,
      cardHoldStatus: course.card_hold_status,
      depositStatus: course.deposit_status,
      depositAmount: course.deposit_amount,
      hasDeposit,
      scheduledDate: course.scheduled_date 
    });

    // Get cancellation config for driver
    const { data: config } = await supabaseClient
      .from("cancellation_fees_config")
      .select("*")
      .eq("driver_id", course.driver_id)
      .maybeSingle();

    // Appliquer les règles selon le type de course
    const freeCancellationHours = hasDeposit 
      ? (config?.free_cancellation_hours_with_deposit || DEFAULT_FREE_CANCELLATION_HOURS_WITH_DEPOSIT)
      : (config?.free_cancellation_hours_no_deposit || DEFAULT_FREE_CANCELLATION_HOURS_NO_DEPOSIT);
    
    const cancellationFee = hasDeposit 
      ? 0 // Avec acompte, l'acompte EST la pénalité
      : (config?.cancellation_fee_no_deposit || DEFAULT_CANCELLATION_FEE_NO_DEPOSIT);

    // Calculate hours until pickup
    const scheduledDate = new Date(course.scheduled_date);
    const now = new Date();
    const hoursUntilPickup = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    logStep("Time calculations", { 
      hoursUntilPickup, 
      freeCancellationHours,
      hasDeposit,
      cancellationFee
    });

    let shouldChargeFee = false;
    let feeAmount = 0;
    let shouldRefundDeposit = false;
    let depositForfeited = false;
    let refundResult = null;
    let chargeResult = null;
    let message = "";

    /*
     * RÈGLES D'ANNULATION - CAHIER DES CHARGES
     * 
     * ══════════════════════════════════════════════
     * AVEC ACOMPTE (fenêtre = T-4h)
     * ══════════════════════════════════════════════
     * 
     * 🔹 CHAUFFEUR ANNULE → Acompte remboursé au client (toujours)
     * 🔹 CLIENT ANNULE AVANT T-4h → Acompte remboursé, aucun frais
     * 🔹 CLIENT ANNULE APRÈS T-4h → Acompte conservé par le chauffeur (pas de débit supplémentaire)
     * 
     * ══════════════════════════════════════════════
     * SANS ACOMPTE (fenêtre = T-2h)
     * ══════════════════════════════════════════════
     * 
     * 🔹 CHAUFFEUR ANNULE → Aucun frais pour le client
     * 🔹 CLIENT ANNULE AVANT T-2h → Aucun frais
     * 🔹 CLIENT ANNULE APRÈS T-2h → Frais de 10€ via empreinte bancaire
     */

    if (cancelled_by === "driver") {
      // ═══════════════════════════════════════════════════════════════
      // ANNULATION PAR LE CHAUFFEUR → Toujours rembourser le client
      // ═══════════════════════════════════════════════════════════════
      shouldChargeFee = false;
      message = "Annulation par le chauffeur - aucun frais pour le client.";
      
      // Rembourser l'acompte si payé
      if (hasDeposit && course.deposit_stripe_payment_intent_id) {
        shouldRefundDeposit = true;
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(course.deposit_stripe_payment_intent_id);
          if (paymentIntent.latest_charge) {
            const chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge.id;

            refundResult = await stripe.refunds.create({
              charge: chargeId,
              reason: "requested_by_customer",
              metadata: {
                course_id,
                cancelled_by,
                reason: "Driver cancelled - full refund",
              },
            });
            logStep("Deposit refunded (driver cancelled)", { refundId: refundResult.id });
            message += ` Acompte de ${course.deposit_amount}€ remboursé.`;
          }
        } catch (refundError: any) {
          logStep("Deposit refund error", { error: refundError.message });
          message += " (Erreur lors du remboursement de l'acompte)";
        }
      }
      
    } else if (cancelled_by === "client") {
      // ═══════════════════════════════════════════════════════════════
      // ANNULATION PAR LE CLIENT
      // ═══════════════════════════════════════════════════════════════
      
      if (hasDeposit) {
        // ─────────────────────────────────────────────────────────────
        // COURSE AVEC ACOMPTE
        // ─────────────────────────────────────────────────────────────
        if (hoursUntilPickup > freeCancellationHours) {
          // AVANT T-4h → Remboursement de l'acompte
          shouldRefundDeposit = true;
          message = `Annulation client plus de ${freeCancellationHours}h avant - acompte remboursé.`;
          
          if (course.deposit_stripe_payment_intent_id) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(course.deposit_stripe_payment_intent_id);
              if (paymentIntent.latest_charge) {
                const chargeId = typeof paymentIntent.latest_charge === 'string' 
                  ? paymentIntent.latest_charge 
                  : paymentIntent.latest_charge.id;

                refundResult = await stripe.refunds.create({
                  charge: chargeId,
                  reason: "requested_by_customer",
                  metadata: {
                    course_id,
                    cancelled_by,
                    reason: "Client cancelled before deadline",
                  },
                });
                logStep("Deposit refunded (client cancelled early)", { refundId: refundResult.id });
              }
            } catch (refundError: any) {
              logStep("Deposit refund error", { error: refundError.message });
            }
          }
        } else {
          // APRÈS T-4h → Acompte conservé par le chauffeur
          depositForfeited = true;
          feeAmount = course.deposit_amount;
          message = `Annulation client moins de ${freeCancellationHours}h avant - l'acompte de ${course.deposit_amount}€ est conservé par le chauffeur.`;
          logStep("Deposit forfeited to driver", { amount: course.deposit_amount });
        }
        
      } else {
        // ─────────────────────────────────────────────────────────────
        // COURSE SANS ACOMPTE
        // ─────────────────────────────────────────────────────────────
        if (hoursUntilPickup > freeCancellationHours) {
          // AVANT T-2h → Aucun frais
          shouldChargeFee = false;
          message = `Annulation client plus de ${freeCancellationHours}h avant - aucun frais.`;
        } else {
          // APRÈS T-2h → Frais de 10€
          shouldChargeFee = true;
          feeAmount = cancellationFee;
          message = `Annulation client moins de ${freeCancellationHours}h avant - frais de ${feeAmount}€ appliqués.`;

          // Débiter via l'empreinte bancaire
          if (course.card_hold_status === "confirmed" && course.stripe_payment_method_id) {
            try {
              const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                amount: Math.round(feeAmount * 100),
                currency: "eur",
                payment_method: course.stripe_payment_method_id,
                confirm: true,
                off_session: true,
                description: `Frais d'annulation - Course VTC`,
                metadata: {
                  course_id,
                  type: "cancellation_fee",
                  cancelled_by,
                },
              };

              // Transfer to driver if Stripe Connect is configured
              if (course.driver?.stripe_connect_account_id) {
                paymentIntentParams.transfer_data = {
                  destination: course.driver.stripe_connect_account_id,
                };
              }

              const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

              chargeResult = paymentIntent;
              logStep("Cancellation fee charged", { 
                paymentIntentId: paymentIntent.id,
                amount: feeAmount 
              });
            } catch (chargeError: any) {
              logStep("Cancellation fee charge failed", { error: chargeError.message });
              message += " (échec du prélèvement)";
            }
          } else {
            logStep("No card hold available for charging fee");
            message += " (pas d'empreinte bancaire)";
          }
        }
      }
      
    } else if (cancelled_by === "system") {
      // ═══════════════════════════════════════════════════════════════
      // ANNULATION SYSTÈME → Toujours rembourser
      // ═══════════════════════════════════════════════════════════════
      shouldChargeFee = false;
      shouldRefundDeposit = true;
      message = "Annulation système - aucun frais, remboursement complet.";
      
      if (hasDeposit && course.deposit_stripe_payment_intent_id) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(course.deposit_stripe_payment_intent_id);
          if (paymentIntent.latest_charge) {
            const chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge.id;

            refundResult = await stripe.refunds.create({
              charge: chargeId,
              reason: "requested_by_customer",
              metadata: {
                course_id,
                cancelled_by,
                reason: "System cancelled",
              },
            });
          }
        } catch (refundError: any) {
          logStep("Deposit refund error", { error: refundError.message });
        }
      }
    }

    // Update course with cancellation info
    const updateData: Record<string, any> = {
      status: "cancelled",
      cancelled_by,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      hours_before_cancellation: hoursUntilPickup,
      cancellation_fee_amount: feeAmount,
      cancellation_fee_charged: shouldChargeFee && !!chargeResult,
    };

    if (chargeResult) {
      updateData.cancellation_fee_charged_at = new Date().toISOString();
      updateData.cancellation_fee_stripe_id = chargeResult.id;
    }

    if (shouldRefundDeposit && refundResult) {
      updateData.deposit_status = "refunded";
    } else if (depositForfeited) {
      updateData.deposit_status = "forfeited";
    }

    await supabaseClient
      .from("courses")
      .update(updateData)
      .eq("id", course_id);

    // Update devis if exists
    const { data: devisData } = await supabaseClient
      .from("devis")
      .select("id")
      .eq("course_id", course_id)
      .maybeSingle();

    if (devisData) {
      await supabaseClient
        .from("devis")
        .update({ status: "cancelled" })
        .eq("id", devisData.id);
    }

    // Notify driver
    if (course.driver?.user_id) {
      let driverMessage = "";
      if (cancelled_by === "driver") {
        driverMessage = `Vous avez annulé la course.${shouldRefundDeposit && refundResult ? " L'acompte a été remboursé au client." : ""}`;
      } else if (cancelled_by === "client") {
        if (depositForfeited) {
          driverMessage = `Le client a annulé. L'acompte de ${course.deposit_amount}€ vous est acquis.`;
        } else if (shouldChargeFee && chargeResult) {
          driverMessage = `Le client a annulé. Frais de ${feeAmount}€ prélevés en votre faveur.`;
        } else {
          driverMessage = `Le client a annulé la course.`;
        }
      } else {
        driverMessage = `La course a été annulée par le système.`;
      }

      await supabaseClient.from("notifications").insert({
        user_id: course.driver.user_id,
        title: "🚫 Course annulée",
        message: driverMessage,
        type: "warning",
        link: "/driver-dashboard?tab=courses",
      });
    }

    // Notify client
    if (course.client?.user_id) {
      let clientMessage = "";
      if (cancelled_by === "driver") {
        clientMessage = `Le chauffeur a annulé la course.${refundResult ? " Votre acompte a été remboursé." : ""}`;
      } else if (cancelled_by === "client") {
        if (depositForfeited) {
          clientMessage = `Annulation confirmée. L'acompte de ${course.deposit_amount}€ n'est pas remboursable.`;
        } else if (shouldChargeFee && chargeResult) {
          clientMessage = `Annulation confirmée. Des frais de ${feeAmount}€ ont été prélevés.`;
        } else if (refundResult) {
          clientMessage = `Annulation confirmée. Votre acompte a été remboursé.`;
        } else {
          clientMessage = `Annulation confirmée.`;
        }
      } else {
        clientMessage = `La course a été annulée.${refundResult ? " Votre acompte a été remboursé." : ""}`;
      }

      await supabaseClient.from("notifications").insert({
        user_id: course.client.user_id,
        title: cancelled_by === "driver" ? "🚫 Course annulée par le chauffeur" : "✅ Annulation confirmée",
        message: clientMessage,
        type: cancelled_by === "driver" ? "warning" : "info",
        link: "/client-dashboard",
      });
    }

    logStep("Cancellation processed successfully", { 
      hasDeposit,
      depositForfeited,
      shouldChargeFee, 
      feeAmount,
      charged: !!chargeResult,
      refunded: !!refundResult 
    });

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_by,
        has_deposit: hasDeposit,
        fee_charged: shouldChargeFee && !!chargeResult,
        fee_amount: feeAmount,
        deposit_forfeited: depositForfeited,
        deposit_refunded: !!refundResult,
        message,
        charge_id: chargeResult?.id,
        refund_id: refundResult?.id,
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
