import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REFUND-DEPOSIT] ${step}${detailsStr}`);
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

    // Authenticate user (must be the driver)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { 
      course_id,
      cancellation_by, // "driver" or "client" or "system"
      reason,
    } = await req.json();

    if (!course_id) throw new Error("course_id required");
    if (!cancellation_by) throw new Error("cancellation_by required");

    logStep("Processing refund request", { course_id, cancellation_by, reason });

    // Get course with deposit info
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select(`
        *,
        driver:drivers!courses_driver_id_fkey(id, user_id, company_name),
        client:clients!courses_client_id_fkey(id, user_id)
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Verify caller is authorized
    const isDriver = course.driver.user_id === userData.user.id;
    const isAdmin = false; // TODO: Add admin check if needed
    
    if (!isDriver && !isAdmin) {
      throw new Error("Unauthorized: only the course driver can process refunds");
    }

    logStep("Course found", { 
      depositStatus: course.deposit_status,
      depositAmount: course.deposit_amount,
      paymentIntentId: course.deposit_stripe_payment_intent_id
    });

    // Check if there's a deposit to refund
    if (!course.deposit_required || course.deposit_status !== "paid") {
      throw new Error("Aucun acompte payé à rembourser pour cette course");
    }

    // RÈGLES DE REMBOURSEMENT
    // - Si le chauffeur annule → remboursement intégral au client
    // - Si le client annule → l'acompte est conservé par le chauffeur (no-show forfait)
    // - Si le système annule → remboursement intégral au client

    let shouldRefund = false;
    let refundStatus = "";
    let clientMessage = "";
    let driverMessage = "";

    if (cancellation_by === "driver") {
      shouldRefund = true;
      refundStatus = "refunded";
      clientMessage = `Votre acompte de ${course.deposit_amount?.toFixed(2)}€ a été remboursé car le chauffeur a annulé la course.`;
      driverMessage = `Vous avez annulé la course. L'acompte de ${course.deposit_amount?.toFixed(2)}€ a été remboursé au client.`;
    } else if (cancellation_by === "client") {
      shouldRefund = false;
      refundStatus = "forfeited";
      clientMessage = `Votre acompte de ${course.deposit_amount?.toFixed(2)}€ n'est pas remboursable car vous avez annulé la course.`;
      driverMessage = `Le client a annulé la course. L'acompte de ${course.deposit_amount?.toFixed(2)}€ vous est acquis.`;
    } else if (cancellation_by === "system") {
      shouldRefund = true;
      refundStatus = "refunded";
      clientMessage = `Votre acompte de ${course.deposit_amount?.toFixed(2)}€ a été remboursé suite à une annulation système.`;
      driverMessage = `La course a été annulée par le système. L'acompte de ${course.deposit_amount?.toFixed(2)}€ a été remboursé au client.`;
    } else {
      throw new Error("cancellation_by must be 'driver', 'client', or 'system'");
    }

    logStep("Refund decision", { shouldRefund, refundStatus, cancellation_by });

    let refundResult = null;

    if (shouldRefund && course.deposit_stripe_payment_intent_id) {
      try {
        // Get the payment intent to find the charge
        const paymentIntent = await stripe.paymentIntents.retrieve(course.deposit_stripe_payment_intent_id);
        
        if (paymentIntent.latest_charge) {
          const chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge.id;

          // Create refund
          refundResult = await stripe.refunds.create({
            charge: chargeId,
            reason: "requested_by_customer",
            metadata: {
              course_id,
              cancellation_by,
              reason: reason || "Course cancelled",
            },
          });

          logStep("Refund created", { refundId: refundResult.id, amount: refundResult.amount });
        } else {
          logStep("No charge found on payment intent", { paymentIntentId: course.deposit_stripe_payment_intent_id });
        }
      } catch (stripeError: any) {
        logStep("Stripe refund error", { error: stripeError.message });
        // Continue with database update even if Stripe refund fails
      }
    }

    // Update course status
    await supabaseClient
      .from("courses")
      .update({
        deposit_status: refundStatus,
        status: "cancelled",
        cancellation_by,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", course_id);

    // Update deposit transaction
    await supabaseClient
      .from("deposit_transactions")
      .update({
        status: refundStatus,
        refunded_at: shouldRefund ? new Date().toISOString() : null,
        forfeited_at: !shouldRefund ? new Date().toISOString() : null,
        refund_reason: reason,
      })
      .eq("course_id", course_id)
      .eq("transaction_type", "deposit");

    // Notify client
    if (course.client?.user_id) {
      await supabaseClient.from("notifications").insert({
        user_id: course.client.user_id,
        title: shouldRefund ? "💰 Acompte remboursé" : "⚠️ Course annulée",
        message: clientMessage,
        type: shouldRefund ? "info" : "warning",
      });
    }

    // Notify driver
    await supabaseClient.from("notifications").insert({
      user_id: course.driver.user_id,
      title: cancellation_by === "driver" ? "🚫 Annulation confirmée" : "⚠️ Course annulée",
      message: driverMessage,
      type: "info",
    });

    return new Response(
      JSON.stringify({
        success: true,
        refunded: shouldRefund,
        status: refundStatus,
        refund_id: refundResult?.id,
        amount: course.deposit_amount,
        message: isDriver ? driverMessage : clientMessage,
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
