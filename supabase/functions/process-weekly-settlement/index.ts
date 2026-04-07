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

    // Calculate week range (previous Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() - dayOfWeek - 6);
    lastMonday.setUTCHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
    lastSunday.setUTCHours(23, 59, 59, 999);

    const weekStart = lastMonday.toISOString().split('T')[0];
    const weekEnd = lastSunday.toISOString().split('T')[0];

    log("Processing settlement", { weekStart, weekEnd });

    // Check if already processed
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

    // Create or update settlement record
    let settlement: { id: string };
    if (existing?.id) {
      await supabase.from("weekly_settlements").update({ status: "processing" }).eq("id", existing.id);
      settlement = { id: existing.id };
    } else {
      const { data, error } = await supabase
        .from("weekly_settlements")
        .insert({ week_start: weekStart, week_end: weekEnd, status: "processing" })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create settlement: ${error.message}`);
      settlement = data;
    }

    log("Settlement record", { id: settlement.id });

    // ═══════════════════════════════════════════════════════════
    // 1. DRIVER PAYOUTS: Aggregate pending balances per driver
    // ═══════════════════════════════════════════════════════════
    const { data: pendingBalances, error: pbErr } = await supabase
      .from("driver_balance_pending")
      .select("*")
      .eq("status", "pending");

    if (pbErr) throw new Error(`Failed to fetch pending balances: ${pbErr.message}`);

    log("Pending driver balances found", { count: pendingBalances?.length || 0 });

    // Aggregate per driver
    const driverTotals: Record<string, {
      gross: number;
      solocab_fees: number;
      stripe_fees: number;
      net: number;
      courses: number;
      balance_ids: string[];
    }> = {};

    for (const bal of (pendingBalances || [])) {
      if (!driverTotals[bal.driver_id]) {
        driverTotals[bal.driver_id] = { gross: 0, solocab_fees: 0, stripe_fees: 0, net: 0, courses: 0, balance_ids: [] };
      }
      const d = driverTotals[bal.driver_id];
      d.gross += Number(bal.gross_amount || 0);
      d.solocab_fees += Number(bal.solocab_fee || 0);
      d.stripe_fees += Number(bal.stripe_fee || 0);
      d.net += Number(bal.net_amount || 0);
      d.courses++;
      d.balance_ids.push(bal.id);
    }

    // Execute transfers to each driver
    let driverTransfersExecuted = 0;
    let totalDriverTransferAmount = 0;
    const driverBalanceInserts = [];

    for (const [driverId, totals] of Object.entries(driverTotals)) {
      // Get driver Stripe info
      const { data: driver } = await supabase
        .from("drivers")
        .select("stripe_connect_account_id, stripe_connect_charges_enabled, user_id")
        .eq("id", driverId)
        .single();

      const netCents = Math.round(totals.net * 100);

      // Record in driver_weekly_balances
      driverBalanceInserts.push({
        settlement_id: settlement.id,
        driver_id: driverId,
        total_commissions_earned: totals.gross,
        total_solocab_fees: totals.solocab_fees,
        net_amount: totals.net,
        standard_courses_count: totals.courses,
        shared_courses_as_sender: 0,
        shared_courses_as_receiver: 0,
        transfer_status: "pending",
      });

      if (!driver?.stripe_connect_account_id || !driver?.stripe_connect_charges_enabled) {
        log("Driver skipped - no Stripe", { driverId });
        // Mark balances as settled anyway (fee still recorded)
        if (totals.balance_ids.length > 0) {
          await supabase.from("driver_balance_pending")
            .update({ status: "settled", settlement_id: settlement.id, settled_at: new Date().toISOString() })
            .in("id", totals.balance_ids);
        }
        continue;
      }

      if (netCents < 100) {
        log("Driver skipped - amount below minimum (1€)", { driverId, netCents });
        if (totals.balance_ids.length > 0) {
          await supabase.from("driver_balance_pending")
            .update({ status: "settled", settlement_id: settlement.id, settled_at: new Date().toISOString() })
            .in("id", totals.balance_ids);
        }
        continue;
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: netCents,
          currency: "eur",
          destination: driver.stripe_connect_account_id,
          description: `Règlement hebdo SoloCab ${weekStart} → ${weekEnd}`,
          metadata: {
            settlement_id: settlement.id,
            driver_id: driverId,
            type: "weekly_driver_payout",
            courses_count: totals.courses.toString(),
          },
        });

        driverTransfersExecuted++;
        totalDriverTransferAmount += totals.net;

        // Mark balances as settled
        await supabase.from("driver_balance_pending")
          .update({ status: "settled", settlement_id: settlement.id, settled_at: new Date().toISOString() })
          .in("id", totals.balance_ids);

        log("Driver transfer completed", { driverId, amount: totals.net, transferId: transfer.id });

        // Notify driver
        if (driver.user_id) {
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "💰 Virement hebdomadaire",
            message: `${totals.net.toFixed(2)}€ versé sur votre compte (${totals.courses} courses)`,
            type: "info",
            link: "/driver-dashboard?tab=finances",
          });
        }
      } catch (err: any) {
        log("Driver transfer failed", { driverId, error: err.message });
        // Mark as settled to avoid re-processing but keep a record
        await supabase.from("driver_balance_pending")
          .update({ status: "settled", settlement_id: settlement.id, settled_at: new Date().toISOString() })
          .in("id", totals.balance_ids);
      }
    }

    // Insert driver weekly balances
    if (driverBalanceInserts.length > 0) {
      await supabase.from("driver_weekly_balances").insert(driverBalanceInserts);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. ADMIN FEES: Mark all pending admin fees as settled
    // ═══════════════════════════════════════════════════════════
    const { data: pendingAdminFees, error: afErr } = await supabase
      .from("solo_admin_ledger")
      .select("id, fee_amount")
      .eq("status", "pending");

    if (afErr) throw new Error(`Failed to fetch admin fees: ${afErr.message}`);

    let totalAdminFees = 0;
    for (const fee of (pendingAdminFees || [])) {
      totalAdminFees += Number(fee.fee_amount || 0);
    }

    log("Admin fees to settle", { count: pendingAdminFees?.length || 0, total: totalAdminFees });

    // Mark admin fees as settled (money is already on platform account)
    if (pendingAdminFees && pendingAdminFees.length > 0) {
      const feeIds = pendingAdminFees.map(f => f.id);
      await supabase.from("solo_admin_ledger")
        .update({
          status: "settled",
          settlement_id: settlement.id,
          settled_at: new Date().toISOString(),
          week_start: weekStart,
        })
        .in("id", feeIds);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. SHARED COURSE PAYMENTS: Handle partnership settlements
    // ═══════════════════════════════════════════════════════════
    const { data: sharedPayments } = await supabase
      .from("shared_course_payments")
      .select("*")
      .eq("status", "completed")
      .is("settlement_id", null);

    let totalCommissionVolume = 0;
    if (sharedPayments && sharedPayments.length > 0) {
      for (const payment of sharedPayments) {
        totalCommissionVolume += payment.commission_amount || 0;
      }
      const paymentIds = sharedPayments.map(p => p.id);
      await supabase.from("shared_course_payments")
        .update({ settlement_id: settlement.id, settled_at: new Date().toISOString() })
        .in("id", paymentIds);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. FINALIZE SETTLEMENT
    // ═══════════════════════════════════════════════════════════
    await supabase.from("weekly_settlements")
      .update({
        status: "completed",
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
      .eq("id", settlement.id);

    const summary = {
      settlement_id: settlement.id,
      week: `${weekStart} → ${weekEnd}`,
      driver_payouts: {
        drivers_paid: driverTransfersExecuted,
        total_amount: totalDriverTransferAmount,
        total_courses: pendingBalances?.length || 0,
      },
      admin_fees: {
        total_fees: totalAdminFees,
        entries_settled: pendingAdminFees?.length || 0,
      },
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
