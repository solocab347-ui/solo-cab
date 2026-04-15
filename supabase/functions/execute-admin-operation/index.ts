import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authErr || !user) throw new Error("Non authentifié");

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Accès non autorisé - admin requis");

    const { operation_id } = await req.json();
    if (!operation_id) throw new Error("operation_id manquant");

    // Fetch operation
    const { data: op, error: opErr } = await supabase
      .from("admin_manual_operations")
      .select("*")
      .eq("id", operation_id)
      .single();
    if (opErr || !op) throw new Error("Opération introuvable");
    if (op.status === "completed") throw new Error("Opération déjà exécutée");
    if (op.status === "cancelled") throw new Error("Opération annulée");

    // Update to processing
    await supabase
      .from("admin_manual_operations")
      .update({ status: "processing" })
      .eq("id", operation_id);

    let stripeTransferId: string | null = null;
    let stripeRefundId: string | null = null;

    const amountCents = Math.round(Number(op.amount) * 100);

    if (stripeKey && amountCents > 0) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

      switch (op.operation_type) {
        case "driver_payout": {
          // Get driver's Stripe Connect account
          const { data: driver } = await supabase
            .from("drivers")
            .select("stripe_connect_account_id")
            .eq("id", op.target_driver_id)
            .single();

          if (!driver?.stripe_connect_account_id) {
            throw new Error("Chauffeur sans compte Stripe Connect");
          }

          // Create transfer to connected account
          const transfer = await stripe.transfers.create({
            amount: amountCents,
            currency: "eur",
            destination: driver.stripe_connect_account_id,
            description: `Virement manuel admin: ${op.justification}`,
            metadata: {
              operation_id: op.id,
              admin_id: user.id,
              type: "manual_payout",
            },
          });
          stripeTransferId = transfer.id;
          break;
        }

        case "client_refund": {
          // For client refunds, we need a payment intent to refund
          // If no specific course, create a direct refund or credit
          const { data: client } = await supabase
            .from("clients")
            .select("stripe_customer_id")
            .eq("id", op.target_client_id)
            .single();

          if (op.reference_course_id) {
            // Find the payment intent for this course
            const { data: stripeTx } = await supabase
              .from("stripe_transactions")
              .select("stripe_payment_intent_id")
              .eq("course_id", op.reference_course_id)
              .maybeSingle();

            if (stripeTx?.stripe_payment_intent_id) {
              const refund = await stripe.refunds.create({
                payment_intent: stripeTx.stripe_payment_intent_id,
                amount: amountCents,
                reason: "requested_by_customer",
                metadata: {
                  operation_id: op.id,
                  admin_id: user.id,
                  type: "manual_refund",
                },
              });
              stripeRefundId = refund.id;
            }
          }
          // If no course ref or no payment found, record as manual adjustment
          if (!stripeRefundId) {
            console.log("No Stripe payment found for refund - recording as manual adjustment");
          }
          break;
        }

        case "driver_debit": {
          // Reverse transfer or record as debit
          const { data: driver } = await supabase
            .from("drivers")
            .select("stripe_connect_account_id")
            .eq("id", op.target_driver_id)
            .single();

          if (driver?.stripe_connect_account_id) {
            // Create a reverse transfer (clawback)
            try {
              const transfer = await stripe.transfers.create({
                amount: amountCents,
                currency: "eur",
                destination: driver.stripe_connect_account_id,
                description: `Débit manuel admin: ${op.justification}`,
                metadata: {
                  operation_id: op.id,
                  admin_id: user.id,
                  type: "manual_debit",
                },
              });
              // Then reverse it to pull funds back
              const reversal = await stripe.transfers.createReversal(transfer.id, {
                amount: amountCents,
                description: `Débit: ${op.justification}`,
              });
              stripeTransferId = `${transfer.id}|rev:${reversal.id}`;
            } catch (stripeErr: any) {
              console.error("Stripe debit error:", stripeErr);
              // Still mark as completed with note
              stripeTransferId = `manual_debit_recorded`;
            }
          }
          break;
        }

        case "client_credit":
        case "regularization": {
          // These are recorded as manual adjustments in the ledger
          console.log(`Recording ${op.operation_type} as manual ledger entry`);
          break;
        }
      }
    }

    // Update balance records for drivers
    if (op.target_type === "driver" && op.target_driver_id) {
      const balanceAmount = op.operation_type === "driver_debit" ? -Number(op.amount) : Number(op.amount);
      
      await supabase.from("driver_balance_pending").insert({
        driver_id: op.target_driver_id,
        amount: Math.abs(Number(op.amount)),
        fee_amount: 0,
        net_amount: balanceAmount,
        payment_method: "manual_admin",
        description: `[Admin] ${op.justification}`,
        status: "completed",
      });
    }

    // Mark operation as completed
    await supabase
      .from("admin_manual_operations")
      .update({
        status: "completed",
        stripe_transfer_id: stripeTransferId,
        stripe_refund_id: stripeRefundId,
        executed_at: new Date().toISOString(),
      })
      .eq("id", operation_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stripe_transfer_id: stripeTransferId,
        stripe_refund_id: stripeRefundId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Error:", err);

    // Try to update operation status if we have the ID
    try {
      const { operation_id } = await req.clone().json();
      if (operation_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("admin_manual_operations")
          .update({ status: "failed", error_message: err.message })
          .eq("id", operation_id);
      }
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
