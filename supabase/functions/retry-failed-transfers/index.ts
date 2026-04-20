// Retry des virements Stripe échoués.
// Déclenchable :
//  - automatiquement après mise à jour RIB (trigger='rib_updated', body.driver_id)
//  - manuellement par un admin (body.failed_transfer_ids: string[])
//  - via cron quotidien (sans body : retry tous les 'pending_retry' dont compte payouts_enabled=true)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetryBody {
  driver_id?: string;
  failed_transfer_ids?: string[];
  trigger?: "rib_updated" | "admin_manual" | "cron";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

    let body: RetryBody = {};
    try {
      body = await req.json();
    } catch {
      // Vide = cron
    }

    // 1. Sélectionner les virements à retenter
    let query = supabase
      .from("failed_transfers")
      .select("id, driver_id, amount_cents, currency, retry_count, status, original_settlement_id, failure_code")
      .in("status", ["pending_retry", "awaiting_rib_update"])
      .lt("retry_count", 5);

    if (body.failed_transfer_ids?.length) {
      query = query.in("id", body.failed_transfer_ids);
    } else if (body.driver_id) {
      query = query.eq("driver_id", body.driver_id);
    }

    const { data: failedTransfers, error: queryErr } = await query;
    if (queryErr) throw queryErr;
    if (!failedTransfers?.length) {
      return json({ message: "No failed transfers to retry", retried: 0 });
    }

    // 2. Charger les chauffeurs concernés (batch)
    const driverIds = [...new Set(failedTransfers.map((t) => t.driver_id))];
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, stripe_connect_account_id, payouts_blocked_until")
      .in("id", driverIds);

    const driverMap = new Map(drivers?.map((d) => [d.id, d]) ?? []);

    const results = { retried: 0, succeeded: 0, failed: 0, skipped: 0, details: [] as any[] };

    // 3. Pour chaque virement, vérifier le compte Stripe puis tenter le transfer
    for (const ft of failedTransfers) {
      const driver = driverMap.get(ft.driver_id);
      if (!driver?.stripe_connect_account_id) {
        results.skipped++;
        results.details.push({ id: ft.id, reason: "no_stripe_account" });
        continue;
      }

      // Skip si payouts bloqués
      if (driver.payouts_blocked_until && new Date(driver.payouts_blocked_until) > new Date()) {
        results.skipped++;
        results.details.push({ id: ft.id, reason: "payouts_blocked" });
        continue;
      }

      try {
        const account = await stripe.accounts.retrieve(driver.stripe_connect_account_id);
        if (!account.payouts_enabled) {
          // Toujours bloqué : marquer awaiting_rib_update
          await supabase
            .from("failed_transfers")
            .update({
              status: "awaiting_rib_update",
              last_retry_at: new Date().toISOString(),
              retry_count: ft.retry_count + 1,
              notes: `Payouts still disabled after retry attempt`,
            })
            .eq("id", ft.id);
          results.skipped++;
          results.details.push({ id: ft.id, reason: "payouts_not_enabled" });
          continue;
        }

        // Marquer en cours de retry
        await supabase
          .from("failed_transfers")
          .update({ status: "retrying", last_retry_at: new Date().toISOString() })
          .eq("id", ft.id);

        // Tenter le transfer
        const transfer = await stripe.transfers.create(
          {
            amount: ft.amount_cents,
            currency: ft.currency,
            destination: driver.stripe_connect_account_id,
            description: `Retry virement échoué (failed_transfer ${ft.id})`,
            metadata: {
              failed_transfer_id: ft.id,
              original_settlement_id: ft.original_settlement_id ?? "",
              trigger: body.trigger ?? "cron",
            },
          },
          { idempotencyKey: `retry_ft_${ft.id}_${ft.retry_count + 1}` }
        );

        await supabase
          .from("failed_transfers")
          .update({
            status: "resolved",
            stripe_transfer_id: transfer.id,
            resolved_at: new Date().toISOString(),
            resolution_method: body.trigger ?? "cron",
            retry_count: ft.retry_count + 1,
          })
          .eq("id", ft.id);

        results.succeeded++;
        results.retried++;
        results.details.push({ id: ft.id, status: "resolved", transfer_id: transfer.id });
      } catch (err: any) {
        const newRetryCount = ft.retry_count + 1;
        const permanentlyFailed = newRetryCount >= 5;

        await supabase
          .from("failed_transfers")
          .update({
            status: permanentlyFailed ? "permanently_failed" : "pending_retry",
            retry_count: newRetryCount,
            failure_code: err.code ?? null,
            failure_message: err.message,
            last_retry_at: new Date().toISOString(),
          })
          .eq("id", ft.id);

        // Si échec définitif → bloquer le compte chauffeur + alerte admin
        if (permanentlyFailed) {
          await supabase
            .from("drivers")
            .update({
              payouts_blocked_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
              payouts_blocked_reason: `5 échecs consécutifs : ${err.code ?? err.message}`,
            })
            .eq("id", ft.driver_id);
        }

        results.failed++;
        results.retried++;
        results.details.push({
          id: ft.id,
          status: permanentlyFailed ? "permanently_failed" : "retry_failed",
          error: err.message,
        });
      }
    }

    return json(results);
  } catch (err: any) {
    console.error("retry-failed-transfers error:", err);
    return json({ error: err.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
