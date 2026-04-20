import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-SETTLEMENT] ${step}${d}`);
};

// ─── Helpers ────────────────────────────────────────────────────
function getLastWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  // Go back to the most recent Monday (if today is Mon, go back 7 days)
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

/** Fetch ALL rows matching a filter, paging through the 1000-row limit */
async function fetchAllRows(
  supabase: any, table: string, column: string, value: string
) {
  const rows: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(column, value)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { weekStart, weekEnd } = getLastWeekRange();
    log("Processing settlement", { weekStart, weekEnd });

    // ═══ IDEMPOTENCY: Check if already completed ═══
    const { data: existing } = await supabase
      .from("weekly_settlements")
      .select("id, status")
      .eq("week_start", weekStart)
      .eq("week_end", weekEnd)
      .single();

    if (existing?.status === 'completed') {
      return new Response(JSON.stringify({ message: "Already processed", settlement_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or resume settlement record
    let settlementId: string;
    if (existing?.id) {
      await supabase.from("weekly_settlements").update({ status: "processing" }).eq("id", existing.id);
      settlementId = existing.id;
    } else {
      const { data, error } = await supabase
        .from("weekly_settlements")
        .insert({ week_start: weekStart, week_end: weekEnd, status: "processing" })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create settlement: ${error.message}`);
      settlementId = data.id;
    }

    log("Settlement record", { id: settlementId });

    // ═══ PRE-FLIGHT: vérifier solde Stripe plateforme ═══
    let stripeAvailableEur = 0;
    try {
      const balance = await stripe.balance.retrieve();
      stripeAvailableEur = (balance.available.find((b: any) => b.currency === 'eur')?.amount || 0) / 100;
      log("Stripe platform balance", { available_eur: stripeAvailableEur });
    } catch (e: any) {
      log("Failed to retrieve Stripe balance", { error: e.message });
    }

    // ═══════════════════════════════════════════════════════════
    // 1. DRIVER PAYOUTS
    // ═══════════════════════════════════════════════════════════
    const pendingBalances = await fetchAllRows(supabase, "driver_balance_pending", "status", "pending");
    log("Pending driver balances found", { count: pendingBalances.length });


    // ═══ AGRÉGATION SÉPARÉE CASH vs CARD ═══
    // CASH = chauffeur a déjà l'argent → SoloCab DOIT collecter la commission (pas virer)
    // CARD = argent sur Stripe plateforme → SoloCab DOIT virer le net au chauffeur
    const driverTotals: Record<string, {
      // Card (à virer)
      card_gross: number; card_solocab_fees: number; card_stripe_fees: number;
      card_net: number; card_courses: number; card_balance_ids: string[];
      // Cash (commission due à SoloCab par le chauffeur)
      cash_gross: number; cash_fees_owed: number; cash_courses: number; cash_balance_ids: string[];
    }> = {};

    for (const bal of pendingBalances) {
      if (!driverTotals[bal.driver_id]) {
        driverTotals[bal.driver_id] = {
          card_gross: 0, card_solocab_fees: 0, card_stripe_fees: 0,
          card_net: 0, card_courses: 0, card_balance_ids: [],
          cash_gross: 0, cash_fees_owed: 0, cash_courses: 0, cash_balance_ids: [],
        };
      }
      const d = driverTotals[bal.driver_id];
      const isCash = bal.payment_type === 'cash';
      if (isCash) {
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

    let driverTransfersExecuted = 0;
    let driverTransfersFailed = 0;
    let totalDriverTransferAmount = 0;
    const driverBalanceInserts: any[] = [];

    // ═══ HELPER: créer une alerte settlement ═══
    async function createAlert(driverId: string | null, type: string, severity: string, message: string, details: any) {
      await supabase.from("settlement_alerts").insert({
        settlement_id: settlementId, driver_id: driverId,
        alert_type: type, severity, message, details,
      });
    }

    for (const [driverId, t] of Object.entries(driverTotals)) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("stripe_connect_account_id, stripe_connect_charges_enabled, user_id, cash_debt_pending, company_name")
        .eq("id", driverId)
        .single();

      // ═══ COMPENSATION CASH ═══
      // Nouvelle dette cash de la semaine = commissions sur courses cash
      // Dette existante (non recouvrée semaines précédentes) + nouvelle
      const previousCashDebt = Number(driver?.cash_debt_pending || 0);
      const newCashDebt = t.cash_fees_owed;
      const totalCashDebt = previousCashDebt + newCashDebt;

      // Net réel à virer = card_net - dette cash totale
      const realNet = t.card_net - totalCashDebt;
      const realNetCents = Math.round(realNet * 100);

      log("Driver settlement preview", {
        driverId, company: driver?.company_name,
        card_net: t.card_net, card_courses: t.card_courses,
        cash_courses: t.cash_courses, cash_collected: t.cash_gross,
        previous_cash_debt: previousCashDebt, new_cash_debt: newCashDebt,
        total_cash_debt: totalCashDebt, real_net_to_transfer: realNet,
      });

      // ── Marquer cash balances comme settled (déjà encaissées par chauffeur) ──
      // ne se traduit PAS par un virement
      if (t.cash_balance_ids.length > 0) {
        await supabase.from("driver_balance_pending")
          .update({ status: "settled", settlement_id: settlementId, settled_at: new Date().toISOString() })
          .in("id", t.cash_balance_ids);
      }

      // ── Driver sans Stripe → cash_debt accumule, card_balance reste pending ──
      if (!driver?.stripe_connect_account_id || !driver?.stripe_connect_charges_enabled) {
        log("Driver skipped - no Stripe", { driverId });
        if (newCashDebt > 0) {
          await supabase.from("drivers").update({ cash_debt_pending: totalCashDebt }).eq("id", driverId);
        }
        driverBalanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: t.card_gross, total_solocab_fees: t.card_solocab_fees + newCashDebt,
          net_amount: t.card_net, standard_courses_count: t.card_courses + t.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "skipped_no_stripe",
        });
        if (t.card_courses > 0) {
          await createAlert(driverId, "no_stripe_account", "warning",
            `Chauffeur ${driver?.company_name || driverId} a ${t.card_net.toFixed(2)}€ carte en attente mais Stripe Connect non configuré.`,
            { card_net: t.card_net, cash_debt: totalCashDebt });
        }
        continue;
      }

      // ── Net réel ≤ 0 → pas de virement, dette cash réduite mais subsistante ──
      if (realNetCents < 100) {
        log("Driver skipped - real net below minimum", { driverId, realNet });
        // Compensation : on retient ce qu'on peut sur le card, le reste reste en dette
        const compensated = Math.min(t.card_net, totalCashDebt);
        const remainingDebt = totalCashDebt - compensated;
        await supabase.from("drivers").update({ cash_debt_pending: remainingDebt }).eq("id", driverId);
        // Card balances marquées settled (compensées)
        if (t.card_balance_ids.length > 0) {
          await supabase.from("driver_balance_pending")
            .update({ status: "settled", settlement_id: settlementId, settled_at: new Date().toISOString() })
            .in("id", t.card_balance_ids);
        }
        driverBalanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: t.card_gross, total_solocab_fees: t.card_solocab_fees + compensated,
          net_amount: realNet, standard_courses_count: t.card_courses + t.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: realNet > 0 ? "below_minimum" : "compensated_cash",
        });
        if (remainingDebt > 1) {
          await createAlert(driverId, "cash_debt_remaining", "warning",
            `Dette cash de ${remainingDebt.toFixed(2)}€ subsiste pour ${driver?.company_name} (compensation partielle ${compensated.toFixed(2)}€).`,
            { previous_debt: previousCashDebt, new_debt: newCashDebt, compensated, remaining: remainingDebt });
        }
        continue;
      }

      // ── Execute Stripe Transfer with idempotency key ──
      const idempotencyKey = `settlement_${settlementId}_driver_${driverId}`;

      try {
        const transfer = await stripe.transfers.create({
          amount: realNetCents,
          currency: "eur",
          destination: driver.stripe_connect_account_id,
          description: `Règlement hebdo SoloCab ${weekStart} → ${weekEnd}`,
          metadata: {
            settlement_id: settlementId,
            driver_id: driverId,
            type: "weekly_driver_payout",
            card_courses: t.card_courses.toString(),
            cash_courses: t.cash_courses.toString(),
            cash_debt_compensated: totalCashDebt.toFixed(2),
          },
        }, { idempotencyKey });

        driverTransfersExecuted++;
        totalDriverTransferAmount += realNet;

        if (t.card_balance_ids.length > 0) {
          await supabase.from("driver_balance_pending")
            .update({ status: "settled", settlement_id: settlementId, settled_at: new Date().toISOString() })
            .in("id", t.card_balance_ids);
        }
        if (totalCashDebt > 0) {
          await supabase.from("drivers").update({ cash_debt_pending: 0 }).eq("id", driverId);
        }

        driverBalanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: t.card_gross,
          total_solocab_fees: t.card_solocab_fees + totalCashDebt,
          net_amount: realNet,
          standard_courses_count: t.card_courses + t.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "completed",
          stripe_transfer_id: transfer.id,
        });

        log("Driver transfer completed", { driverId, amount: realNet, transferId: transfer.id });

        if (driver.user_id) {
          const cashNote = totalCashDebt > 0 ? ` (après compensation ${totalCashDebt.toFixed(2)}€ commission cash)` : '';
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "💰 Virement hebdomadaire",
            message: `${realNet.toFixed(2)}€ versé sur votre compte (${t.card_courses} courses carte${cashNote})`,
            type: "info",
            link: "/driver-dashboard?tab=finances",
          });
        }
      } catch (err: any) {
        driverTransfersFailed++;
        log("Driver transfer FAILED — card balances stay pending", { driverId, error: err.message });

        await supabase.from("drivers").update({ cash_debt_pending: totalCashDebt }).eq("id", driverId);

        driverBalanceInserts.push({
          settlement_id: settlementId, driver_id: driverId,
          total_commissions_earned: t.card_gross, total_solocab_fees: t.card_solocab_fees,
          net_amount: realNet, standard_courses_count: t.card_courses + t.cash_courses,
          shared_courses_as_sender: 0, shared_courses_as_receiver: 0,
          transfer_status: "failed",
          transfer_error: err.message?.substring(0, 500),
        });

        await createAlert(driverId, "transfer_failed", "critical",
          `Échec virement ${realNet.toFixed(2)}€ pour ${driver?.company_name || driverId}: ${err.message?.substring(0, 200)}`,
          { real_net: realNet, card_net: t.card_net, cash_debt: totalCashDebt, error: err.message });

        if (driver.user_id) {
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "⚠️ Échec virement",
            message: `Le virement de ${realNet.toFixed(2)}€ a échoué. Nouvelle tentative lundi prochain.`,
            type: "warning",
            link: "/driver-dashboard?tab=finances",
          });
        }
      }
    }

    // Insert driver weekly balances
    if (driverBalanceInserts.length > 0) {
      await supabase.from("driver_weekly_balances").insert(driverBalanceInserts);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. ADMIN FEES: Mark settled (money already on platform)
    // ═══════════════════════════════════════════════════════════
    const pendingAdminFees = await fetchAllRows(supabase, "solo_admin_ledger", "status", "pending");

    let totalAdminFees = 0;
    for (const fee of pendingAdminFees) {
      totalAdminFees += Number(fee.fee_amount || 0);
    }

    log("Admin fees to settle", { count: pendingAdminFees.length, total: totalAdminFees });

    if (pendingAdminFees.length > 0) {
      // Batch update in chunks of 500 to avoid query limits
      const feeIds = pendingAdminFees.map((f: any) => f.id);
      for (let i = 0; i < feeIds.length; i += 500) {
        const chunk = feeIds.slice(i, i + 500);
        await supabase.from("solo_admin_ledger")
          .update({
            status: "settled",
            settlement_id: settlementId,
            settled_at: new Date().toISOString(),
            week_start: weekStart,
          })
          .in("id", chunk);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. SHARED COURSE PAYMENTS
    // ═══════════════════════════════════════════════════════════
    const { data: sharedPayments } = await supabase
      .from("shared_course_payments")
      .select("*")
      .eq("status", "completed")
      .is("settlement_id", null)
      .limit(1000);

    let totalCommissionVolume = 0;
    if (sharedPayments && sharedPayments.length > 0) {
      for (const payment of sharedPayments) {
        totalCommissionVolume += payment.commission_amount || 0;
      }
      const paymentIds = sharedPayments.map((p: any) => p.id);
      await supabase.from("shared_course_payments")
        .update({ settlement_id: settlementId, settled_at: new Date().toISOString() })
        .in("id", paymentIds);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. FINALIZE SETTLEMENT + ALERT GLOBALE
    // ═══════════════════════════════════════════════════════════
    const finalStatus = driverTransfersFailed > 0 ? "completed_with_errors" : "completed";

    if (stripeAvailableEur < totalDriverTransferAmount && totalDriverTransferAmount > 0) {
      await supabase.from("settlement_alerts").insert({
        settlement_id: settlementId, alert_type: "insufficient_platform_balance", severity: "critical",
        message: `Solde Stripe plateforme insuffisant : ${stripeAvailableEur.toFixed(2)}€ disponible, ${totalDriverTransferAmount.toFixed(2)}€ requis.`,
        details: { stripe_available: stripeAvailableEur, total_required: totalDriverTransferAmount },
      });
    }

    await supabase.from("weekly_settlements")
      .update({
        status: finalStatus,
        total_shared_courses: sharedPayments?.length || 0,
        total_commission_volume: totalCommissionVolume,
        total_platform_fees: totalAdminFees,
        total_solocab_standard_fees: totalAdminFees,
        total_transfers_executed: driverTransfersExecuted,
        total_transfer_amount: totalDriverTransferAmount,
        total_admin_fees_collected: totalAdminFees,
        admin_transfer_status: "settled",
        processed_at: new Date().toISOString(),
      })
      .eq("id", settlementId);

    // Notifier admins (in-app + email) si erreurs ou alertes critiques
    if (driverTransfersFailed > 0 || stripeAvailableEur < totalDriverTransferAmount) {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        const notifs = admins.map((a: any) => ({
          user_id: a.user_id,
          title: "🚨 Règlement hebdo — incohérence",
          message: `Settlement ${weekStart} : ${driverTransfersFailed} échec(s), ${driverTransfersExecuted} virement(s) OK. Solde Stripe ${stripeAvailableEur.toFixed(2)}€.`,
          type: "warning",
          link: "/admin/finance/settlements",
        }));
        await supabase.from("notifications").insert(notifs);

        try {
          const { data: adminProfiles } = await supabase.from("profiles").select("email").in("id", admins.map((a: any) => a.user_id));
          const recipientEmails = (adminProfiles || []).map((p: any) => p.email).filter(Boolean);
          if (recipientEmails.length > 0) {
            const htmlBody = `
              <h2 style="color:#dc2626">🚨 Règlement hebdomadaire — incohérence détectée</h2>
              <p><strong>Semaine :</strong> ${weekStart} → ${weekEnd}</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Virements réussis</strong></td><td style="padding:8px;border:1px solid #ddd">${driverTransfersExecuted}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Virements échoués</strong></td><td style="padding:8px;border:1px solid #ddd;color:#dc2626">${driverTransfersFailed}</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Montant total tenté</strong></td><td style="padding:8px;border:1px solid #ddd">${totalDriverTransferAmount.toFixed(2)} €</td></tr>
                <tr><td style="padding:8px;border:1px solid #ddd"><strong>Solde Stripe disponible</strong></td><td style="padding:8px;border:1px solid #ddd">${stripeAvailableEur.toFixed(2)} €</td></tr>
              </table>
              <p>Consultez le <a href="https://solocab.fr/admin/finance/settlements">dashboard admin</a> pour les détails et la liste des alertes.</p>
            `;
            for (const email of recipientEmails) {
              await supabase.functions.invoke("send-email", {
                body: {
                  emailType: "custom",
                  to: email,
                  data: {
                    subject: `🚨 Règlement ${weekStart} : ${driverTransfersFailed} échec(s)`,
                    headerTitle: "Alerte règlement hebdo",
                    htmlBody,
                  },
                },
              }).catch((e: any) => log("Email admin failed", { email, error: String(e) }));
            }
          }
        } catch (e) { log("Email admin skipped", { error: String(e) }); }
      }
    }

    const summary = {
      settlement_id: settlementId, status: finalStatus, week: `${weekStart} → ${weekEnd}`,
      stripe_platform_balance: stripeAvailableEur,
      driver_payouts: {
        drivers_paid: driverTransfersExecuted, drivers_failed: driverTransfersFailed,
        total_amount: totalDriverTransferAmount, total_courses: pendingBalances.length,
      },
      admin_fees: { total_fees: totalAdminFees, entries_settled: pendingAdminFees.length },
      shared_courses_settled: sharedPayments?.length || 0,
    };

    log("Settlement completed", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
