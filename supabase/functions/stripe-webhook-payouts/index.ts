// Webhook Stripe pour gérer payout.failed, payout.paid et account.updated.
// Crée automatiquement un failed_transfer en cas d'échec et synchronise les statuts.
//
// Configuration : ajouter cette URL comme endpoint webhook dans Stripe Dashboard
// avec les événements : payout.failed, payout.paid, account.updated, account.external_account.updated
//
// Note : verify_jwt = false dans config.toml (webhook public, signature Stripe vérifiée)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_PAYOUTS");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET_PAYOUTS missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pour les events sur compte connecté, account = ID du compte connecté
    const connectedAccountId = (event as any).account as string | undefined;

    switch (event.type) {
      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        if (!connectedAccountId) break;

        // Trouver le chauffeur
        const { data: driver } = await supabase
          .from("drivers")
          .select("id, failed_transfers_count")
          .eq("stripe_connect_account_id", connectedAccountId)
          .single();

        if (driver) {
          // Créer un failed_transfer
          await supabase.from("failed_transfers").insert({
            driver_id: driver.id,
            amount_cents: payout.amount,
            currency: payout.currency,
            stripe_payout_id: payout.id,
            failure_code: payout.failure_code ?? "unknown",
            failure_message: payout.failure_message ?? "Payout failed",
            status: needsRibUpdate(payout.failure_code) ? "awaiting_rib_update" : "pending_retry",
            metadata: {
              arrival_date: payout.arrival_date,
              destination: payout.destination,
              source_type: payout.source_type,
            },
          });

          // Incrémenter le compteur + dater le dernier échec
          await supabase
            .from("drivers")
            .update({
              failed_transfers_count: (driver.failed_transfers_count ?? 0) + 1,
              last_failed_transfer_at: new Date().toISOString(),
            })
            .eq("id", driver.id);

          // Si le code suggère un RIB invalide, bloquer 30j et notifier
          if (needsRibUpdate(payout.failure_code)) {
            await supabase
              .from("drivers")
              .update({
                payouts_blocked_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
                payouts_blocked_reason: `Stripe payout failed: ${payout.failure_code}`,
              })
              .eq("id", driver.id);
          }
        }
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        // Marquer comme résolu si on retrouve un failed_transfer lié
        await supabase
          .from("failed_transfers")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolution_method: "stripe_payout_paid",
          })
          .eq("stripe_payout_id", payout.id)
          .eq("status", "retrying");
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("drivers")
          .update({
            stripe_connect_charges_enabled: account.charges_enabled,
            stripe_connect_payouts_enabled: account.payouts_enabled,
          })
          .eq("stripe_connect_account_id", account.id);

        // Si payouts redeviennent enabled, débloquer & relancer retry
        if (account.payouts_enabled) {
          const { data: driver } = await supabase
            .from("drivers")
            .select("id, payouts_blocked_until")
            .eq("stripe_connect_account_id", account.id)
            .single();
          if (driver?.payouts_blocked_until) {
            await supabase
              .from("drivers")
              .update({ payouts_blocked_until: null, payouts_blocked_reason: null })
              .eq("id", driver.id);
            // Trigger retry
            try {
              await supabase.functions.invoke("retry-failed-transfers", {
                body: { driver_id: driver.id, trigger: "rib_updated" },
              });
            } catch (e) {
              console.warn("Retry trigger failed:", e);
            }
          }
        }
        break;
      }

      case "account.external_account.updated":
      case "account.external_account.created": {
        const ba = event.data.object as Stripe.BankAccount;
        if (!connectedAccountId || ba.object !== "bank_account") break;
        if (ba.default_for_currency) {
          await supabase
            .from("drivers")
            .update({
              bank_account_last4: ba.last4,
              bank_account_bank_name: ba.bank_name,
              bank_account_country: ba.country,
              bank_account_updated_at: new Date().toISOString(),
            })
            .eq("stripe_connect_account_id", connectedAccountId);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("stripe-webhook-payouts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function needsRibUpdate(failureCode: string | null): boolean {
  if (!failureCode) return false;
  const ribCodes = [
    "account_closed",
    "account_frozen",
    "no_account",
    "invalid_account_number",
    "invalid_currency",
    "debit_not_authorized",
    "incorrect_account_holder_name",
    "incorrect_account_holder_type",
    "bank_account_restricted",
  ];
  return ribCodes.includes(failureCode);
}
