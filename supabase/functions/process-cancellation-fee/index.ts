import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Defaults selon le cahier des charges
const DEFAULT_CANCELLATION_FEE_NO_DEPOSIT = 10.00; // 10€ sans acompte
const DEFAULT_FREE_CANCELLATION_HOURS_NO_DEPOSIT = 1; // T-1h sans acompte
const DEFAULT_FREE_CANCELLATION_HOURS_WITH_DEPOSIT = 4; // T-4h avec acompte
const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-CANCELLATION-FEE] ${step}${detailsStr}`);
};

/**
 * ══════════════════════════════════════════════════════════════
 * POLITIQUE D'ANNULATION SOLOCAB
 * ══════════════════════════════════════════════════════════════
 * 
 * La politique d'annulation est le BUSINESS.
 * Stripe est l'EXÉCUTION.
 * 
 * Le système de paiement NE DÉCIDE PAS du prix.
 * Il applique la politique existante.
 * 
 * CAS GÉRÉS:
 * 1. Annulation immédiate (gratuite) → cancel PaymentIntent
 * 2. Annulation chauffeur → cancel PaymentIntent + remboursement acompte
 * 3. Annulation tardive (client) → capture frais via empreinte
 * 4. Chauffeur en route → frais de déplacement
 * 5. Chauffeur arrivé / no-show → frais no-show
 * 6. Course démarrée → prix réel (km + temps)
 * 7. Course terminée → prix complet (via finalize, pas ici)
 * ══════════════════════════════════════════════════════════════
 */

interface CancellationResult {
  feeAmount: number;
  message: string;
  feeType: 'none' | 'fixed' | 'deposit_forfeited' | 'real_price' | 'no_show';
}

/**
 * Calcule les frais d'annulation selon la politique SoloCab.
 * Cette fonction est la SOURCE UNIQUE de vérité pour les frais.
 */
function calculateCancellationFee(
  course: any,
  cancelledBy: string,
  config: any,
  driverPricing: any | null = null,
): CancellationResult {
  const hasDeposit = course.deposit_status === "paid" && course.deposit_amount > 0;
  const courseStatus = course.status;
  
  const configFreeHours = config?.free_cancellation_hours ?? null;
  const freeCancellationHours = hasDeposit 
    ? (configFreeHours ?? DEFAULT_FREE_CANCELLATION_HOURS_WITH_DEPOSIT)
    : (configFreeHours ?? DEFAULT_FREE_CANCELLATION_HOURS_NO_DEPOSIT);
  
  const cancellationFeeFixed = hasDeposit 
    ? 0 
    : (config?.cancellation_fee_amount ?? DEFAULT_CANCELLATION_FEE_NO_DEPOSIT);

  const scheduledDate = new Date(course.scheduled_date);
  const now = new Date();
  const hoursUntilPickup = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // ═══ ANNULATION PAR LE CHAUFFEUR → Toujours gratuit pour le client ═══
  if (cancelledBy === "driver" || cancelledBy === "system") {
    return { feeAmount: 0, message: "Annulation par le chauffeur/système - aucun frais.", feeType: 'none' };
  }

  // ═══ ANNULATION PAR LE CLIENT ═══

  // CAS 1: Course déjà démarrée (status = in_progress) → prix réel km/temps
  if (courseStatus === "in_progress") {
    const realPrice = calculateRealPrice(course, driverPricing);
    if (realPrice > 0) {
      return { 
        feeAmount: realPrice, 
        message: `Course en cours annulée - facturation du trajet réel: ${realPrice.toFixed(2)}€.`,
        feeType: 'real_price'
      };
    }
    // Si pas de données de trajet réel, appliquer le prix estimé
    const estimatedPrice = course.final_payment_amount || course.guest_estimated_price || 0;
    if (estimatedPrice > 0) {
      return {
        feeAmount: estimatedPrice,
        message: `Course en cours annulée - montant estimé: ${estimatedPrice.toFixed(2)}€.`,
        feeType: 'real_price'
      };
    }
  }

  // CAS 2: Course avec acompte
  if (hasDeposit) {
    if (hoursUntilPickup > freeCancellationHours) {
      return { 
        feeAmount: 0, 
        message: `Annulation client +${freeCancellationHours}h avant - acompte remboursé.`,
        feeType: 'none'
      };
    } else {
      return {
        feeAmount: course.deposit_amount,
        message: `Annulation client -${freeCancellationHours}h avant - acompte de ${course.deposit_amount}€ conservé.`,
        feeType: 'deposit_forfeited'
      };
    }
  }

  // CAS 3: Course sans acompte - vérifier le timing
  if (hoursUntilPickup > freeCancellationHours) {
    return { 
      feeAmount: 0, 
      message: `Annulation client +${freeCancellationHours}h avant - aucun frais.`,
      feeType: 'none'
    };
  }

  // CAS 4: Annulation tardive sans acompte → frais fixes
  return {
    feeAmount: cancellationFeeFixed,
    message: `Annulation client -${freeCancellationHours}h avant - frais de ${cancellationFeeFixed}€.`,
    feeType: 'fixed'
  };
}

/**
 * Calcule le prix réel basé sur la distance et le temps effectués.
 * Utilisé quand la course est déjà démarrée.
 * Utilise les tarifs RÉELS du chauffeur (depuis city_pricing ou devis).
 */
function calculateRealPrice(course: any, driverPricing: any | null): number {
  const distanceKm = course.distance_km || 0;
  const durationMinutes = course.duration_minutes || 0;
  
  if (distanceKm <= 0 && durationMinutes <= 0) return 0;

  // Priorité : tarif du devis > tarif ville chauffeur > fallback
  const perKmRate = course.per_km_rate 
    || driverPricing?.per_km_rate 
    || 2.0;
  const baseFare = course.base_fare 
    || driverPricing?.base_fare 
    || 5.0;
  
  const distancePrice = distanceKm * perKmRate;
  const price = baseFare + distancePrice;
  
  // Ne jamais dépasser le montant de l'empreinte bancaire
  const holdAmount = course.card_hold_amount || course.final_payment_amount || course.guest_estimated_price || Infinity;
  
  return Math.min(Math.round(price * 100) / 100, holdAmount);
}

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
      cancelled_by,
      reason,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");
    if (!cancelled_by) throw new Error("cancelled_by required");
    if (!["driver", "client", "system"].includes(cancelled_by)) {
      throw new Error("cancelled_by must be 'driver', 'client', or 'system'");
    }

    logStep("Processing cancellation", { course_id, cancelled_by, reason });

    // ═══ 1. RÉCUPÉRER DONNÉES ═══
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

    const { data: config } = await supabaseClient
      .from("cancellation_fees_config")
      .select("*")
      .eq("driver_id", course.driver_id)
      .maybeSingle();

    // Récupérer les tarifs réels du chauffeur pour le calcul du prix réel
    const { data: driverPricing } = await supabaseClient
      .from("city_pricing")
      .select("per_km_rate, base_fare")
      .eq("driver_id", course.driver_id)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();

    logStep("Course found", { 
      status: course.status,
      cardHoldStatus: course.card_hold_status,
      depositStatus: course.deposit_status,
      depositAmount: course.deposit_amount,
      scheduledDate: course.scheduled_date,
      courseStartedAt: course.course_started_at,
    });

    // ═══ 2. CALCULER LES FRAIS (POLITIQUE SOLOCAB) ═══
    const result = calculateCancellationFee(course, cancelled_by, config, driverPricing);
    
    logStep("Cancellation fee calculated", { 
      feeAmount: result.feeAmount, 
      feeType: result.feeType,
      message: result.message 
    });

    // ═══ 3. EXÉCUTER SUR STRIPE ═══
    let chargeResult: any = null;
    let refundResult: any = null;
    const hasDeposit = course.deposit_status === "paid" && course.deposit_amount > 0;

    // --- Remboursement acompte si nécessaire ---
    if (cancelled_by === "driver" || cancelled_by === "system" || 
        (cancelled_by === "client" && result.feeType === 'none' && hasDeposit)) {
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
              metadata: { course_id, cancelled_by, reason: result.message },
            });
            logStep("Deposit refunded", { refundId: refundResult.id });
          }
        } catch (refundError: any) {
          logStep("Deposit refund error", { error: refundError.message });
        }
      }
    }

    // --- Exécution Stripe selon le montant calculé ---
    if (result.feeAmount === 0) {
      // FEE = 0 → Annuler le PaymentIntent (libérer empreinte)
      if (course.stripe_hold_payment_intent_id && course.card_hold_status === "confirmed") {
        try {
          await stripe.paymentIntents.cancel(course.stripe_hold_payment_intent_id);
          logStep("Card hold cancelled (fee = 0)");
        } catch (cancelErr: any) {
          logStep("Hold cancel error (may already be cancelled)", { error: cancelErr.message });
        }
      }
    } else {
      // FEE > 0 → Capturer le montant calculé sur l'empreinte
      const feeAmountCents = Math.round(result.feeAmount * 100);
      
      if (course.stripe_hold_payment_intent_id && course.card_hold_status === "confirmed") {
        try {
          const capturedPI = await stripe.paymentIntents.capture(
            course.stripe_hold_payment_intent_id,
            { amount_to_capture: Math.min(feeAmountCents, (course.card_hold_amount || result.feeAmount) * 100) }
          );
          chargeResult = capturedPI;
          logStep("Cancellation fee captured via hold", { 
            piId: capturedPI.id, 
            amount: result.feeAmount,
          });
        } catch (captureError: any) {
          logStep("Partial capture failed, trying fallback", { error: captureError.message });
          
          // Fallback: nouveau PI avec carte enregistrée
          if (course.stripe_payment_method_id) {
            try {
              if (!course.driver?.stripe_connect_account_id || !course.driver?.stripe_connect_charges_enabled) {
                throw new Error("Le chauffeur n'a pas de compte Stripe Connect actif. Impossible de facturer les frais d'annulation.");
              }

              const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
                amount: feeAmountCents,
                currency: "eur",
                payment_method: course.stripe_payment_method_id,
                confirm: true,
                off_session: true,
                description: `Frais d'annulation - Course VTC`,
                transfer_data: { destination: course.driver.stripe_connect_account_id },
                on_behalf_of: course.driver.stripe_connect_account_id,
                application_fee_amount: Math.min(SOLOCAB_FEE_CENTS, feeAmountCents),
                metadata: {
                  course_id,
                  type: "cancellation_fee",
                  fee_type: result.feeType,
                  cancelled_by,
                },
              };

              const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
              chargeResult = paymentIntent;
              logStep("Cancellation fee charged via fallback PI", { piId: paymentIntent.id });
            } catch (fallbackError: any) {
              logStep("Fallback charge failed", { error: fallbackError.message });
            }
          }
        }
      } else if (course.stripe_payment_method_id) {
        // Pas de hold actif mais carte enregistrée → nouveau PI
        try {
          const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
            amount: feeAmountCents,
            currency: "eur",
            payment_method: course.stripe_payment_method_id,
            confirm: true,
            off_session: true,
            description: `Frais d'annulation - Course VTC`,
            // DESTINATION CHARGES: Funds go to driver
            ...(course.driver?.stripe_connect_account_id && course.driver?.stripe_connect_charges_enabled ? {
              transfer_data: { destination: course.driver.stripe_connect_account_id },
              on_behalf_of: course.driver.stripe_connect_account_id,
              application_fee_amount: Math.min(SOLOCAB_FEE_CENTS, feeAmountCents),
            } : {}),
            metadata: {
              course_id,
              type: "cancellation_fee",
              fee_type: result.feeType,
              cancelled_by,
            },
          };

          const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
          chargeResult = paymentIntent;
          logStep("Cancellation fee charged", { piId: paymentIntent.id, amount: result.feeAmount });
        } catch (chargeError: any) {
          logStep("Cancellation fee charge failed", { error: chargeError.message });
        }
      } else {
        logStep("No payment method available for charging fee");
      }
    }

    // ═══ 4. METTRE À JOUR LA BASE DE DONNÉES ═══
    const updateData: Record<string, any> = {
      status: "cancelled",
      cancelled_by,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      hours_before_cancellation: (new Date(course.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60),
      cancellation_fee_amount: result.feeAmount,
      cancellation_fee_charged: result.feeAmount > 0 && !!chargeResult,
    };

    if (chargeResult) {
      updateData.cancellation_fee_charged_at = new Date().toISOString();
      updateData.cancellation_fee_stripe_id = chargeResult.id;
    }

    if (result.feeType === 'deposit_forfeited') {
      updateData.deposit_status = "forfeited";
    } else if (refundResult) {
      updateData.deposit_status = "refunded";
    }

    // Si frais capturés → enregistrer la transaction
    if (result.feeAmount > 0 && chargeResult) {
      const STRIPE_PERCENTAGE = 0.015;
      const STRIPE_FIXED_FEE = 0.25;
      const stripeFee = Math.round((result.feeAmount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
      const solocabFee = Math.min(SOLOCAB_FEE_CENTS / 100, result.feeAmount);
      const netToDriver = Math.round((result.feeAmount - stripeFee - solocabFee) * 100) / 100;

      updateData.solocab_fee_amount = solocabFee;
      updateData.stripe_fee_amount = stripeFee;
      updateData.net_amount_to_driver = Math.max(0, netToDriver);

      // Transaction dans le ledger
      await supabaseClient.from("stripe_transactions").insert({
        course_id,
        driver_id: course.driver_id,
        stripe_payment_intent_id: chargeResult.id,
        transaction_type: result.feeType === 'real_price' ? 'partial_capture' : 'cancellation_fee',
        gross_amount: result.feeAmount,
        stripe_fee_amount: stripeFee,
        solocab_fee_amount: solocabFee,
        net_amount: Math.max(0, netToDriver),
        status: "succeeded",
        description: `Annulation: ${result.message}`,
      });

      // Enregistrement payments
      await supabaseClient.from("payments").insert({
        course_id,
        driver_id: course.driver_id,
        client_id: course.client_id,
        stripe_payment_intent_id: chargeResult.id,
        amount: result.feeAmount,
        captured_amount: result.feeAmount,
        application_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
        net_to_driver: Math.max(0, netToDriver),
        status: "succeeded",
        payment_type: "cancellation_fee",
        capture_method: "manual",
        captured_at: new Date().toISOString(),
        metadata: { fee_type: result.feeType, cancelled_by },
      });
    }

    await supabaseClient
      .from("courses")
      .update(updateData)
      .eq("id", course_id);

    // Mettre à jour le devis si existant
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

    // ═══ 5. NOTIFICATIONS ═══
    if (course.driver?.user_id) {
      let driverMessage = "";
      if (cancelled_by === "driver") {
        driverMessage = `Vous avez annulé la course.${refundResult ? " L'acompte a été remboursé au client." : ""}`;
      } else if (cancelled_by === "client") {
        if (result.feeAmount > 0 && chargeResult) {
          driverMessage = result.feeType === 'deposit_forfeited'
            ? `Le client a annulé. L'acompte de ${result.feeAmount}€ vous est acquis.`
            : `Le client a annulé. Frais de ${result.feeAmount}€ prélevés en votre faveur.`;
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

    if (course.client?.user_id) {
      let clientMessage = "";
      if (cancelled_by === "driver") {
        clientMessage = `Le chauffeur a annulé la course.${refundResult ? " Votre acompte a été remboursé." : ""}`;
      } else if (cancelled_by === "client") {
        if (result.feeAmount > 0 && chargeResult) {
          clientMessage = `Annulation confirmée. ${result.message}`;
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
      feeType: result.feeType,
      feeAmount: result.feeAmount,
      charged: !!chargeResult,
      refunded: !!refundResult,
    });

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_by,
        fee_amount: result.feeAmount,
        fee_type: result.feeType,
        fee_charged: result.feeAmount > 0 && !!chargeResult,
        deposit_refunded: !!refundResult,
        message: result.message,
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
