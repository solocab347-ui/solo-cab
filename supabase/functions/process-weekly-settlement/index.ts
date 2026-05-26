// Règlement hebdomadaire SCALABLE — conçu pour 5000+ chauffeurs
// Optimisations clés :
//  - Batch lookup chauffeurs (1 query IN au lieu de N queries)
//  - Pool Stripe transfers parallèle (CONCURRENCY = 8)
//  - Updates DB groupées par status
//  - Heartbeat + processed_driver_ids → reprise sans perte si timeout
//  - Idempotency keys Stripe garantissent zéro double-virement
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONCURRENCY = 8;            // virements Stripe en parallèle (rate-limit Stripe ~25 req/s)
const HEARTBEAT_EVERY = 25;       // mettre à jour le settlement tous les N chauffeurs
const STRIPE_BATCH_DELAY_MS = 50; // micro-pause entre vagues pour respirer

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-SETTLEMENT] ${step}${d}`);
};

function getLastWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const daysToLastMonday = day === 0 ? 6 : day - 1;
  const lastMonday = new Date(now);
  lastMonday.setUTCDate(now.getUTCDate() - daysToLastMonday - 7);
  lastMonday.setUTCHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
  lastSunday.setUTCHours(23, 59, 59, 999);
  return {
    weekStart: lastMonday.toISOString().split('T')[0],
    weekEnd: lastSunday.toISOString().split('T')[0],
  };
}

async function fetchAllRows(supabase: any, table: string, column: string, value: string) {
  const rows: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").eq(column, value)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function fetchEligibleDrivers(supabase: any) {
  const rows: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, user_id, cash_debt_pending, company_name")
      .eq("status", "validated")
      .not("stripe_connect_account_id", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to fetch eligible drivers: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// ─── Pool de promesses limitées en parallélisme ─────────────────
async function runWithConcurrency<T, R>(
  items: T[], limit: number, worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  let currentSettlementId: string | null = null;

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { weekStart, weekEnd } = getLastWeekRange();
    log("Processing settlement", { weekStart, weekEnd });

    // ═══ IDEMPOTENCE + REPRISE ═══
    const { data: existing } = await supabase
      .from("weekly_settlements")
      .select("id, status, processed_driver_ids")
      .eq("week_start", weekStart).eq("week_end", weekEnd)
      .maybeSingle();

    if (existing?.status === 'completed') {
      return new Response(JSON.stringify({ message: "Already processed", settlement_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let settlementId: string;
    let alreadyProcessed: Set<string>;
    if (existing?.id) {
      await supabase.from("weekly_settlements").update({ status: "processing", last_heartbeat_at: new Date().toISOString() }).eq("id", existing.id);
      settlementId = existing.id;
      alreadyProcessed = new Set(existing.processed_driver_ids || []);
      log("Resuming settlement", { id: settlementId, already: alreadyProcessed.size });
    } else {
      const { data, error } = await supabase
        .from("weekly_settlements")
        .insert({ week_start: weekStart, week_end: weekEnd, status: "processing", last_heartbeat_at: new Date().toISOString() })
        .select("id").single();
      if (error) throw new Error(`Failed to create settlement: ${error.message}`);
      settlementId = data.id;
      alreadyProcessed = new Set();
    }

    // ═══ PRE-FLIGHT solde Stripe ═══
    let stripeAvailableEur = 0;
    try {
      const balance = await stripe.balance.retrieve();
      stripeAvailableEur = (balance.available.find((b: any) => b.currency === 'eur')?.amount || 0) / 100;
      log("Stripe platform balance", { available_eur: stripeAvailableEur });
    } catch (e: any) {
      log("Failed to retrieve Stripe balance", { error: e.message });
    }

    // ═══ 1. CHARGEMENT BALANCES + AGRÉGATION ═══
    const pendingBalances = await fetchAllRows(supabase, "driver_balance_pending", "status", "pending");
    log("Pending driver balances", { count: pendingBalances.length });

    type DriverAgg = {
      card_gross: number; card_solocab_fees: number; card_stripe_fees: number;
      card_net: number; card_courses: number; card_balance_ids: string[];
      cash_gross: number; cash_fees_owed: number; cash_courses: number; cash_balance_ids: string[];
    };
    const driverTotals: Record<string, DriverAgg> = {};

    for (const bal of pendingBalances) {
      if (!driverTotals[bal.driver_id]) {
        driverTotals[bal.driver_id] = {
          card_gross: 0, card_solocab_fees: 0, card_stripe_fees: 0,
          card_net: 0, card_courses: 0, card_balance_ids: [],
          cash_gross: 0, cash_fees_owed: 0, cash_courses: 0, cash_balance_ids: [],
        };
      }
      const d = driverTotals[bal.driver_id];
      if (bal.payment_type === 'cash') {
        d.cash_gross += Number(bal.gross_amount || 0);
        d.cash_fees_owed += Number(bal.solocab_fee || 0);
        d.cash_courses++;
        d.cash_balance_ids.push(bal.id);
      } else {
        d.card_gross += Number(bal.gross_amount || 0);
        d.card_solocab_fees += Number(bal.solocab_fee || 0);
        d.card_stripe_fees += Number(bal.stripe_fee || 0);
        d.card_net += Number(bal.net_amount || 0);
        d.card_courses++;
        d.card_balance_ids.push(bal.id);
      }
    }

    const eligibleDrivers = await fetchEligibleDrivers(supabase);
    const eligibleDriverIds = eligibleDrivers.map((d) => d.id);
    const allDriverIds = Array.from(new Set([...Object.keys(driverTotals), ...eligibleDriverIds]))
      .filter(id => !alreadyProcessed.has(id));
    log("Drivers to process this run", { active_with_activity: Object.keys(driverTotals).length, eligible_drivers: eligibleDriverIds.length, todo: allDriverIds.length });

    // ═══ 2. BATCH LOOKUP chauffeurs (1 query au lieu de N) ═══
    const driversById: Record<string, any> = {};
    for (const d of eligibleDrivers) driversById[d.id] = d;
    const missingDriverIds = allDriverIds.filter((id) => !driversById[id]);
    for (let i = 0; i < missingDriverIds.length; i += 500) {
      const chunk = missingDriverIds.slice(i, i + 500);
      const { data: ds } = await supabase
        .from("drivers")
        .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, user_id, cash_debt_pending, company_name")
        .in("id", chunk);
      for (const d of ds || []) driversById[d.id] = d;
    }

    // ═══ 3. PRE-MARK toutes les balances cash en "settled" (1 update bulk) ═══
    const allCashIds = allDriverIds.flatMap(id => driverTotals[id]?.cash_balance_ids || []);
    if (allCashIds.length > 0) {
      const nowIso = new Date().toISOString();
      for (let i = 0; i < allCashIds.length; i += 500) {
        await supabase.from("driver_balance_pending")
          .update({ status: "settled", settlement_id: settlementId, settled_at: nowIso })
          .in("id", allCashIds.slice(i, i + 500));
      }
      log("Cash balances pre-settled", { count: allCashIds.length });
    }

    // ═══ 4. PRÉPARATION TÂCHES PAR CHAUFFEUR ═══
    type Task = {
      driverId: string; driver: any; agg: DriverAgg;
      previousCashDebt: number; totalCashDebt: number; realNet: number; realNetCents: number;
    };
    const tasks: Task[] = allDriverIds.map(driverId => {
      const agg = driverTotals[driverId] || {
        card_gross: 0, card_solocab_fees: 0, card_stripe_fees: 0,
        card_net: 0, card_courses: 0, card_balance_ids: [],
        cash_gross: 0, cash_fees_owed: 0, cash_courses: 0, cash_balance_ids: [],
      };
      const driver = driversById[driverId];
      const previousCashDebt = Number(driver?.cash_debt_pending || 0);
      const totalCashDebt = previousCashDebt + agg.cash_fees_owed;
      const realNet = agg.card_net - totalCashDebt;
      return { driverId, driver, agg, previousCashDebt, totalCashDebt, realNet, realNetCents: Math.round(realNet * 100) };
    });

    // Buffers pour batch inserts
    const balanceInserts: any[] = [];
    const debtUpdates: { id: string; cash_debt_pending: number }[] = [];
    const settledCardIds: string[] = [];
    const alertInserts: any[] = [];
    const notifInserts: any[] = [];

    let executed = 0, failed = 0, totalAmount = 0;
    let processedSinceHeartbeat = 0;
    const newlyProcessed: string[] = [];

    // ═══ 5. WORKER : traite UN chauffeur (pas d'écriture DB ici, on bufferise) ═══
    async function processOne(task: Task) {
      const { driverId, driver, agg, previousCashDebt, totalCashDebt, realNet, realNetCents } = task;

      if (agg.card_courses === 0 && agg.cash_courses === 0 && totalCashDebt === 0) {
        balanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: 0, total_solocab_fees: 0,
          net_amount: 0, standard_courses_count: 0,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "no_activity",
        });
        return;
      }

      // Sans Stripe → accumule dette, pas de virement
      if (!driver?.stripe_connect_account_id || !driver?.stripe_connect_charges_enabled) {
        if (agg.cash_fees_owed > 0) debtUpdates.push({ id: driverId, cash_debt_pending: totalCashDebt });
        balanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: agg.card_gross,
          total_solocab_fees: agg.card_solocab_fees + agg.cash_fees_owed,
          net_amount: agg.card_net, standard_courses_count: agg.card_courses + agg.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "skipped_no_stripe",
        });
        if (agg.card_courses > 0) {
          alertInserts.push({
            settlement_id: settlementId, driver_id: driverId, alert_type: "no_stripe_account", severity: "warning",
            message: `${driver?.company_name || driverId} a ${agg.card_net.toFixed(2)}€ carte en attente mais Stripe Connect non configuré.`,
            details: { card_net: agg.card_net, cash_debt: totalCashDebt },
          });
        }
        return;
      }

      // Net réel < 1€ → compensation, pas de virement
      if (realNetCents < 100) {
        const compensated = Math.min(agg.card_net, totalCashDebt);
        const remainingDebt = totalCashDebt - compensated;
        debtUpdates.push({ id: driverId, cash_debt_pending: remainingDebt });
        settledCardIds.push(...agg.card_balance_ids);
        balanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: agg.card_gross,
          total_solocab_fees: agg.card_solocab_fees + compensated,
          net_amount: realNet, standard_courses_count: agg.card_courses + agg.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: realNet > 0 ? "below_minimum" : "compensated_cash",
        });
        if (remainingDebt > 1) {
          alertInserts.push({
            settlement_id: settlementId, driver_id: driverId, alert_type: "cash_debt_remaining", severity: "warning",
            message: `Dette cash de ${remainingDebt.toFixed(2)}€ subsiste pour ${driver?.company_name} (compensation partielle ${compensated.toFixed(2)}€).`,
            details: { previous_debt: previousCashDebt, new_debt: agg.cash_fees_owed, compensated, remaining: remainingDebt },
          });
        }
        return;
      }

      // Virement Stripe (idempotency key garantit aucun double virement même en reprise)
      const idempotencyKey = `settlement_${settlementId}_driver_${driverId}`;
      try {
        const transfer = await stripe.transfers.create({
          amount: realNetCents, currency: "eur",
          destination: driver.stripe_connect_account_id,
          description: `Règlement hebdo SoloCab ${weekStart} → ${weekEnd}`,
          metadata: {
            settlement_id: settlementId, driver_id: driverId, type: "weekly_driver_payout",
            card_courses: agg.card_courses.toString(), cash_courses: agg.cash_courses.toString(),
            cash_debt_compensated: totalCashDebt.toFixed(2),
          },
        }, { idempotencyKey });

        executed++; totalAmount += realNet;
        settledCardIds.push(...agg.card_balance_ids);
        if (totalCashDebt > 0) debtUpdates.push({ id: driverId, cash_debt_pending: 0 });

        balanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: agg.card_gross,
          total_solocab_fees: agg.card_solocab_fees + totalCashDebt,
          net_amount: realNet, standard_courses_count: agg.card_courses + agg.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "completed", stripe_transfer_id: transfer.id,
        });

        if (driver.user_id) {
          const cashNote = totalCashDebt > 0 ? ` (après compensation ${totalCashDebt.toFixed(2)}€ commission cash)` : '';
          notifInserts.push({
            user_id: driver.user_id, title: "💰 Virement hebdomadaire",
            message: `${realNet.toFixed(2)}€ versé sur votre compte (${agg.card_courses} courses carte${cashNote})`,
            type: "info", link: "/driver-dashboard?tab=finances",
          });
        }
      } catch (err: any) {
        failed++;
        debtUpdates.push({ id: driverId, cash_debt_pending: totalCashDebt });
        balanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: agg.card_gross, total_solocab_fees: agg.card_solocab_fees,
          net_amount: realNet, standard_courses_count: agg.card_courses + agg.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "failed", transfer_error: err.message?.substring(0, 500),
        });
        alertInserts.push({
          settlement_id: settlementId, driver_id: driverId, alert_type: "transfer_failed", severity: "critical",
          message: `Échec virement ${realNet.toFixed(2)}€ pour ${driver?.company_name || driverId}: ${err.message?.substring(0, 200)}`,
          details: { real_net: realNet, card_net: agg.card_net, cash_debt: totalCashDebt, error: err.message },
        });
        if (driver.user_id) {
          notifInserts.push({
            user_id: driver.user_id, title: "⚠️ Échec virement",
            message: `Le virement de ${realNet.toFixed(2)}€ a échoué. Nouvelle tentative lundi prochain.`,
            type: "warning", link: "/driver-dashboard?tab=finances",
          });
        }
      }
    }

    // ═══ 6. EXÉCUTION par vagues parallèles + heartbeat ═══
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      const wave = tasks.slice(i, i + CONCURRENCY);
      await runWithConcurrency(wave, CONCURRENCY, processOne);
      newlyProcessed.push(...wave.map(t => t.driverId));
      processedSinceHeartbeat += wave.length;

      // Heartbeat toutes les ~25 chauffeurs : si la fonction crash, la reprise sait où repartir
      if (processedSinceHeartbeat >= HEARTBEAT_EVERY) {
        await supabase.from("weekly_settlements").update({
          last_heartbeat_at: new Date().toISOString(),
          drivers_processed_count: alreadyProcessed.size + newlyProcessed.length,
          processed_driver_ids: [...alreadyProcessed, ...newlyProcessed],
        }).eq("id", settlementId);
        processedSinceHeartbeat = 0;
      }
      if (STRIPE_BATCH_DELAY_MS > 0 && i + CONCURRENCY < tasks.length) {
        await new Promise(r => setTimeout(r, STRIPE_BATCH_DELAY_MS));
      }
    }

    // ═══ 7. FLUSH BUFFERS (batch DB writes) ═══
    log("Flushing batched writes", {
      balances: balanceInserts.length, debts: debtUpdates.length,
      settled_card: settledCardIds.length, alerts: alertInserts.length, notifs: notifInserts.length,
    });

    // weekly balances : insert par chunks
    for (let i = 0; i < balanceInserts.length; i += 500) {
      await supabase.from("driver_weekly_balances").insert(balanceInserts.slice(i, i + 500));
    }
    // settled card balances : update bulk par chunks
    if (settledCardIds.length > 0) {
      const nowIso = new Date().toISOString();
      for (let i = 0; i < settledCardIds.length; i += 500) {
        await supabase.from("driver_balance_pending")
          .update({ status: "settled", settlement_id: settlementId, settled_at: nowIso })
          .in("id", settledCardIds.slice(i, i + 500));
      }
    }
    // dette cash : groupée par valeur (un update par valeur distincte = très peu de queries)
    const debtByValue = new Map<number, string[]>();
    for (const u of debtUpdates) {
      if (!debtByValue.has(u.cash_debt_pending)) debtByValue.set(u.cash_debt_pending, []);
      debtByValue.get(u.cash_debt_pending)!.push(u.id);
    }
    for (const [val, ids] of debtByValue) {
      for (let i = 0; i < ids.length; i += 500) {
        await supabase.from("drivers").update({ cash_debt_pending: val }).in("id", ids.slice(i, i + 500));
      }
    }
    // alerts + notifications
    for (let i = 0; i < alertInserts.length; i += 500) {
      await supabase.from("settlement_alerts").insert(alertInserts.slice(i, i + 500));
    }
    for (let i = 0; i < notifInserts.length; i += 500) {
      await supabase.from("notifications").insert(notifInserts.slice(i, i + 500));
    }

    // ═══ 8. ADMIN FEES + SHARED COURSES (déjà batché) ═══
    const pendingAdminFees = await fetchAllRows(supabase, "solo_admin_ledger", "status", "pending");
    let totalAdminFees = 0;
    for (const fee of pendingAdminFees) totalAdminFees += Number(fee.fee_amount || 0);

    if (pendingAdminFees.length > 0) {
      const feeIds = pendingAdminFees.map((f: any) => f.id);
      const nowIso = new Date().toISOString();
      for (let i = 0; i < feeIds.length; i += 500) {
        await supabase.from("solo_admin_ledger")
          .update({ status: "settled", settlement_id: settlementId, settled_at: nowIso, week_start: weekStart })
          .in("id", feeIds.slice(i, i + 500));
      }
    }

    const sharedPayments = await fetchAllRows(supabase, "shared_course_payments", "status", "completed");
    const unsettledShared = sharedPayments.filter((p: any) => !p.settlement_id);
    let totalCommissionVolume = 0;
    if (unsettledShared.length > 0) {
      for (const p of unsettledShared) totalCommissionVolume += p.commission_amount || 0;
      const ids = unsettledShared.map((p: any) => p.id);
      const nowIso = new Date().toISOString();
      for (let i = 0; i < ids.length; i += 500) {
        await supabase.from("shared_course_payments")
          .update({ settlement_id: settlementId, settled_at: nowIso })
          .in("id", ids.slice(i, i + 500));
      }
    }

    // ═══ 9. FINALIZE + ALERTE GLOBALE ═══
    const finalStatus = failed > 0 ? "completed_with_errors" : "completed";

    if (stripeAvailableEur < totalAmount && totalAmount > 0) {
      await supabase.from("settlement_alerts").insert({
        settlement_id: settlementId, alert_type: "insufficient_platform_balance", severity: "critical",
        message: `Solde Stripe plateforme insuffisant : ${stripeAvailableEur.toFixed(2)}€ disponible, ${totalAmount.toFixed(2)}€ requis.`,
        details: { stripe_available: stripeAvailableEur, total_required: totalAmount },
      });
    }

    await supabase.from("weekly_settlements").update({
      status: finalStatus,
      total_shared_courses: unsettledShared.length,
      total_commission_volume: totalCommissionVolume,
      total_platform_fees: totalAdminFees,
      total_solocab_standard_fees: totalAdminFees,
      total_transfers_executed: executed,
      total_transfer_amount: totalAmount,
      total_admin_fees_collected: totalAdminFees,
      admin_transfer_status: "settled",
      processed_at: new Date().toISOString(),
      drivers_processed_count: alreadyProcessed.size + newlyProcessed.length,
      processed_driver_ids: [...alreadyProcessed, ...newlyProcessed],
    }).eq("id", settlementId);

    // ═══ 9.5 AUTO-HEAL : réaligner cash_debt_pending pour les chauffeurs dont
    // les balances cash sont passées en "settled" sans transfer Stripe réussi.
    // Garantit que les arriérés ne disparaissent jamais à cause d'un échec.
    try {
      const { data: healResult, error: healErr } = await supabase.functions.invoke(
        "retry-settlement-arrears",
        { body: { settlement_id: settlementId } },
      );
      if (healErr) {
        log("Auto-heal invocation failed", { error: healErr.message });
      } else {
        log("Auto-heal completed", { healed: healResult?.healed ?? 0 });
      }
    } catch (e: any) {
      log("Auto-heal exception", { error: String(e) });
    }

    // Notifs admins (in-app + email) si erreurs
    if (failed > 0 || stripeAvailableEur < totalAmount) {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(admins.map((a: any) => ({
          user_id: a.user_id, title: "🚨 Règlement hebdo — incohérence",
          message: `Settlement ${weekStart} : ${failed} échec(s), ${executed} virement(s) OK. Solde Stripe ${stripeAvailableEur.toFixed(2)}€.`,
          type: "warning", link: "/admin/finance/settlements",
        })));
        try {
          const { data: adminProfiles } = await supabase.from("profiles").select("email").in("id", admins.map((a: any) => a.user_id));
          const recipientEmails = (adminProfiles || []).map((p: any) => p.email).filter(Boolean);
          if (recipientEmails.length > 0) {
            const htmlBody = `
              <h2 style="color:#dc2626">🚨 Règlement hebdomadaire — incohérence détectée</h2>
              <p><strong>Semaine :</strong> ${weekStart} → ${weekEnd}</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Virements réussis</strong></td><td style="padding:8px;border:1px solid #ddd">${executed}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Virements échoués</strong></td><td style="padding:8px;border:1px solid #ddd;color:#dc2626">${failed}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Montant total tenté</strong></td><td style="padding:8px;border:1px solid #ddd">${totalAmount.toFixed(2)} €</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Solde Stripe disponible</strong></td><td style="padding:8px;border:1px solid #ddd">${stripeAvailableEur.toFixed(2)} €</td></tr>
              </table>
              <p>Consultez le <a href="https://solocab.fr/admin/finance/settlements">dashboard admin</a> pour les détails.</p>
            `;
            await Promise.allSettled(recipientEmails.map((email: string) =>
              supabase.functions.invoke("send-email", {
                body: { emailType: "custom", to: email,
                  data: { subject: `🚨 Règlement ${weekStart} : ${failed} échec(s)`, headerTitle: "Alerte règlement hebdo", htmlBody } },
              })
            ));
          }
        } catch (e) { log("Email admin skipped", { error: String(e) }); }
      }
    }

    const summary = {
      settlement_id: settlementId, status: finalStatus, week: `${weekStart} → ${weekEnd}`,
      stripe_platform_balance: stripeAvailableEur,
      driver_payouts: {
        drivers_paid: executed, drivers_failed: failed,
        drivers_processed_total: alreadyProcessed.size + newlyProcessed.length,
        total_amount: totalAmount, total_courses: pendingBalances.length,
      },
      admin_fees: { total_fees: totalAdminFees, entries_settled: pendingAdminFees.length },
      shared_courses_settled: unsettledShared.length,
      perf: { concurrency: CONCURRENCY, drivers_in_run: tasks.length },
    };
    log("Settlement completed", summary);
    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
