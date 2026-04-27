// Détecte et corrige les incohérences post-settlement hebdomadaire :
// quand des lignes driver_balance_pending (cash) sont passées en `settled` lors
// du settlement mais qu'AUCUN transfer Stripe n'a réussi (transfer_status ∈
// failed / compensated_cash / below_minimum / skipped / skipped_no_stripe),
// la dette doit rester visible dans drivers.cash_debt_pending.
//
// Cette fonction peut être appelée :
//  - automatiquement à la fin de process-weekly-settlement (auto-heal),
//  - manuellement par un admin via l'UI (réalignement à la demande),
//  - en cron (filet de sécurité).
//
// Idempotente : si la dette est déjà cohérente, ne fait rien.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RETRY-SETTLEMENT-ARREARS] ${step}${d}`);
};

const UNRESOLVED_TRANSFER_STATUSES = [
  "compensated_cash",
  "below_minimum",
  "failed",
  "skipped",
  "skipped_no_stripe",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* no body OK */ }
    const targetDriverId: string | undefined = body?.driver_id;
    const targetSettlementId: string | undefined = body?.settlement_id;
    const dryRun: boolean = body?.dry_run === true;

    log("Run", { targetDriverId, targetSettlementId, dryRun });

    // 1) Récupérer toutes les lignes weekly avec un statut "non transférables"
    let weeklyQuery = supabase
      .from("driver_weekly_balances")
      .select("driver_id, settlement_id, transfer_status")
      .in("transfer_status", UNRESOLVED_TRANSFER_STATUSES);
    if (targetDriverId) weeklyQuery = weeklyQuery.eq("driver_id", targetDriverId);
    if (targetSettlementId) weeklyQuery = weeklyQuery.eq("settlement_id", targetSettlementId);

    const { data: weeklyRows, error: weeklyErr } = await weeklyQuery;
    if (weeklyErr) throw new Error(`weekly_balances fetch failed: ${weeklyErr.message}`);
    if (!weeklyRows || weeklyRows.length === 0) {
      log("No unresolved weekly balances", {});
      return new Response(JSON.stringify({ success: true, scanned: 0, healed: 0, drivers_healed: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group settlement_ids per driver
    const settlementsByDriver = new Map<string, Set<string>>();
    for (const r of weeklyRows) {
      if (!r.driver_id || !r.settlement_id) continue;
      if (!settlementsByDriver.has(r.driver_id)) settlementsByDriver.set(r.driver_id, new Set());
      settlementsByDriver.get(r.driver_id)!.add(r.settlement_id);
    }

    const driverIds = Array.from(settlementsByDriver.keys());
    log("Drivers to inspect", { count: driverIds.length });

    // 2) Pour chaque chauffeur : somme des lignes cash settled mais sans recovery payment,
    //    rattachées à un settlement non transféré, comparée à drivers.cash_debt_pending.
    const driversById: Record<string, any> = {};
    for (let i = 0; i < driverIds.length; i += 500) {
      const chunk = driverIds.slice(i, i + 500);
      const { data: ds } = await supabase
        .from("drivers")
        .select("id, user_id, company_name, cash_debt_pending")
        .in("id", chunk);
      for (const d of ds || []) driversById[d.id] = d;
    }

    const healed: Array<{
      driver_id: string;
      previous_debt_eur: number;
      expected_debt_eur: number;
      new_debt_eur: number;
      unresolved_rows: number;
      orphan_settled_cash_cents: number;
    }> = [];

    for (const driverId of driverIds) {
      const settlementIds = Array.from(settlementsByDriver.get(driverId)!);
      const driver = driversById[driverId];
      if (!driver) continue;

      const { data: orphanRows, error: orphanErr } = await supabase
        .from("driver_balance_pending")
        .select("id, solocab_fee")
        .eq("driver_id", driverId)
        .eq("payment_type", "cash")
        .eq("status", "settled")
        .is("settled_via_payment_id", null)
        .in("settlement_id", settlementIds);
      if (orphanErr) {
        log("orphan rows fetch failed", { driverId, error: orphanErr.message });
        continue;
      }

      const orphanCents = (orphanRows || []).reduce(
        (s, r) => s + Math.round((Number(r.solocab_fee) || 0) * 100),
        0,
      );
      const currentDebtCents = Math.round((Number(driver.cash_debt_pending) || 0) * 100);

      // Le bon état : la dette consolidée doit AU MOINS couvrir les arriérés orphelins.
      // Si elle est inférieure, on la réaligne sur le maximum (jamais on ne descend la dette).
      if (orphanCents > currentDebtCents) {
        const newCents = orphanCents;
        log("Healing driver", {
          driverId,
          unresolvedRows: orphanRows?.length || 0,
          previousDebtCents: currentDebtCents,
          orphanCents,
          newCents,
          dryRun,
        });

        if (!dryRun) {
          const { error: updErr } = await supabase
            .from("drivers")
            .update({ cash_debt_pending: newCents / 100 })
            .eq("id", driverId);
          if (updErr) {
            log("Failed to heal driver debt", { driverId, error: updErr.message });
            continue;
          }

          // Audit trail : on inscrit une entrée "consolidated_debt" négative-équivalente
          // (montant 0 mais on enregistre l'avant/après pour traçabilité) en utilisant
          // la course = settlement la plus récente comme placeholder (NULL accepté).
          await supabase.from("arrears_recovery_log").insert({
            driver_id: driverId,
            recovery_payment_id: null,
            recovery_course_id: settlementIds[0], // settlement utilisé comme contexte
            source_type: "consolidated_debt",
            source_pending_id: null,
            source_origin_course_id: null,
            amount_recovered_cents: 0,
            consolidated_debt_before_cents: currentDebtCents,
            consolidated_debt_after_cents: newCents,
          });

          // Alerte admin pour traçabilité
          await supabase.from("settlement_alerts").insert({
            driver_id: driverId,
            alert_type: "cash_debt_realigned",
            severity: "warning",
            message: `Dette cash réalignée pour ${driver.company_name || driverId}: ${(currentDebtCents / 100).toFixed(2)}€ → ${(newCents / 100).toFixed(2)}€ (${orphanRows?.length || 0} ligne(s) settled sans transfer).`,
            details: {
              previous_debt_eur: currentDebtCents / 100,
              new_debt_eur: newCents / 100,
              unresolved_rows: orphanRows?.length || 0,
              settlement_ids: settlementIds,
            },
          });

          // Notif chauffeur (informative)
          if (driver.user_id) {
            await supabase.from("notifications").insert({
              user_id: driver.user_id,
              title: "ℹ️ Frais antécédents réajustés",
              message: `Vos frais antécédents ont été réajustés à ${(newCents / 100).toFixed(2)}€ pour refléter exactement les courses cash impayées.`,
              type: "info",
              link: "/driver-dashboard?tab=finances",
            });
          }
        }

        healed.push({
          driver_id: driverId,
          previous_debt_eur: currentDebtCents / 100,
          expected_debt_eur: orphanCents / 100,
          new_debt_eur: newCents / 100,
          unresolved_rows: orphanRows?.length || 0,
          orphan_settled_cash_cents: orphanCents,
        });
      }
    }

    log("Run completed", { scanned: driverIds.length, healed: healed.length, dryRun });
    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        scanned: driverIds.length,
        healed: healed.length,
        drivers_healed: healed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
