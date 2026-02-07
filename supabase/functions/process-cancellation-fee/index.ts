import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_CANCELLATION_FEE = 15.00; // 15€
const DEFAULT_FREE_CANCELLATION_HOURS = 2; // 2 hours before

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

    logStep("Course found", { 
      status: course.status,
      cardHoldStatus: course.card_hold_status,
      depositStatus: course.deposit_status,
      scheduledDate: course.scheduled_date 
    });

    // Get cancellation config for driver
    const { data: config } = await supabaseClient
      .from("cancellation_fees_config")
      .select("*")
      .eq("driver_id", course.driver_id)
      .maybeSingle();

    const cancellationFee = config?.cancellation_fee_amount || DEFAULT_CANCELLATION_FEE;
    const freeCancellationHours = config?.free_cancellation_hours || DEFAULT_FREE_CANCELLATION_HOURS;

    // Calculate hours until pickup
    const scheduledDate = new Date(course.scheduled_date);
    const now = new Date();
    const hoursUntilPickup = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    logStep("Time calculations", { hoursUntilPickup, freeCancellationHours });

    let shouldChargeFee = false;
    let feeAmount = 0;
    let shouldRefundDeposit = false;
    let refundResult = null;
    let chargeResult = null;
    let message = "";

    // RÈGLES DE FRAIS D'ANNULATION
    // 1. Si le chauffeur annule → pas de frais pour le client, remboursement acompte
    // 2. Si le client annule > 2h avant → pas de frais, mais acompte gardé par chauffeur
    // 3. Si le client annule < 2h avant → frais de 15€ prélevés via empreinte bancaire
    // 4. Si le système annule → pas de frais, remboursement acompte

    if (cancelled_by === "driver") {
      shouldChargeFee = false;
      shouldRefundDeposit = true;
      message = "Annulation par le chauffeur - aucun frais pour le client.";
      
      // Refund deposit if paid
      if (course.deposit_status === "paid" && course.deposit_stripe_payment_intent_id) {
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
                reason: "Driver cancelled",
              },
            });
            logStep("Deposit refunded", { refundId: refundResult.id });
          }
        } catch (refundError: any) {
          logStep("Deposit refund error", { error: refundError.message });
        }
      }
    } else if (cancelled_by === "client") {
      // Check if within penalty window
      if (hoursUntilPickup <= freeCancellationHours) {
        shouldChargeFee = true;
        feeAmount = cancellationFee;
        shouldRefundDeposit = false;
        message = `Annulation client moins de ${freeCancellationHours}h avant - frais de ${feeAmount}€ appliqués.`;

        // Try to charge using card hold
        if (course.card_hold_status === "confirmed" && course.stripe_payment_method_id) {
          try {
            // Create PaymentIntent with the stored payment method
            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(feeAmount * 100), // Convert to cents
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
              transfer_data: course.driver.stripe_connect_account_id ? {
                destination: course.driver.stripe_connect_account_id,
              } : undefined,
              // No application fee for cancellation fees - driver gets full amount
            });

            chargeResult = paymentIntent;
            logStep("Cancellation fee charged", { 
              paymentIntentId: paymentIntent.id,
              amount: feeAmount 
            });
          } catch (chargeError: any) {
            logStep("Cancellation fee charge failed", { error: chargeError.message });
            // Mark as failed but continue with cancellation
            message += " (échec du prélèvement)";
          }
        } else {
          logStep("No card hold available for charging fee");
          message += " (pas d'empreinte bancaire)";
        }
      } else {
        // Outside penalty window - no fee, but deposit is kept by driver
        shouldChargeFee = false;
        shouldRefundDeposit = false;
        message = `Annulation client plus de ${freeCancellationHours}h avant - aucun frais supplémentaire.`;
        
        // Note: deposit is kept by driver (forfeited)
        if (course.deposit_status === "paid") {
          message += " L'acompte reste acquis au chauffeur.";
        }
      }
    } else if (cancelled_by === "system") {
      shouldChargeFee = false;
      shouldRefundDeposit = true;
      message = "Annulation système - aucun frais, remboursement complet.";
      
      // Refund deposit if paid
      if (course.deposit_status === "paid" && course.deposit_stripe_payment_intent_id) {
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
      cancellation_fee_amount: shouldChargeFee ? feeAmount : 0,
      cancellation_fee_charged: shouldChargeFee && !!chargeResult,
    };

    if (chargeResult) {
      updateData.cancellation_fee_charged_at = new Date().toISOString();
      updateData.cancellation_fee_stripe_id = chargeResult.id;
    }

    if (shouldRefundDeposit && refundResult) {
      updateData.deposit_status = "refunded";
    } else if (course.deposit_status === "paid" && !shouldRefundDeposit) {
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
      const driverMessage = cancelled_by === "driver" 
        ? `Vous avez annulé la course.`
        : cancelled_by === "client"
          ? shouldChargeFee && chargeResult
            ? `Le client a annulé. Frais de ${feeAmount}€ prélevés en votre faveur.`
            : `Le client a annulé la course.`
          : `La course a été annulée par le système.`;

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
      const clientMessage = cancelled_by === "driver"
        ? `Le chauffeur a annulé la course.${refundResult ? " Votre acompte a été remboursé." : ""}`
        : cancelled_by === "client"
          ? shouldChargeFee && chargeResult
            ? `Annulation confirmée. Des frais de ${feeAmount}€ ont été prélevés.`
            : `Annulation confirmée.${course.deposit_status === "paid" ? " L'acompte reste acquis au chauffeur." : ""}`
          : `La course a été annulée.${refundResult ? " Votre acompte a été remboursé." : ""}`;

      await supabaseClient.from("notifications").insert({
        user_id: course.client.user_id,
        title: cancelled_by === "driver" ? "🚫 Course annulée par le chauffeur" : "✅ Annulation confirmée",
        message: clientMessage,
        type: cancelled_by === "driver" ? "warning" : "info",
        link: "/client-dashboard",
      });
    }

    logStep("Cancellation processed successfully", { 
      shouldChargeFee, 
      feeAmount,
      charged: !!chargeResult,
      refunded: !!refundResult 
    });

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_by,
        fee_charged: shouldChargeFee && !!chargeResult,
        fee_amount: shouldChargeFee ? feeAmount : 0,
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
